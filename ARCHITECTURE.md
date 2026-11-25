# Architecture Overview

This document explains the architectural design, module boundaries, authentication lifecycle, security decisions, and testing strategy of the Full-Stack Authentication application.

---

## 1. Monorepo Design: Turborepo & pnpm Workspaces

The repository is structured as a **Turborepo** monorepo managed by **pnpm workspaces**:

- `apps/api`: NestJS backend REST API (`@repo/api`)
- `apps/web`: React + Vite single-page application (`@repo/web`)
- `packages/typescript-config`: Shared TypeScript compiler configurations (`base.json`, `nestjs.json`, `react.json`)
- `packages/eslint-config`: Shared ESLint 9 flat configurations (`base.mjs`, `nestjs.mjs`, `react.mjs`)

### Why this structure?
1. **Strict Frontend/Backend Separation:** `apps/web` and `apps/api` remain independent deployable units with zero runtime coupling, communicating exclusively over HTTP JSON APIs (`withCredentials: true`).
2. **Consistent Tooling Without Bloated Shared Packages:** Only TypeScript and ESLint configs are shared across workspaces. No artificial UI or DTO packages were created, avoiding unnecessary build orchestration overhead.
3. **Deterministic Dependency Resolution:** `pnpm` enforces strict package isolation and a single lockfile (`pnpm-lock.yaml`), while Turborepo orchestrates `lint`, `type-check`, `test`, and `build` tasks across packages in parallel.

---

## 2. Backend Architecture (`apps/api` — NestJS Modular Monolith)

The backend is designed as a **Modular Monolith** with thin controllers and encapsulated service logic:

```text
apps/api/src/
├── config/          # Startup environment variable validation (validateEnvironment)
├── common/          # Global exception filter, CSRF Origin guard, Throttler guard
├── users/           # Mongoose User schema & UsersService (DB access boundary)
├── auth/            # AuthController, AuthService, JwtStrategy, JwtAuthGuard, DTOs
├── application/     # Protected ApplicationController & ApplicationService (/api/application)
├── health/          # HealthController (/api/health) checking Mongoose readyState
├── app.setup.ts     # Shared bootstrap setup (prefix, cookies, Helmet, CORS, pipes, Swagger)
├── app.module.ts    # Root module wiring Config, Pino Logger, Mongoose, Throttler, and modules
└── main.ts          # HTTP entrypoint
```

### Module Boundaries & Responsibilities
- **`UsersModule` (`src/users`)**: Owns the Mongoose `User` model. All database queries (`findByEmail`, `findById`, `create`), email normalization (`trim().toLowerCase()`), duplicate-key (`11000`) translation, and safe user projection (`toSafeUser`) live inside `UsersService`.
- **`AuthModule` (`src/auth`)**: Owns credential verification, Argon2id password hashing, JWT generation, and `HttpOnly` cookie management. `AuthController` handles HTTP request/response concerns (setting and clearing the `access_token` cookie), while `AuthService` performs business logic and returns `{ user, accessToken }`.
- **`ApplicationModule` (`src/application`)**: Implements the protected `GET /api/application` endpoint guarded by `JwtAuthGuard`, returning `{ "message": "Welcome to the application." }`.
- **`CommonModule` (`src/common`)**: Registers global cross-cutting providers via NestJS DI tokens:
  - `APP_FILTER` -> `AllExceptionsFilter`
  - `APP_GUARD` -> `CsrfOriginGuard`
  - `APP_GUARD` -> `ThrottlerGuard`
- **`HealthModule` (`src/health`)**: Exposes `GET /api/health` verifying active MongoDB connectivity.

---

## 3. MongoDB Data Model

The `User` collection (`src/users/schemas/user.schema.ts`) uses Mongoose with strict schema constraints:

| Field | Type | Constraints |
|---|---|---|
| `_id` | `ObjectId` | Auto-generated primary key (mapped to `id` in DTOs) |
| `name` | `string` | `required: true`, `trim: true`, `minlength: 3`, `maxlength: 100` |
| `email` | `string` | `required: true`, `unique: true`, `lowercase: true`, `trim: true` |
| `passwordHash` | `string` | `required: true` (Argon2id hash; stripped in `toJSON`, `toObject`, and `toSafeUser`) |
| `createdAt` | `Date` | Managed automatically via `timestamps: true` |
| `updatedAt` | `Date` | Managed automatically via `timestamps: true` |

Uniqueness on `email` is enforced both by an application check (`findByEmail`) and a **unique MongoDB index** (`unique: true`). Race-condition duplicate inserts throwing MongoDB error code `11000` are caught in both `UsersService` and `AllExceptionsFilter` and converted into a `409 Conflict` response without leaking database internals.

---

## 4. Frontend Architecture (`apps/web` — Feature-Based React SPA)

The frontend is a **React 18 + Vite + TypeScript** Single Page Application using React Router v6:

```text
apps/web/src/
├── app/
│   ├── providers/AuthProvider.tsx    # React Context holding user, isLoading, and auth actions
│   ├── router/
│   │   ├── ProtectedRoute.tsx        # Guards /app; waits for initial /api/auth/me check
│   │   ├── PublicOnlyRoute.tsx       # Redirects authenticated users from /signin & /signup to /app
│   │   └── AppRouter.tsx             # Route definitions
│   └── App.tsx
├── features/auth/
│   ├── components/                   # SignUpForm, SignInForm, SignUpPage, SignInPage, ApplicationPage
│   ├── hooks/useAuth.ts              # Typed hook consuming AuthContext
│   ├── schemas/auth.schemas.ts       # Zod validation schemas & live password rule evaluator
│   ├── services/auth.service.ts      # Typed API methods using centralized Axios instance
│   └── types/auth.types.ts
├── components/                       # Reusable UI primitives (FormField, AuthLayout, LoadingSpinner)
└── lib/                              # apiClient (Axios withCredentials: true) & extractApiErrorMessage
```

### Key Frontend Flows
1. **Application Initialization (`AuthProvider`):**
   - Starts with `isLoading = true` and `user = null`.
   - Immediately calls `GET /api/auth/me` with `withCredentials: true`.
   - If the backend confirms the cookie session, `user` is populated; otherwise `user` is set to `null`.
   - `isLoading` transitions to `false` only after the backend responds.
2. **Protected Route Behavior (`ProtectedRoute` & `ApplicationPage`):**
   - While `isLoading` is `true`, `ProtectedRoute` renders `<LoadingSpinner />` — never flashing protected content or redirecting prematurely.
   - If unauthenticated (`!user`), `ProtectedRoute` redirects to `/signin`.
   - Once on `/app`, `ApplicationPage` also calls `GET /api/application` to verify backend authorization on the protected resource and renders the exact required message: `Welcome to the application.`

---

## 5. Authentication & Security Decisions

### 1. Password Hashing (Argon2id)
- Passwords are hashed using **Argon2id** (`type: argon2.argon2id`, `memoryCost: 19456`, `timeCost: 2`, `parallelism: 1`).
- During sign-in, if an email does not exist in MongoDB, `AuthService.signin` executes a dummy Argon2id verification against a precomputed hash before throwing `UnauthorizedException('Invalid email or password.')`, mitigating user-enumeration timing side-channels.

### 2. Cookie-Based JWT Storage
- Access tokens are signed with `JWT_SECRET` (`15m` default TTL) and stored exclusively in an `HttpOnly` cookie named `access_token`:
  - `httpOnly: true` (inaccessible to `document.cookie`, preventing XSS token theft)
  - `secure: true` in production, `false` in local HTTP development
  - `sameSite: 'lax'`
  - `path: '/'`
  - `maxAge`: synchronized with `JWT_EXPIRES_IN`
- The JWT is **never** included in JSON response bodies or stored in `localStorage` / `sessionStorage`.
- `JwtStrategy` extracts the token solely from `req.cookies.access_token` and queries `UsersService.findById(payload.sub)` on every authenticated request to verify the user still exists.

### 3. CORS & CSRF Defense-in-Depth
- **CORS:** Configured with explicit origin(s) from `WEB_ORIGIN` and `credentials: true` (never `origin: '*'`).
- **CSRF Protection (`CsrfOriginGuard`):** Because browser cookies are sent automatically, CORS alone is insufficient against cross-site form submissions. `CsrfOriginGuard` inspects all state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) and verifies that the `Origin` header (or `Referer` origin fallback) matches `WEB_ORIGIN`, returning `403 Forbidden` on any mismatch.
- **`SameSite=Lax` Deployment Model:** Assumes frontend and backend share the same site (eTLD+1) in production (e.g., `app.example.com` and `api.example.com`, or unified under a reverse proxy).

### 4. Request Validation, Rate Limiting & Log Redaction
- **Validation:** Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, and `transform: true` rejects malformed inputs and unexpected fields with `400 Bad Request`.
- **Rate Limiting:** Global `ThrottlerGuard` (`@nestjs/throttler`) protects endpoints against credential stuffing and brute-force attacks (`429 Too Many Requests`).
- **Structured Logging & Redaction:** `nestjs-pino` logs request method, URL, status, and duration while redacting `req.headers.cookie`, `req.headers.authorization`, `res.headers["set-cookie"]`, `req.body.password`, `*.passwordHash`, and `*.token`.

---

## 6. Testing Strategy

1. **Backend Unit Tests (`src/**/*.spec.ts` — Jest):**
   - Verify Argon2id password hashing and verification, email normalization, duplicate email conflict handling, timing-safe sign-in error messages, and `passwordHash` stripping.
2. **Backend API Integration Tests (`test/auth.e2e-spec.ts` — Supertest + MongoDB):**
   - Execute full HTTP requests against the NestJS pipeline and a dedicated test database (`auth_test_integration`), covering all 12+ required scenarios plus CSRF `Origin` blocking (`403`), rate limiting (`429`), non-whitelisted field rejection (`400`), Swagger availability, and health check.
3. **Frontend Component & Integration Tests (`tests/auth.test.tsx` — Vitest + React Testing Library):**
   - Verify signup and signin form validation, loading indicators, duplicate submission prevention, API error banners, protected route redirection, and session initialization.
4. **End-to-End Browser Tests (`e2e/auth.spec.ts` — Playwright):**
   - Run a real Chromium browser against the live React/Vite frontend (`:5173`) and NestJS API (`:4000`) backed by MongoDB, verifying registration, `/app` arrival, exact welcome text, session persistence across page reload, logout, and post-logout access denial.

---

## 7. Trade-offs & Future Improvements

- **Stateless Short-Lived Access Token vs. Refresh Token Rotation:** A single short-lived (`15m`) `HttpOnly` JWT cookie keeps the architecture simple and avoids extra session collections while still validating user existence in MongoDB. If expanded for long-lived sessions, an opaque refresh token with rotation and revocation tracking in MongoDB/Redis could be added.
- **Email Verification & Password Reset:** Out of scope for this task; would be the next natural addition for a production identity service.
- **Account Lockout / Per-Account Throttling:** Rate limiting is currently IP-based via `@nestjs/throttler`; in a multi-node production environment, backing the throttler with Redis and tracking per-email failed attempt counters would strengthen brute-force resilience.

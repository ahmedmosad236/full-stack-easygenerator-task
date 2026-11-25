# AI-Assisted Engineering Workflow (`AI.md`)

This document outlines how I used AI assistance as a force multiplier to build, verify, and harden this Full-Stack Authentication application, including the prompts that worked best, concrete issues I caught and fixed during testing, and architectural decisions where I diverged from standard AI suggestions.

---

## 1. Which Parts of the Code Were AI-Assisted

I used AI across the development lifecycle with an iterative **scaffold -> inspect -> test -> refine** workflow:

1. **Monorepo & Tooling Setup:**
   - Scaffolding the Turborepo + `pnpm` workspace configuration (`pnpm-workspace.yaml`, `turbo.json`) and shared packages (`@repo/typescript-config`, `@repo/eslint-config`).
2. **Backend (`apps/api` — NestJS + MongoDB):**
   - Generating DTO validation classes (`SignUpDto`, `SignInDto`) with `class-validator` and `class-transformer`.
   - Implementing `AuthService` (Argon2id hashing and JWT issuance), `JwtStrategy` (cookie extraction and active user verification), `UsersService` (Mongoose persistence and duplicate-key handling), `AllExceptionsFilter`, `CsrfOriginGuard`, and Swagger annotations.
3. **Frontend (`apps/web` — React + Vite + TypeScript):**
   - Building the Zod validation schemas (`signUpSchema`, `signInSchema`), `AuthProvider` context, `ProtectedRoute` / `PublicOnlyRoute` guards, and accessible form components (`SignUpForm`, `SignInForm`, `ApplicationPage`) with React Hook Form.
4. **Testing & CI/CD:**
   - Drafting Jest unit tests, Supertest integration tests against MongoDB, Vitest + React Testing Library component tests, a Playwright end-to-end user journey test, and the GitHub Actions CI workflow (`.github/workflows/ci.yml`).

---

## 2. Prompts & Approaches That Were Effective

Instead of prompting for an entire application in one shot, breaking the work into constrained, specification-driven prompts produced much cleaner results:

### Effective Prompt 1 — Dual-Layer Validation & Normalization Parity
> *"Implement `SignUpDto` in NestJS using `class-validator` and `class-transformer` and a matching `signUpSchema` in Zod for React Hook Form. Both must trim `name` (min 3 chars), trim and lowercase `email` (valid email format), and require `password` to be at least 8 characters with at least one letter, one number, and one special character. Ensure `@Transform` runs before validation decorators on the backend."*

**Why it worked:** Explicitly specifying transform-before-validate prevented a common bug where `"  ab  "` passes `@MinLength(3)` before being trimmed to 2 characters.

### Effective Prompt 2 — Shared NestJS Bootstrap for Production & Supertest Parity
> *"Extract global NestJS middleware, `cookieParser()`, `helmet()`, CORS, global `ValidationPipe` (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`), global prefix `/api`, and Swagger setup (`/api/docs`) into a `configureApp(app: INestApplication)` function in `src/app.setup.ts` so `main.ts` and Supertest E2E tests run the exact same HTTP pipeline."*

**Why it worked:** Prevented drift between the production server and integration tests (a frequent cause of false-positive tests where `cookie-parser` or `forbidNonWhitelisted` is missing in `Test.createTestingModule`).

### Effective Prompt 3 — Cookie-Based Session Restoration Without Route Flicker
> *"Implement `AuthProvider` and `ProtectedRoute` in React Router v6 where `GET /api/auth/me` is called on mount with `withCredentials: true`. Keep `isLoading = true` until the backend responds so visiting `/app` or refreshing the page shows a loading state and never flashes protected content or redirects prematurely."*

---

## 3. What I Had to Correct or Rework in Generated Output

Running the compiler, linter, and test suites uncovered several concrete issues in the initial generated code that required manual review and correction:

### A. Mongoose Duplicate Schema Index Warning on `User.email`
- **What happened:** The initial Mongoose `User` schema in `apps/api/src/users/schemas/user.schema.ts` declared `unique: true, index: true` inside `@Prop(...)` AND also called `UserSchema.index({ email: 1 }, { unique: true })` at the bottom of the file. When running `pnpm --filter @repo/api test`, Mongoose printed:
  `[MONGOOSE] Warning: Duplicate schema index on {"email":1} found.`
- **How I fixed it:** Removed `index: true` and the redundant `UserSchema.index({ email: 1 }, { unique: true })` call, keeping `unique: true` on `@Prop(...)` as the single source of truth. Re-running Jest confirmed zero warnings.

### B. Vite 6 vs. Vitest 2 TypeScript `PluginOption` Conflict
- **What happened:** `apps/web/package.json` initially paired `vite: "^6.0.6"` with `vitest: "^2.1.8"`. Because Vitest 2 pulls `vite@^5.4.x` for its internal config types, running `pnpm run type-check` failed in `apps/web/vite.config.ts` with incompatible `PluginOption` types between Vite 5 and Vite 6, plus an unused `import React from 'react'` in `apps/web/tests/auth.test.tsx`.
- **How I fixed it:** Aligned `vite` to `"^5.4.11"` in `apps/web/package.json` so Vite and Vitest resolve to a single shared `vite@5.4.21` instance, and removed the unused import.

### C. TypeScript 6.0 `baseUrl` and `moduleResolution: "Node"` Deprecations
- **What happened:** The editor's TypeScript 6.0 language server flagged `"baseUrl"` in `apps/api/tsconfig.json` and `apps/web/tsconfig.json` (`Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0`).
- **How I fixed it:** Since all imports across both apps use explicit relative paths, I removed `"baseUrl"` from both `tsconfig.json` files and removed the legacy `"moduleResolution": "Node"` (`node10`) option from `packages/typescript-config/nestjs.json`.

### D. Hardcoded `@Throttle` Override vs. Environment-Driven Rate Limits
- **What happened:** The initial `AuthController` had `@Throttle({ default: { limit: 10, ttl: 60000 } })` decorators on `signup` and `signin`. This hardcoded limit ignored the `THROTTLE_LIMIT` environment variable and risked causing false `429 Too Many Requests` failures when running 15+ integration and E2E signup tests back-to-back.
- **How I fixed it:** Removed the hardcoded decorator override so the global `ThrottlerGuard` uses the configurable `THROTTLE_LIMIT` and `THROTTLE_TTL` values from `ThrottlerModule.forRootAsync`.

### E. `@nestjs/config` Import-Time Evaluation in Rate-Limit Integration Tests
- **What happened:** In `apps/api/test/auth.e2e-spec.ts`, I wrote a test to verify that exceeding `THROTTLE_LIMIT=2` returns `429 Too Many Requests`. Initially, setting `process.env.THROTTLE_LIMIT = '2'` inside the test still returned `200 OK` because `ConfigModule.forRoot()` had already parsed `apps/api/.env` (`THROTTLE_LIMIT=30`) when `AppModule` was imported at the top of the test file.
- **How I fixed it:** Updated `ThrottlerModule.forRootAsync` and `MongooseModule.forRootAsync` in `apps/api/src/app.module.ts` to check runtime `process.env` overrides (`process.env.THROTTLE_LIMIT`, `process.env.MONGODB_URI_TEST`) inside `useFactory` before falling back to `ConfigService`.

---

## 4. Architectural Decisions Made Differently Than Typical AI Suggestions

1. **`HttpOnly` Cookie JWTs Instead of `localStorage` Bearer Tokens:**
   - Default AI completions often return `{ accessToken }` in the JSON body and store it in `localStorage`, which exposes tokens to XSS. I enforced storing the JWT exclusively in an `HttpOnly`, `SameSite=Lax`, `Path=/` cookie (`Secure` in production) and verified in Supertest tests that neither `accessToken` nor `passwordHash` ever appears in response bodies.
2. **Active User Verification in `JwtStrategy.validate`:**
   - Instead of trusting the decoded JWT payload alone (`return { id: payload.sub, email: payload.email }`), `JwtStrategy.validate` queries `UsersService.findById(payload.sub)` to ensure deleted or invalid accounts are rejected immediately with `401 Unauthorized`.
3. **Timing Side-Channel Mitigation on Sign-In:**
   - When `findByEmail` returns `null` in `AuthService.signin`, instead of returning immediately (which is measurably faster than Argon2id verification), the service runs a dummy Argon2id verification against a precomputed hash before throwing the uniform `Invalid email or password.` exception.
4. **Explicit `CsrfOriginGuard` on Mutation Requests:**
   - Because cookies are attached automatically by browsers, I added `CsrfOriginGuard` to validate the `Origin` (and `Referer` fallback) header against `WEB_ORIGIN` on all `POST`/`PUT`/`PATCH`/`DELETE` requests (`403 Forbidden` on mismatch) rather than relying on CORS alone.

---

## 5. Verification Summary

All checks were executed locally against the running code and MongoDB (`v7.0.37`):

- `pnpm run lint` — **PASSED** (`@repo/api` and `@repo/web` ESLint 9 checks)
- `pnpm run type-check` — **PASSED** (`tsc --noEmit` across monorepo)
- `pnpm run build` — **PASSED** (`nest build` and `vite build`)
- `pnpm --filter @repo/api test` — **PASSED** (3 test suites, 26 unit & Supertest integration tests)
- `pnpm --filter @repo/web test` — **PASSED** (9 Vitest + React Testing Library tests)
- `pnpm run test:e2e` — **PASSED** (Playwright 9-step end-to-end browser journey in headless Chrome)

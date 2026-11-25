# Full-Stack Authentication Application

A clean, secure, production-minded full-stack authentication monorepo built with **React + Vite + TypeScript** on the frontend and **NestJS + MongoDB + Mongoose** on the backend, managed with **Turborepo** and **pnpm workspaces**.

---

## Quick Start (Fastest Way to Run)

If you have **Node.js (>= 20)**, **pnpm (>= 9)**, and **Docker** installed, you can get the entire stack running in 4 commands:

```bash
# 1. Install dependencies
pnpm install

# 2. Create environment files from examples
cp apps/api/.env.example apps/api/.env && cp apps/web/.env.example apps/web/.env

# 3. Start MongoDB via Docker (see Section 6 if port 27017 is already in use or if you prefer local MongoDB)
docker compose up -d

# 4. Run both Backend (port 4000) and Frontend (port 5173)
pnpm run dev
```

> **Note:** Make sure `JWT_SECRET` in `apps/api/.env` is at least 16 characters long (update the placeholder if needed) and `MONGODB_URI` matches your active MongoDB port.

---

## 1. Project Overview

This application implements an end-to-end user registration, sign-in, session verification, protected application workspace, and logout flow using **Argon2id** password hashing and **short-lived JWTs stored in `HttpOnly` cookies**.

Key engineering highlights:
- **Zero client-side token exposure:** Access tokens are never returned in JSON response bodies or stored in `localStorage` / `sessionStorage`.
- **Dual-layer validation:** Identical validation rules enforced on the client via **Zod + React Hook Form** and on the server via **NestJS `ValidationPipe` + `class-validator`**.
- **Defense-in-depth security:** `HttpOnly` + `SameSite=Lax` cookies, strict CORS with credentials, `Origin` / `Referer` header validation on state-changing requests (`CsrfOriginGuard`), Helmet security headers, configurable rate limiting (`@nestjs/throttler`), and structured Pino logging with automatic secret/cookie redaction.

---

## 2. Technology Stack

### Monorepo & Tooling
- **Turborepo** (`turbo`)
- **pnpm Workspaces**
- Shared **TypeScript** (`@repo/typescript-config`) and **ESLint 9** (`@repo/eslint-config`) configurations
- **GitHub Actions** CI pipeline

### Frontend (`apps/web`)
- **React 18** + **Vite 5** + **TypeScript** (Single Page Application)
- **React Router DOM v6** for client-side routing (`ProtectedRoute`, `PublicOnlyRoute`)
- **React Hook Form** + **Zod** (`@hookform/resolvers`)
- **Axios** (`withCredentials: true`)
- **React Context** (`AuthProvider`) for centralized authentication state
- **Vitest** + **React Testing Library** for unit/component tests
- **Playwright** for full-stack End-to-End testing

### Backend (`apps/api`)
- **NestJS 10** + **TypeScript** (Modular Monolith)
- **MongoDB 7** + **Mongoose 8**
- **Passport** + `passport-jwt` + `@nestjs/jwt` (cookie-extracted JWT strategy)
- **Argon2** (`argon2id`) for password hashing
- **`@nestjs/config`** with startup environment variable validation
- **`class-validator`** & **`class-transformer`**
- **`@nestjs/throttler`** for rate limiting
- **`@nestjs/swagger`** for OpenAPI documentation (`/api/docs`)
- **`helmet`** for HTTP security headers
- **`nestjs-pino`** / **Pino** for structured JSON logging with sensitive-field redaction

---

## 3. Prerequisites

- **Node.js** `>= 20.0.0` (tested with Node v22 and v24)
- **pnpm** `>= 9.0.0`
- **MongoDB** `>= 6.0` (either via **Docker Compose** using the included `docker-compose.yml` or a local `mongod` service on port `27017`)

---

## 4. Project Structure

```text
.
├── apps/
│   ├── api/                           # NestJS Backend API (port 4000)
│   │   ├── src/
│   │   │   ├── auth/                  # Signup, signin, logout, /me, JWT strategy & guard
│   │   │   ├── users/                 # Mongoose User schema & UsersService
│   │   │   ├── application/           # Protected /api/application endpoint
│   │   │   ├── common/                # AllExceptionsFilter, CsrfOriginGuard, ThrottlerGuard
│   │   │   ├── config/                # Startup environment validation
│   │   │   ├── health/                # /api/health endpoint
│   │   │   ├── app.setup.ts           # Shared middleware, CORS, pipes & Swagger setup
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   └── test/                      # Supertest API integration tests
│   │
│   └── web/                           # React + Vite SPA Frontend (port 5173)
│       ├── src/
│       │   ├── app/
│       │   │   ├── providers/         # AuthProvider (React Context)
│       │   │   ├── router/            # AppRouter, ProtectedRoute, PublicOnlyRoute
│       │   │   └── App.tsx
│       │   ├── features/
│       │   │   └── auth/              # Forms, pages, hooks, Zod schemas, authService, types
│       │   ├── components/            # Reusable UI components (FormField, AuthLayout, etc.)
│       │   ├── lib/                   # Centralized Axios client & error parser
│       │   └── styles/                # Responsive CSS styles
│       ├── tests/                     # Vitest + React Testing Library tests
│       └── e2e/                       # Playwright end-to-end user journey tests
│
├── packages/
│   ├── typescript-config/             # Shared tsconfig presets (base, nestjs, react)
│   └── eslint-config/                 # Shared ESLint flat configs (base, nestjs, react)
│
├── .github/workflows/ci.yml           # GitHub Actions CI workflow
├── docker-compose.yml                 # Local MongoDB container definition
├── pnpm-workspace.yaml
├── turbo.json
├── README.md
├── ARCHITECTURE.md
└── AI.md
```

---

## 5. Installation & Environment Setup

### Step 1: Install dependencies

```bash
pnpm install
```

### Step 2: Configure environment variables

Copy the example environment files for the backend and frontend:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

#### Backend Environment Variables (`apps/api/.env`)

| Variable | Description | Default / Example |
|---|---|---|
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `development` |
| `PORT` | HTTP port for the NestJS server | `4000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/auth_test` |
| `JWT_SECRET` | Secret key used to sign JWTs (minimum 16 characters) | `replace_with_a_long_random_secret_at_least_32_characters` |
| `JWT_EXPIRES_IN` | Access token expiration window | `15m` |
| `WEB_ORIGIN` | Allowed frontend origin(s) for CORS and CSRF `Origin` checks | `http://localhost:5173` |
| `THROTTLE_TTL` | Rate-limiting window in milliseconds | `60000` |
| `THROTTLE_LIMIT` | Maximum requests per IP within `THROTTLE_TTL` | `20` |

> **Startup Validation:** The backend validates all required environment variables during startup (`src/config/env.validation.ts`). Missing or insecure values (such as a short `JWT_SECRET` or missing `MONGODB_URI`) will immediately fail fast with a clear error message.

#### Frontend Environment Variables (`apps/web/.env`)

| Variable | Description | Default / Example |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL for the NestJS backend API | `http://localhost:4000/api` |

---

## 6. Starting MongoDB

The backend requires a running MongoDB instance before starting. Choose **one** of the following options:

### Option A: Using Docker Compose (Recommended)

```bash
docker compose up -d
```

Verify the container is running and healthy:

```bash
docker compose ps
```

#### Troubleshooting Port `27017` Conflicts
If you already have a local MongoDB service running on port `27017`, `docker compose up -d` may fail with a `port is already allocated` error. You can either:
1. **Use your existing local MongoDB** (skip Docker Compose completely; see Option B), **OR**
2. **Run the Docker container on a different port** (e.g., `27018`):
   ```bash
   MONGO_PORT=27018 docker compose up -d
   ```
   Then update `MONGODB_URI` in `apps/api/.env` to:
   ```env
   MONGODB_URI=mongodb://127.0.0.1:27018/auth_test
   ```

### Option B: Using a Local MongoDB Installation

If `mongod` is already installed and running locally on `127.0.0.1:27017`, no Docker container is needed. Verify it is active with:

```bash
mongosh --eval "db.runCommand({ ping: 1 })"
```

> **Connection Issues?** If the backend fails to connect on startup, confirm that MongoDB is running and that the host/port in `apps/api/.env` (`MONGODB_URI`) matches your active MongoDB instance.

---

## 7. Running the Application

### Start both Frontend and Backend in development mode

```bash
pnpm run dev
```

Or run each application individually:

```bash
# Start NestJS API on http://localhost:4000
pnpm --filter @repo/api dev

# Start React/Vite frontend on http://localhost:5173
pnpm --filter @repo/web dev
```

### Local Development URLs
- **React Frontend:** `http://localhost:5173`
- **NestJS API Base:** `http://localhost:4000/api`
- **Swagger UI Documentation:** `http://localhost:4000/api/docs`
- **Health Check:** `http://localhost:4000/api/health`

---

## 8. Build, Lint, Type-Check, and Test Commands

### Build
```bash
pnpm run build
```

### Lint
```bash
pnpm run lint
```

### Type-Check
```bash
pnpm run type-check
```

### Tests

```bash
# Run all unit & integration tests across the monorepo (Backend + Frontend)
pnpm run test

# Run Backend unit + Supertest integration tests
pnpm --filter @repo/api test

# Run Backend Supertest E2E integration tests only
pnpm --filter @repo/api test:e2e

# Run Frontend Vitest + React Testing Library tests
pnpm --filter @repo/web test

# Run Playwright End-to-End browser tests
pnpm run test:e2e
```

---

## 9. API Endpoints & Swagger Documentation

Interactive OpenAPI / Swagger documentation is exposed at:

**`http://localhost:4000/api/docs`**

| Method | Endpoint | Access | Status | Description |
|---|---|---|---|---|
| `POST` | `/api/auth/signup` | Public | `201 Created` | Register a new user, hash password with Argon2id, set `HttpOnly` JWT cookie, return `{ user }` |
| `POST` | `/api/auth/signin` | Public | `200 OK` | Authenticate user credentials, set `HttpOnly` JWT cookie, return `{ user }` |
| `GET` | `/api/auth/me` | Protected | `200 OK` | Verify `HttpOnly` JWT cookie against database and return current `{ user }` |
| `POST` | `/api/auth/logout` | Protected | `200 OK` | Clear `HttpOnly` authentication cookie with matching flags and return `{ message }` |
| `GET` | `/api/application` | Protected | `200 OK` | Return `{ "message": "Welcome to the application." }` |
| `GET` | `/api/health` | Public | `200 OK` | Return API health and MongoDB connection state |

---

## 10. Authentication Flow & Security Notes

### Authentication Lifecycle
1. **Sign Up (`POST /api/auth/signup`) / Sign In (`POST /api/auth/signin`):**
  - Inputs are validated and normalized (`email` trimmed and lowercased; `name` trimmed).
  - Passwords are hashed and verified using **Argon2id** (`memoryCost: 19456`, `timeCost: 2`, `parallelism: 1`).
  - A short-lived JWT (`15m` default) is signed containing `{ sub: user.id, email: user.email }` and written to the `access_token` cookie (`HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production).
  - The response body returns only the safe user profile `{ user: { id, name, email, createdAt } }`.
2. **Session Restoration (`GET /api/auth/me`):**
  - On page load or browser refresh, `AuthProvider` calls `GET /api/auth/me` with `withCredentials: true`.
  - `ProtectedRoute` renders a loading indicator while verification is in flight and never flashes protected content or redirects prematurely.
3. **Protected Application Page (`GET /api/application`):**
  - Accessible at `/app` only when authenticated. Queries `/api/application` and displays the exact required message: `Welcome to the application.`
4. **Logout (`POST /api/auth/logout`):**
  - Calls `POST /api/auth/logout`, clears the `access_token` cookie on the server using identical cookie attributes, resets client `AuthContext`, and redirects to `/signin`.

### Expected Frontend/Backend Deployment Relationship (`SameSite=Lax` & CORS)
- The authentication cookie is configured with `SameSite=Lax`.
- In browsers, `localhost:5173` and `localhost:4000` are treated as **same-site** (schemeful same-site on `http://localhost`), allowing `SameSite=Lax` cookies to be sent on `XHR`/`fetch` requests with `withCredentials: true`.
- **Production Deployment Requirement:** For `SameSite=Lax` cookies to be sent on API requests in production, the frontend and backend **must share the same registrable domain (eTLD+1)** (e.g., `app.example.com` and `api.example.com`, or served behind a reverse proxy on the same origin such as `example.com` and `example.com/api`).
- `SameSite=Lax` **does not** transmit cookies on cross-site `XHR`/`fetch` requests between unrelated domains (for example, a frontend on `*.vercel.app` calling an API on `*.onrender.com`). If deployed on unrelated domains, a reverse proxy rewrite under the frontend domain should be used (recommended) rather than weakening cookie security to `SameSite=None`.

### CSRF Protection
- Because authentication relies on cookies, CORS alone is not treated as a complete CSRF defense (e.g., HTML form `POST` requests do not trigger CORS preflight).
- Every state-changing request (`POST`, `PUT`, `PATCH`, `DELETE`) is inspected by `CsrfOriginGuard`, which validates the `Origin` header (and `Referer` fallback) against the configured `WEB_ORIGIN` allowlist, rejecting untrusted cross-site requests with `403 Forbidden`.
- In addition, `SameSite=Lax` prevents cookies from being attached to third-party cross-site `POST` requests, and the global `ValidationPipe` + JSON body parser rejects non-JSON cross-origin form submissions.
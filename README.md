# myblog

Monorepo: React frontend (Vite), Express backend, shared contracts/schemas.

## Prerequisites

- Node.js (v18+)
- npm
- Docker & Docker Compose (for Postgres, PgAdmin, MinIO)

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Start backing services

```bash
docker compose up -d
```

Runs:

- **Postgres** — `localhost:5432`
- **PgAdmin** — `http://localhost:5050` (see env below for login)
- **MinIO** — API `localhost:9000`, console `http://localhost:9001` (minioadmin / minioadmin)

### 3. Backend environment

```bash
cp packages/myblog-backend/.env.example packages/myblog-backend/.env
```

Edit `packages/myblog-backend/.env` if you need different DB credentials, ports, or JWT secret. Defaults in `.env.example` match the Docker setup.

### 4. Database

```bash
npm run migrate
npm run seed
```

### 5. Run the app

```bash
npm run dev
```

- **Frontend:** http://localhost:5173 (Vite default; proxy `/api` and `/uploads` to backend)
- **Backend:** http://localhost:5000

## Scripts

| Command       | Description                                      |
|---------------|--------------------------------------------------|
| `npm run dev` | Start backend + frontend (concurrently)          |
| `npm run migrate` | Run DB migrations (backend)                  |
| `npm run seed` | Seed database (backend)                         |
| `npm run lint` | Lint entire repo                                |
| `npm run knip` | Find unused files, dependencies, exports        |

## Project layout

```
packages/
  myblog-backend/   # Express API (Kysely, ts-rest, auth, MinIO)
  myblog-frontend/  # React + Vite + React Query
  myblog-shared/    # Shared types, Zod schemas, ts-rest contract
```

## PgAdmin (optional)

- URL: http://localhost:5050  
- Email: `admin@admin.com` (from `PGADMIN_DEFAULT_EMAIL`)  
- Password: `admin` (from `PGADMIN_DEFAULT_PASSWORD`)  

Add a server with host `postgres`, port `5432`, user/password/database from `packages/myblog-backend/.env` (e.g. `admin` / `admin` / `tutorial`).

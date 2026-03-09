# haGIT — Habit Tracker

A Git-inspired habit tracker. Commit your habits like commits to a repo.

## Stack

- **Next.js 14** (App Router) — frontend + API backend
- **Prisma** + **PostgreSQL** — database
- **JWT** — authentication (also used by CLI)
- **Zustand** — auth state
- **Tailwind CSS** — Neo-Brutalism design system

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required vars:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Strong random string for signing JWTs |

### 3. Migrate the database

```bash
npx prisma migrate dev --name init
# or for production
npx prisma migrate deploy
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## CLI Integration

haGIT exposes the same REST API the CLI expects:

```
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/verify

GET    /api/habits
POST   /api/habits
GET    /api/habits/:id
PATCH  /api/habits/:id
DELETE /api/habits/:id

POST   /api/commits/push
GET    /api/commits
GET    /api/commits/aggregated
GET    /api/commits/by-habit
DELETE /api/commits/:id
DELETE /api/commits/by-habit/:habitId

DELETE /api/account
```

Get your token from **Settings** (gear icon) → CLI Token, then:

```bash
hagit login -t <your-token>
hagit commit -h "Running" -m "5k in 28 minutes"
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Generate Prisma client + build |
| `npm start` | Start production server |
| `npx prisma studio` | Open Prisma GUI |

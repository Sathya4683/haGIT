# haGIT Implementation Notes

## Architecture

This is a **unified Next.js app** — no separate backend process required. The API is implemented as Next.js Route Handlers under `src/app/api/`.

## API Routes

All routes use `export const runtime = "nodejs"` (required for Prisma).

### Auth
- `POST /api/auth/signup` — creates user, returns JWT
- `POST /api/auth/login` — validates credentials, returns JWT
- `POST /api/auth/verify` — validates Bearer token (also accepts GET for CLI compat)

### Habits
- `GET /api/habits` — list user's habits with commit counts
- `POST /api/habits` — create habit (upsert-safe, unique per user)
- `GET /api/habits/:id` — habit detail + all commits
- `PATCH /api/habits/:id` — rename habit
- `DELETE /api/habits/:id` — delete habit + cascade commits

### Commits
- `POST /api/commits/push` — batch-push commits, auto-creates habits
- `GET /api/commits` — paginated commit list (optional habitName, limit filters)
- `GET /api/commits/aggregated` — date → count map for heatmap
- `GET /api/commits/by-habit` — per-habit commit counts
- `DELETE /api/commits/:id` — delete one commit
- `DELETE /api/commits/by-habit/:habitId` — bulk-delete all commits for a habit

### Account
- `DELETE /api/account` — delete authenticated user + all data

## Auth System

JWT with 90-day expiry. `lib/auth.ts` exports:
- `signToken(payload)` — mint a JWT
- `verifyToken(token)` — verify and decode
- `requireAuth(req)` — extract + verify from Authorization header, throws UNAUTHORIZED
- Helper response builders: `unauthorized()`, `badRequest()`, `notFound()`, `serverError()`

Token is stored in `localStorage` under `hagit_token`. The Axios interceptor injects it on every request. A 401 response triggers auto-logout.

## Prisma

Singleton at `lib/prisma.ts` (hot-reload safe via `globalThis`).
Schema: User → Habit[] → Commit[]. All relations cascade on delete.

## UI System (Neo-Brutalism)

CSS utility classes defined in `globals.css`:
- `.card` — white bg + 2px solid border + 4px hard offset shadow
- `.card-sm` — same but 2px shadow
- `.card-flat` — border only, no shadow
- `.btn-press` / `.btn-press-sm` — shifts on `:active` to simulate pressing
- `.input-brutal` — bordered input with brand-color focus shadow
- `.shimmer-bg` — skeleton loading animation

Tailwind custom shadows: `shadow-brutal`, `shadow-brutal-sm`, `shadow-brutal-lg`, `shadow-brutal-green`, `shadow-brutal-red`, `shadow-brutal-dark`.

## Design Decisions

- No border-radius on interactive elements (brutal aesthetic)
- Offset box-shadows replace standard drop-shadows (4px right+down, no blur)
- `font-black` (900) for headings, `font-bold` (700) for UI labels
- `font-mono` for numbers (tabular spacing)
- Brand green (#22c55e) used sparingly as accent, never as background
- Dark mode: paper/ink CSS variables flip — same border-width system, shadow uses white at low opacity

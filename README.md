# haGIT

haGIT is a Git-inspired habit tracker. Habits are **branches**, completed actions are **commits**, and your consistency shows up as a **contribution graph**. You can log from a CLI, a browser extension, an AI assistant (MCP) or the web dashboard, and an AI coach answers questions about your habits, grounded in your own data and a library of research-backed articles.

| | |
|---|---|
| **Web dashboard** | Contribution heatmap, today checklist, streaks, eight colour palettes in light and dark mode |
| **Habit coach** | Gemini agent over your habit stats, citing knowledge-base articles inline (`[KB12]`) |
| **Knowledge base** | Hybrid retrieval (pgvector + Postgres full-text, reciprocal rank fusion) over curated articles |
| **Reminders & reports** | Nightly push reminders via [ntfy](https://ntfy.sh) and a weekly one-page PDF report by email |
| **Admin console** | Role-based access (user / editor / admin), markdown article editor, retrieval playground, jobs, audit log |
| **Clients** | `hagit-cli` (npm), Chrome extension (MV3), `hagit-mcp` server |
| **Observability** | Structured logs to Loki, Prometheus metrics, Grafana dashboards and alerts |

---

## Architecture

```mermaid
flowchart LR
    subgraph Clients
        CLI[hagit-cli]
        EXT[Chrome extension]
        MCP[hagit-mcp]
        WEB[Dashboard / Library]
        ADM[Admin console]
    end

    subgraph Vercel["Next.js on Vercel"]
        MW[Middleware: host routing + RBAC gate]
        API[API routes: withRoute — auth, validation, rate limits, logs]
        COACH[Coach agent]
        KB[Hybrid retrieval]
        JOBS[/api/jobs/tick]
    end

    DB[(Postgres + pgvector)]
    REDIS[(Redis: token buckets)]
    GEM[Gemini]
    QS[Scheduler: monitoring host or QStash]
    NTFY[ntfy]
    SMTP[SMTP]
    OBS[Prometheus · Loki · Grafana]

    CLI & EXT & MCP & WEB & ADM --> MW --> API
    API --> DB
    API --> REDIS
    API --> COACH --> GEM
    COACH --> KB --> DB
    QS -->|every 30 min, authenticated| JOBS
    JOBS --> NTFY
    JOBS --> SMTP
    API -. logs .-> OBS
    OBS -. scrape /api/metrics, probe /api/health .-> API
```

- **One API for every client.** Route handlers share a wrapper (`apps/web/src/server/http/withRoute.ts`) that handles request ids, authentication, zod validation, token-bucket rate limiting, error mapping and one structured log line per request.
- **Two authentication paths.** Users get a revocable API token (CLI, extension, MCP and dashboard). The admin console uses an Auth.js session and checks the role against the database on every request.
- **Admin on its own host.** With `ADMIN_HOST` set, middleware serves the console on that hostname and returns 404 for `/admin` everywhere else.
- **Scheduled work runs outside the request path.** An authenticated request every 30 minutes runs idempotent jobs in each user's timezone (see [Reminders and reports](#reminders-and-reports)).

---

## Repository layout

```
apps/
  web/            Next.js app: dashboard, library, admin console, API routes
  extension/      Chrome extension (Vite + React, Manifest V3)
packages/
  cli/            hagit-cli (Commander.js), published to npm
  coach-core/     Coach agent, habit tools, statistics, citation handling
  kb/             Knowledge base: parsing, chunking, embeddings, hybrid search, ingestion, eval
  mcp/            hagit-mcp server (Model Context Protocol)
  types/          Shared TypeScript types
content/kb/       Knowledge-base articles (Markdown + frontmatter), synced into the database
prisma/           Database schema and migrations
infra/observability/  Prometheus, Loki, Grafana (dashboards, alerts), Caddy, job scheduler
infra/terraform/      EC2 host for the observability stack (Elastic IP, security group, budget)
scripts/          Admin promotion, QStash schedule setup
```

---

## Local development

Requirements: Node.js 20+, Docker.

```bash
npm install
cp apps/web/.env.example apps/web/.env      # defaults point at the local stack
cp apps/web/.env.example .env               # used by the Prisma CLI

docker compose up -d                        # Postgres (pgvector), Redis, Mailpit, ntfy, scheduler
npm run db:migrate                          # apply migrations
npm run kb:sync                             # import content/kb (downloads the embedding model once)
npm run dev -w hagit-frontend               # http://localhost:3000
```

| Service | URL |
|---|---|
| Dashboard | http://localhost:3000 |
| Admin console | http://admin.localhost:3000 (with `ADMIN_HOST=admin.localhost:3000`) |
| Mailpit (captured email) | http://localhost:8025 |
| ntfy (push notifications) | http://localhost:8090 |
| Grafana / Prometheus / Loki | http://localhost:3001 · :9090 · :3100 (`docker compose --profile observability up -d`) |

Grant yourself the admin role after signing up:

```bash
npm run admin:promote -- you@example.com ADMIN
```

Optional: `docker compose --profile app up -d` runs the Next.js dev server in a container instead of on the host.

### Tests

```bash
npm test -w hagit-frontend        # API, rate limiting, jobs, reports, permissions
npm test -w @hagit/coach-core     # agent loop, tools, statistics, citations
npm test -w @hagit/kb             # parsing, chunking, ranking
npm run kb:eval                   # retrieval quality on the golden set (needs a database)
TEST_DATABASE_URL=postgresql://hagit:hagit@localhost:5434/hagit npx vitest run -w hagit-frontend push.int
```

---

## Habit coach

The coach is a Gemini function-calling agent (`packages/coach-core`). Streaks, consistency and trends are computed in code, so the model interprets numbers rather than inventing them, and its tools are read-only and scoped to the signed-in user.

- **Ask mode** retrieves knowledge-base passages before calling the model (no extra model round trip). The reply ends every line that uses a passage with its tag, e.g. `[KB9]`. The dashboard turns each tag into a link to the article, and tags the model wasn't given are stripped.
- **Review mode** writes a weekly review (wins, watch-outs, next steps) and can search the knowledge base as a tool.
- Each user gets 5 runs per hour, with a global limit protecting the shared Gemini quota. Without `GEMINI_API_KEY` the coach is disabled (503).

Dashboard: chat button in the bottom-right corner. CLI: `hagit coach` or `hagit coach "why do I skip gym?"`.

## Knowledge base

Articles live in `content/kb/*.md` and can also be written or uploaded (`.md` with frontmatter) in the admin console.

1. **Chunking:** split on headings into ~220-word chunks with overlap, each prefixed with its heading path.
2. **Embeddings:** [`bge-small-en-v1.5`](https://huggingface.co/BAAI/bge-small-en-v1.5) (English, 384 dimensions), run in-process with ONNX (`EMBEDDINGS_PROVIDER=local`, a few milliseconds per query) or via Cloudflare Workers AI using the same model (`cloudflare`).
3. **Retrieval:** pgvector cosine similarity and Postgres full-text search, fused with reciprocal rank fusion, filtered by a relevance cutoff and diversified across articles.
4. **Evaluation:** `npm run kb:eval` reports Recall@4 and MRR on `packages/kb/eval/golden.json`. CI fails if retrieval quality drops.

Published articles are public at `/kb`. The admin playground shows the full ranking breakdown for any query.

## Reminders and reports

`POST /api/jobs/tick` runs every 30 minutes (at :01 and :31, so half-hour timezones are served on time). In production the scheduler container on the monitoring host calls it with `CRON_SECRET`; an Upstash QStash schedule (`npm run jobs:schedule`, verified by signature) works as an alternative.

- **Nightly reminder:** after the user's chosen hour, a push notification to their private ntfy channel lists habits not committed today, with streaks at risk first.
- **Weekly report:** on Monday morning, an email with a one-page PDF of the previous week (commits, active days, habits, 12-week heatmap, a note and suggested articles), themed with the user's palette.
- **Delivery guarantees:** each delivery is claimed with a unique (user, kind, period) row, so retries and overlapping ticks never send twice, and failures are retried a bounded number of times. Runs are recorded and shown in the admin console.

## Admin console

| Role | Access |
|---|---|
| `USER` | Dashboard only |
| `EDITOR` | Knowledge base: write, publish, re-index; retrieval playground |
| `ADMIN` | Everything, plus users and roles, jobs and the audit log |

Every privileged action is written to the audit log.

## Observability

- **Logs:** JSON lines to stdout and, when `LOKI_URL` is set, to Loki after each response. Client telemetry from the CLI, extension and browser arrives via `/api/telemetry`, labelled by source.
- **Metrics:** `/api/metrics` (bearer token) exposes gauges computed from the database (users, activity, knowledge base, deliveries, job freshness), so it's correct on serverless.
- **Probes:** blackbox checks of the site and `/api/health` (database and Redis).
- **Dashboards and alerts:** service health, product and jobs & clients; alerts for downtime, error rate, stale jobs, coach failures, TLS and disk, delivered by email and ntfy.

`infra/observability` runs the stack locally or on a small VM behind Caddy (TLS). `infra/terraform` provisions that VM on AWS (t3.micro, Elastic IP, `sslip.io` hostname, monthly budget alert) and `infra/terraform/deploy.sh` syncs the configuration, generates its secrets and starts the stack.

---

## CLI

```bash
npm install -g hagit-cli
```

| Command | Description |
|---|---|
| `hagit init` | Initialise the local workspace (`~/.hagit`) |
| `hagit login -t <token>` | Authenticate with a token from the dashboard (Settings) |
| `hagit branch` | List habits (current marked with `*`) |
| `hagit branch -m <habit>` / `-d <habit>` | Create / delete a habit |
| `hagit checkout <habit>` | Switch the current habit |
| `hagit commit -m <message>` | Record a habit action locally |
| `hagit log [-n <count>]` | Show history (local and remote) |
| `hagit status` | Show the current habit and unpushed commits |
| `hagit push` | Sync local commits (batched, safe to retry) |
| `hagit reset` | Discard unpushed commits |
| `hagit coach ["<question>"]` | Weekly review, or ask a question |
| `hagit telemetry [on\|off]` | Anonymous usage telemetry (command timings and errors only) |

`HAGIT_API_URL` points the CLI at another server, e.g. `http://localhost:3000`.

## Chrome extension

```bash
npm run build -w hagit-extension
```

Load `apps/extension/dist` via `chrome://extensions` → Developer mode → Load unpacked, then paste your token in the extension's settings.

## MCP server

`hagit-mcp` exposes the habit tools, including knowledge-base search, to MCP clients (Claude Code, Claude Desktop, Gemini CLI, Cursor). It reuses the token saved by `hagit login`.

```bash
npm run build -w hagit-mcp
claude mcp add hagit -- node /absolute/path/to/haGIT/packages/mcp/dist/index.js
```

See [`packages/mcp/README.md`](packages/mcp/README.md) for other clients and options.

---

## Deployment

The reference deployment uses free tiers: **Vercel** (app and admin host), **Supabase** (Postgres with pgvector), **Upstash** (Redis), **Gmail SMTP** (reports), **ntfy.sh** (push), with the observability stack and job scheduler on a small EC2 instance. GitHub Actions run CI on every pull request, apply migrations and sync knowledge-base content on `main`, and deploy the observability configuration.

All configuration is documented in [`apps/web/.env.example`](apps/web/.env.example) and [`infra/observability/.env.example`](infra/observability/.env.example).

## License

MIT

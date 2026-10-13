<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/readme/logo-dark.png">
  <img src="assets/readme/logo-light.png" alt="haGIT" width="300">
</picture>

### Track your habits the way you track your code.

Habits are **branches**, check-ins are **commits**, and your consistency becomes a **contribution graph**.<br>
An AI coach reads your stats and backs its advice with research. Log from the web, your phone, the terminal or Claude Code.

[![Live app](https://img.shields.io/badge/live-hagithub.vercel.app-22c55e?style=flat-square&logo=vercel&logoColor=white)](https://hagithub.vercel.app)
[![hagit-cli](https://img.shields.io/npm/v/hagit-cli?style=flat-square&label=hagit-cli&logo=npm&color=cb3837)](https://www.npmjs.com/package/hagit-cli)
[![hagit-mcp](https://img.shields.io/npm/v/hagit-mcp?style=flat-square&label=hagit-mcp&logo=modelcontextprotocol&color=111111)](https://www.npmjs.com/package/hagit-mcp)
[![CI](https://img.shields.io/github/actions/workflow/status/Sathya4683/haGIT/ci.yml?branch=main&style=flat-square&label=CI&logo=githubactions&logoColor=white)](https://github.com/Sathya4683/haGIT/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-6e7681?style=flat-square)](#license)

**[Open the app](https://hagithub.vercel.app)** · [Habit library](https://hagithub.vercel.app/kb) · [CLI](#the-cli) · [MCP server](#claude-code-and-other-ai-assistants) · [How it works](#how-it-works) · [Run it locally](#run-it-locally)

</div>

<br>

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/readme/dashboard-dark.webp">
  <img src="assets/readme/dashboard-light.webp" alt="The haGIT dashboard: greeting with today's progress, habit cards with streaks, a contribution heatmap and this week's chart">
</picture>

<br>

<table>
<tr>
<td width="33%" valign="top"><b>Commit, don't just tick</b><br>One-tap check-ins or a <code>$ hagit commit</code> bar with a message. Streaks, a 12-month heatmap and a <code>git log --graph</code> of everything you did.</td>
<td width="33%" valign="top"><b>A coach that knows you</b><br>Weekly reviews and answers grounded in your own numbers, citing a library of research-backed articles.</td>
<td width="33%" valign="top"><b>Wherever you work</b><br>Web and phone, a CLI, a Chrome extension, and an MCP server for Claude Code, Cursor and Claude Desktop.</td>
</tr>
<tr>
<td valign="top"><b>Nudges that respect you</b><br>An evening push notification for habits still open, and a one-page PDF report every Monday.</td>
<td valign="top"><b>Make it yours</b><br>Eight colour palettes, light and dark mode, synced across devices.</td>
<td valign="top"><b>Built like a product</b><br>Role-based admin console, Prometheus/Loki/Grafana monitoring with alerts, CI and Terraform.</td>
</tr>
</table>

## A quick tour

### Today, at a glance

Every habit has its own colour, streak and two-week sparkline. Tap the check to commit for today, and confetti tells you when the whole day is done. Open a habit for its full history: consistency, your strongest weekday, the time of day you usually show up, and every commit.

<table>
<tr>
<td width="50%"><img src="assets/readme/habit.webp" alt="Habit page with streaks, heatmap in the habit's colour, consistency, weekday rhythm and time of day"></td>
<td width="50%"><img src="assets/readme/activity.webp" alt="Recent commits drawn as a git log --graph with one lane per habit"></td>
</tr>
<tr>
<td align="center"><sub>A habit's own page</sub></td>
<td align="center"><sub>Recent commits as a <code>git log --graph</code>, one lane per habit</sub></td>
</tr>
</table>

### On your phone, too

The whole app works on a phone, with a bottom tab bar and full-height sheets for the coach and settings.

<p align="center"><img src="assets/readme/mobile.webp" alt="haGIT on a phone: today view, a habit page in dark mode, and the coach" width="900"></p>

### A coach that knows your data and cites the research

Ask for a weekly review, or ask anything. The coach (Gemini, with read-only tools over your habits) quotes your real numbers, then backs its advice with passages from the habit library. Every claim from the library carries a numbered citation that links to the article.

<p align="center"><img src="assets/readme/coach.webp" alt="Left: a weekly review with summary, wins and watch-outs. Right: an answer about skipping the gym on Thursdays with three numbered citations and a sources row" width="900"></p>

### A library worth reading

Fifteen short, practical articles on how habits actually form, each with its sources. The library is public, searchable by situation ("I keep skipping workouts on Fridays"), and it's what the coach cites.

<table>
<tr>
<td width="50%"><img src="assets/readme/library.webp" alt="The habit library with search and tag filters"></td>
<td width="50%"><img src="assets/readme/article.webp" alt="An article page with a table of contents"></td>
</tr>
</table>

### Make it yours

Pick from eight palettes in light or dark mode. Settings also hold your nightly reminder, the weekly report, your API token, and copy-ready setup for AI assistants.

<p align="center"><img src="assets/readme/themes.webp" alt="The dashboard in four palettes: Ocean, Grape (dark), Sunset and Nord (dark)"></p>

<details>
<summary><b>Settings</b></summary>
<br>
<p align="center"><img src="assets/readme/settings.webp" alt="Settings drawer: appearance, reminders with an ntfy QR code, and account with the API token and AI assistant setup" width="900"></p>
</details>

### Reminders and a weekly report

In the evening haGIT sends a push notification through the free [ntfy](https://ntfy.sh) app, listing the habits you haven't committed yet, with streaks at risk first. Scan the QR code in Settings once and you're subscribed.

<details>
<summary><b>Notifications on a phone</b></summary>
<br>
<table align="center">
<tr>
<td><img src="assets/readme/ntfy-reminder.webp" alt="ntfy on a phone: an evening reminder listing five open habits with their streaks, and the connection test" width="300"></td>
<td><img src="assets/readme/ntfy-alert.webp" alt="ntfy on a phone: a Grafana alert from the monitoring stack with links to the alert and to silence it" width="300"></td>
</tr>
<tr>
<td align="center"><sub>Evening reminder</sub></td>
<td align="center"><sub>Monitoring alert</sub></td>
</tr>
</table>
</details>

Every Monday you get an email with a one-page PDF of your week: commits, active days, your best habit, a 12-week heatmap, a note from the coach and three articles picked for where you are.

<table>
<tr>
<td width="50%"><img src="assets/readme/weekly-report.webp" alt="The weekly PDF report"></td>
<td width="50%"><img src="assets/readme/weekly-email.webp" alt="The weekly report email in Gmail: commits, active days, best habit, a coach note, habits this week against last, and further reading"></td>
</tr>
<tr>
<td align="center"><sub>The PDF</sub></td>
<td align="center"><sub>The email it arrives in</sub></td>
</tr>
</table>

### The CLI

For people who live in the terminal. Commits are saved locally, so it works offline, and `hagit push` syncs them in batches. Pushes are safe to retry, so nothing is ever duplicated.

```bash
npm install -g hagit-cli
hagit init && hagit login -t <token from Settings → Account>
```

<table>
<tr>
<td width="55%" valign="top"><img src="assets/readme/cli.webp" alt="hagit branch, checkout, commit, push and log in a terminal"></td>
<td width="45%" valign="top"><img src="assets/readme/cli-coach.webp" alt="hagit coach answering how reading is going"></td>
</tr>
</table>

### Claude Code and other AI assistants

[`hagit-mcp`](https://www.npmjs.com/package/hagit-mcp) gives Claude Code, Cursor, Claude Desktop and Gemini CLI seven tools: read your stats and check-ins, search your notes and the library, log check-ins and create habits. It runs on your machine and talks to the haGIT API with your token.

```bash
claude mcp add hagit -e HAGIT_TOKEN=<token> -- npx -y hagit-mcp
```

<p align="center"><img src="assets/readme/claude-code-mcp.webp" alt="Claude Code using the hagit MCP tools to summarise the week as a table, pick one habit to focus on and log a walk" width="860"></p>

<sub>A real Claude Code session. It called hagit four times (<code>list_habits</code>, <code>get_habit_stats</code>, <code>get_checkins</code>, <code>log_checkin</code>), summarised the week, picked one thing to focus on and logged the walk, which shows up on the dashboard straight away.</sub>

### Admin console

Editors and admins get a separate console on its own host:
- **Overview:** the product's health at a glance.
- **Knowledge base:** a markdown editor with live preview and `.md` upload.
- **Retrieval playground:** shows exactly how a question ranks every passage.
- **People and system:** users and roles, scheduled jobs, and an audit log of every privileged action.

<table>
<tr>
<td colspan="2"><img src="assets/readme/admin-overview.webp" alt="Admin overview with KPI sparklines, commits per day, knowledge-base health, job status and recent activity"></td>
</tr>
<tr>
<td width="50%"><img src="assets/readme/admin-editor.webp" alt="Article editor with markdown and live preview"></td>
<td width="50%"><img src="assets/readme/admin-playground.webp" alt="Retrieval playground showing cosine, dense rank, lexical rank and fused score for each passage"></td>
</tr>
</table>

### Monitoring

Structured logs go to Loki, Prometheus scrapes the app's metrics and probes its health, and Grafana ties it together. Alerts for downtime, error spikes, stale jobs, coach failures, TLS expiry and disk go to email and your phone.

<p align="center"><img src="assets/readme/grafana-health.webp" alt="Grafana service health dashboard"></p>

<details>
<summary><b>Product, coach and jobs dashboards</b></summary>
<br>
<img src="assets/readme/grafana-product.webp" alt="Grafana product dashboard: coach runs, citations per answer, retrieval latency, knowledge-base searches">
<br><br>
<img src="assets/readme/grafana-jobs.webp" alt="Grafana jobs dashboard: last successful reminder and report runs, job durations and logs">
</details>

## How it works

<p align="center"><img src="assets/readme/architecture.webp" alt="Architecture: clients call a Next.js app on Vercel, which uses Supabase Postgres with pgvector, Upstash Redis, Gemini, ntfy and Gmail; a monitoring host on AWS EC2 runs Prometheus, Loki, Grafana, Caddy and the job scheduler"></p>

- **One API for every client.** Every route goes through one shared wrapper. It handles authentication, input validation, rate limiting (Redis token buckets) and error mapping, and writes one structured log line per request.
- **Two ways to sign in.** Users get a revocable API token, which the dashboard, CLI, extension and MCP server all use. The admin console uses its own session, and the user's role is re-checked against the database.
- **Scheduled work stays off the request path.** A scheduler on the monitoring host calls the jobs endpoint every 30 minutes, at :01 and :31, so half-hour timezones are covered too. Each reminder or report is claimed once per user and period, so retries never send twice.
- **Infrastructure as code.** Terraform creates the monitoring host (t3.micro, Elastic IP, HTTPS via Let's Encrypt, a budget alert). GitHub Actions run CI, apply migrations and sync articles on merge, and publish the npm packages from tags.

### How the coach answers

<p align="center"><img src="assets/readme/coach-pipeline.webp" alt="Ingest: markdown articles are chunked, embedded with bge-small-en-v1.5 and stored in pgvector. Answer: the question is embedded, searched by vector and full text, fused and filtered, then Gemini writes an answer citing passages, using your habit data through tools"></p>

- **Embeddings run in-process.** `bge-small-en-v1.5` runs on ONNX right inside the function, so a question embeds in milliseconds with no extra API call.
- **Retrieval mixes two searches.** It combines meaning (pgvector cosine) with keywords (Postgres full text) using reciprocal rank fusion. A relevance cutoff drops weak matches, and it takes at most two passages per article.
- **Numbers come from code, not the model.** Streaks, consistency and trends are computed in code, so the model interprets numbers instead of inventing them. Any citation it wasn't given is removed.
- **Retrieval quality is checked on every pull request.** It currently scores 0.97 on Recall@4 and 0.91 MRR against a golden set of questions.

### How the MCP server connects

<p align="center"><img src="assets/readme/mcp.webp" alt="Claude Code talks to hagit-mcp over stdio; hagit-mcp calls the haGIT API over HTTPS with your token"></p>

### Data model

<details>
<summary><b>Entity-relationship diagram</b> (12 tables, generated from <code>prisma/schema.prisma</code>)</summary>
<br>
<p align="center"><img src="assets/readme/data-model.webp" alt="ER diagram: User at the centre with Account, Session and AuditLog on the left; Habit and Commit, KbArticle and KbChunk, UserPreference and NotificationLog on the right"></p>
</details>

## Tech stack

| | |
|---|---|
| **App** | ![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=flat-square&logo=nextdotjs&logoColor=white) ![React](https://img.shields.io/badge/React-20232a?style=flat-square&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white) ![Radix UI](https://img.shields.io/badge/Radix_UI-161618?style=flat-square&logo=radixui&logoColor=white) ![Zod](https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white) |
| **Data** | ![Postgres + pgvector](https://img.shields.io/badge/Postgres_+_pgvector-4169E1?style=flat-square&logo=postgresql&logoColor=white) ![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white) ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white) ![Upstash Redis](https://img.shields.io/badge/Upstash_Redis-00E9A3?style=flat-square&logo=upstash&logoColor=black) |
| **AI** | ![Gemini](https://img.shields.io/badge/Gemini-8E75B2?style=flat-square&logo=googlegemini&logoColor=white) ![Transformers.js](https://img.shields.io/badge/Transformers.js-FFD21E?style=flat-square&logo=huggingface&logoColor=black) ![ONNX Runtime](https://img.shields.io/badge/ONNX_Runtime-005CED?style=flat-square&logo=onnx&logoColor=white) ![MCP](https://img.shields.io/badge/Model_Context_Protocol-111111?style=flat-square&logo=modelcontextprotocol&logoColor=white) |
| **Delivery** | ![ntfy](https://img.shields.io/badge/ntfy-317F6F?style=flat-square&logo=ntfy&logoColor=white) ![Gmail SMTP](https://img.shields.io/badge/Gmail_SMTP-EA4335?style=flat-square&logo=gmail&logoColor=white) ![React-PDF](https://img.shields.io/badge/React--PDF-E33E3E?style=flat-square) |
| **Clients** | ![npm](https://img.shields.io/badge/CLI_+_MCP_on_npm-CB3837?style=flat-square&logo=npm&logoColor=white) ![Chrome](https://img.shields.io/badge/Chrome_extension-4285F4?style=flat-square&logo=googlechrome&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white) |
| **Infra** | ![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white) ![AWS EC2](https://img.shields.io/badge/AWS_EC2-FF9900?style=flat-square) ![Terraform](https://img.shields.io/badge/Terraform-844FBA?style=flat-square&logo=terraform&logoColor=white) ![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white) ![Caddy](https://img.shields.io/badge/Caddy-1F88C0?style=flat-square&logo=caddy&logoColor=white) ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white) |
| **Observability** | ![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?style=flat-square&logo=prometheus&logoColor=white) ![Grafana + Loki](https://img.shields.io/badge/Grafana_+_Loki-F46800?style=flat-square&logo=grafana&logoColor=white) ![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white) |

## Get started

**Use it:** sign up at [hagithub.vercel.app](https://hagithub.vercel.app). To use the CLI or an AI assistant, copy your token from **Settings → Account**, where the ready-made commands are too.

### Run it locally

Requirements: Node.js 20+ and Docker.

```bash
git clone https://github.com/Sathya4683/haGIT.git && cd haGIT
npm install
cp apps/web/.env.example apps/web/.env && cp apps/web/.env.example .env   # local defaults

docker compose up -d                 # Postgres + pgvector, Redis, Mailpit, ntfy, job scheduler
npm run db:migrate                   # apply migrations
npm run kb:sync                      # import the articles (downloads the embedding model once)
npm run dev -w hagit-frontend        # http://localhost:3000
```

| | |
|---|---|
| App | http://localhost:3000 |
| Admin console | http://admin.localhost:3000 (after `npm run admin:promote -- you@example.com ADMIN`) |
| Captured email (Mailpit) | http://localhost:8025 |
| Push notifications (ntfy) | http://localhost:8090 |
| Grafana · Prometheus · Loki | http://localhost:3001 · :9090 · :3100 (`docker compose --profile observability up -d`) |

Add a `GEMINI_API_KEY` ([free](https://aistudio.google.com/apikey)) to enable the coach.

### Deploy

The reference deployment runs on free tiers:
- **Vercel** for the app and admin host;
- **Supabase** for Postgres with pgvector;
- **Upstash** for Redis;
- **Gmail SMTP** for the weekly email, and **ntfy.sh** for push;
- a small **EC2** instance for monitoring and the scheduler.

Every variable is documented in [`apps/web/.env.example`](apps/web/.env.example) and [`infra/observability/.env.example`](infra/observability/.env.example). `infra/terraform` creates the monitoring host, and `infra/terraform/deploy.sh` configures and starts it.

<details>
<summary><b>Repository layout</b></summary>

```
apps/web/             Next.js app: dashboard, library, admin console, API routes
apps/extension/       Chrome extension (Vite + React, Manifest V3)
packages/cli/         hagit-cli on npm (Commander.js)
packages/mcp/         hagit-mcp on npm (Model Context Protocol server)
packages/coach-core/  Coach agent, habit tools, statistics, citations
packages/kb/          Knowledge base: parsing, chunking, embeddings, hybrid search, eval
packages/types/       Shared TypeScript types
content/kb/           Library articles (Markdown + frontmatter)
prisma/               Database schema and migrations
infra/observability/  Prometheus, Loki, Grafana (dashboards and alerts), Caddy, scheduler
infra/terraform/      AWS host for the monitoring stack
scripts/              Admin promotion, schedule setup, ER diagram
assets/               README images and editable Excalidraw diagrams
```
</details>

<details>
<summary><b>CLI commands</b></summary>

| Command | What it does |
|---|---|
| `hagit init` | Set up the local workspace (`~/.hagit`) |
| `hagit login -t <token>` | Sign in with your token from Settings |
| `hagit branch` · `-m <habit>` · `-d <habit>` | List, create or delete habits |
| `hagit checkout <habit>` | Switch the current habit |
| `hagit commit -m <message>` | Record a check-in locally |
| `hagit status` · `hagit log [-n N]` | Unpushed commits and history |
| `hagit push` · `hagit reset` | Sync commits, or discard unpushed ones |
| `hagit coach ["question"]` | Weekly review, or ask a question |
| `hagit telemetry [on\|off]` | Anonymous usage telemetry (timings and errors only) |

`HAGIT_API_URL` points the CLI at another server, for example `http://localhost:3000`.
</details>

<details>
<summary><b>Tests and quality checks</b></summary>

```bash
npm test -w hagit-frontend        # API, auth, rate limits, jobs, reports, coach formatting
npm test -w @hagit/coach-core     # agent loop, tools, statistics, citations
npm test -w @hagit/kb             # parsing, chunking, ranking
npm run kb:eval                   # retrieval quality on the golden set (needs a database)
```

CI runs typechecks, tests and a production build on every pull request. A second job applies migrations, runs integration tests on a pgvector database and fails if retrieval quality drops.
</details>

<details>
<summary><b>Releases</b></summary>

| Package | How to release |
|---|---|
| `hagit-cli` | bump `packages/cli/package.json`, push tag `v<version>` |
| `hagit-mcp` | bump `packages/mcp/package.json`, push tag `mcp-v<version>` |

Each tag checks the version, publishes to npm with provenance and creates a GitHub Release.
</details>

## License

MIT

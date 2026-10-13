# hagit-mcp

An [MCP](https://modelcontextprotocol.io) server for [haGIT](https://hagithub.vercel.app), the git-style habit tracker. It lets AI assistants such as Claude Code, Claude Desktop, Cursor and Gemini CLI read your habit stats, log check-ins, create habits and search haGIT's research-backed habit library.

## Tools

| Tool | What it does |
|---|---|
| `list_habits` | Habits with total check-ins and last activity |
| `get_habit_stats` | Streaks, consistency %, weekly trend, weekday and time-of-day patterns |
| `get_checkins` | Recent check-ins with their messages |
| `search_checkins` | Keyword search over check-in messages |
| `log_checkin` | Log a check-in for an existing habit (it never creates habits) |
| `create_habit` | Create a new habit (refuses duplicates, ignoring case) |
| `search_knowledge_base` | Search the habit library (passages tagged `KB<id>` with links) |

Statistics are computed by the same code that powers the haGIT web coach.

## Setup

1. Sign in at [hagithub.vercel.app](https://hagithub.vercel.app) and copy your token from **Settings → Account**.
2. Add the server to your client.

**Claude Code**

```bash
claude mcp add hagit -e HAGIT_TOKEN=<your-token> -- npx -y hagit-mcp
```

**Claude Desktop, Cursor, Gemini CLI** (any client with an `mcpServers` config)

```json
{
  "mcpServers": {
    "hagit": {
      "command": "npx",
      "args": ["-y", "hagit-mcp"],
      "env": { "HAGIT_TOKEN": "<your-token>" }
    }
  }
}
```

Then ask things like "how consistent was I with reading this month?", "log that I read 20 pages" or "what does the research say about missing a day?".

Already use the [haGIT CLI](https://www.npmjs.com/package/hagit-cli)? After `hagit login -t <token>` you can leave out `HAGIT_TOKEN`; the server reads the CLI's saved login from `~/.hagit/config.json`.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `HAGIT_TOKEN` | the CLI's saved token | Your haGIT API token |
| `HAGIT_API_URL` | `https://hagithub.vercel.app` | Another server, e.g. `http://localhost:3000` |
| `HAGIT_TZ` | the machine's timezone | Timezone for days and hours |

Tokens last 90 days. **Rotate** in Settings revokes the old one everywhere; paste the new one into your client config.

## Development

From the repository root:

```bash
npm run build -w hagit-mcp
npx @modelcontextprotocol/inspector node packages/mcp/dist/index.js
```

The server speaks MCP over stdio, so stdout is reserved for the protocol and logs go to stderr.

## License

MIT

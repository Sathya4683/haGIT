# hagit-mcp

An [MCP](https://modelcontextprotocol.io) server for [haGIT](https://github.com/Sathya4683/haGIT). AI assistants like Claude Code, Claude Desktop, Gemini CLI and Cursor can use it to read your habit stats, log check-ins and create habits.

## Tools

| Tool              | What it does                                                           |
| ----------------- | ---------------------------------------------------------------------- |
| `list_habits`     | Habits with total check-ins and last activity                          |
| `get_habit_stats` | Streaks, consistency %, weekly trend, weekday and time-of-day patterns |
| `get_checkins`    | Recent check-ins with their messages                                   |
| `search_checkins` | Keyword search over check-in messages                                  |
| `log_checkin`     | Log a check-in for an existing habit (it never creates habits)         |
| `create_habit`    | Create a new habit (refuses duplicates, ignoring case)                 |
| `search_knowledge_base` | Search haGIT's research-backed habit articles (passages tagged `KB<id>` with links) |

The stats are computed by the same code (`packages/coach-core`) that powers the haGIT web coach.

## Setup

1. Log in with the haGIT CLI. The server reuses the token saved in `~/.hagit/config.json`:

   ```
   hagit init
   hagit login -t <token>
   ```

2. Build the server (from the repo root):

   ```
   npm run build -w hagit-mcp
   ```

3. Register it with your client:

   ```
   claude mcp add hagit -- node /absolute/path/to/haGIT/packages/mcp/dist/index.js
   ```

   For clients that use an `mcpServers` config (Claude Desktop, Gemini CLI, Cursor):

   ```json
   {
     "mcpServers": {
       "hagit": {
         "command": "node",
         "args": ["/absolute/path/to/haGIT/packages/mcp/dist/index.js"]
       }
     }
   }
   ```

Then ask things like "how consistent was I with reading this month?" or "log that I read 20 pages".

## Configuration

| Variable        | Default                                   | Purpose                                         |
| --------------- | ----------------------------------------- | ----------------------------------------------- |
| `HAGIT_API_URL` | `apiUrl` from `~/.hagit/config.json`      | Point at another server, e.g. `http://localhost:3000` |
| `HAGIT_TZ`      | the machine's timezone                    | Timezone for days and hours                     |

## Development

The server talks MCP over stdio, so stdout is reserved for the protocol and logs go to stderr. To try the tools interactively:

```
npx @modelcontextprotocol/inspector node dist/index.js
```

## License

MIT

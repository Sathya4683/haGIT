// hagit-mcp: exposes the haGIT habit tools (packages/coach-core/src/tools.ts),
// including knowledge-base search, to any MCP client — Claude Code, Claude
// Desktop, Gemini CLI, Cursor…
//
// Runs over stdio: the client starts this process and speaks JSON-RPC on
// stdin/stdout. stdout belongs to the protocol, so log to stderr only.

import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { habitTools, runTool } from "@hagit/coach-core";
import { version } from "../package.json";
import { restHabitData, restKnowledgeBase } from "./rest-data";

// Days and hours are reported in this timezone. HAGIT_TZ overrides the machine's.
const tz = process.env.HAGIT_TZ || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const data = restHabitData();
const kb = restKnowledgeBase();

const server = new McpServer({ name: "hagit", version });

for (const tool of habitTools) {
    server.registerTool(
        tool.name,
        {
            title: tool.title,
            description: tool.description,
            inputSchema: tool.inputSchema,
            annotations: { readOnlyHint: tool.readOnly, destructiveHint: false, openWorldHint: false },
        },
        async (args) => {
            try {
                const result = await runTool(habitTools, tool.name, args, { data, tz, kb });
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            } catch (e) {
                // Tool errors go back to the model as a result it can read and act on.
                return { isError: true, content: [{ type: "text", text: (e as Error).message }] };
            }
        },
    );
}

await server.connect(new StdioServerTransport());
console.error(`hagit-mcp ${version} running on stdio (timezone ${tz})`);

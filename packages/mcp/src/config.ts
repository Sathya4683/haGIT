// Credentials, in order of precedence:
//   1. HAGIT_TOKEN (and optional HAGIT_API_URL) from the MCP client's config, so the server works
//      without the CLI installed.
//   2. The CLI's login: `hagit login -t <token>` writes ~/.hagit/config.json
//      (see packages/cli/lib/state.js).
// Read on every request so a re-login is picked up without restarting the MCP client.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_PATH = join(homedir(), ".hagit", "config.json");
const DEFAULT_API_URL = "https://hagithub.vercel.app";

export interface HagitConfig {
    token: string;
    apiUrl: string;
}

function readCliConfig(): { token?: string | null; apiUrl?: string } | null {
    try {
        return JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
    } catch {
        return null;
    }
}

export function loadConfig(): HagitConfig {
    const cli = readCliConfig();
    const token = process.env.HAGIT_TOKEN?.trim() || cli?.token;
    if (!token) {
        throw new Error(
            "Not connected to haGIT. Copy your token from Settings → Account on the haGIT website, then either set " +
                "HAGIT_TOKEN in this MCP server's config or run `hagit login -t <token>`.",
        );
    }

    // HAGIT_API_URL lets an MCP client config point at a local dev server.
    const apiUrl = process.env.HAGIT_API_URL || cli?.apiUrl || DEFAULT_API_URL;
    return { token, apiUrl: apiUrl.replace(/\/+$/, "") };
}

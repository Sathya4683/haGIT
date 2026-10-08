// Reuses the CLI's login: `hagit login -t <token>` writes ~/.hagit/config.json
// (see packages/cli/lib/state.js). Read on every request so a re-login is
// picked up without restarting the MCP client.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_PATH = join(homedir(), ".hagit", "config.json");
const DEFAULT_API_URL = "https://hagithub.vercel.app";

export interface HagitConfig {
    token: string;
    apiUrl: string;
}

export function loadConfig(): HagitConfig {
    let config: { token?: string | null; apiUrl?: string };
    try {
        config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
    } catch {
        throw new Error(`No haGIT config at ${CONFIG_PATH}. Run \`hagit init\` and \`hagit login -t <token>\` first.`);
    }
    if (!config.token) throw new Error("Not logged in to haGIT. Run `hagit login -t <token>` first.");

    // HAGIT_API_URL lets an MCP client config point at a local dev server.
    const apiUrl = process.env.HAGIT_API_URL || config.apiUrl || DEFAULT_API_URL;
    return { token: config.token, apiUrl: apiUrl.replace(/\/+$/, "") };
}

#!/usr/bin/env node
// Creates (or updates) the hourly Upstash QStash schedule that calls /api/jobs/tick.
//
//   npm run jobs:schedule            uses APP_URL and QSTASH_TOKEN (env or apps/web/.env)
//   npm run jobs:schedule -- --list  shows existing schedules
//
// Idempotent: the schedule has a fixed id, so running it again updates it in place.

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = join(root, "apps/web/.env");
if (existsSync(envFile) && typeof process.loadEnvFile === "function") process.loadEnvFile(envFile);

const SCHEDULE_ID = "hagit-tick";
const CRON = process.env.TICK_CRON || "5 * * * *";
const token = process.env.QSTASH_TOKEN;
const api = (process.env.QSTASH_URL || "https://qstash.upstash.io").replace(/\/+$/, "");
const appUrl = (process.env.APP_URL || "").replace(/\/+$/, "");

if (!token) {
    console.error("QSTASH_TOKEN is required (Upstash console → QStash → Request builder / tokens).");
    process.exit(1);
}

if (process.argv.includes("--list")) {
    const res = await fetch(`${api}/v2/schedules`, { headers: { Authorization: `Bearer ${token}` } });
    console.log(JSON.stringify(await res.json(), null, 2));
    process.exit(res.ok ? 0 : 1);
}

if (!appUrl.startsWith("https://")) {
    console.error(`APP_URL must be the public https URL of the deployment (got "${appUrl || "<empty>"}").`);
    process.exit(1);
}

const destination = `${appUrl}/api/jobs/tick`;
const res = await fetch(`${api}/v2/schedules/${destination}`, {
    method: "POST",
    headers: {
        Authorization: `Bearer ${token}`,
        "Upstash-Cron": CRON,
        "Upstash-Schedule-Id": SCHEDULE_ID,
        "Upstash-Method": "POST",
        "Upstash-Retries": "2",
        "Upstash-Timeout": "60s",
    },
});
const body = await res.text();
if (!res.ok) {
    console.error(`QStash responded ${res.status}: ${body}`);
    process.exit(1);
}
console.log(`Schedule "${SCHEDULE_ID}" → POST ${destination} on "${CRON}" (UTC). ${body}`);

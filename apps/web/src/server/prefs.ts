import { randomBytes } from "node:crypto";
import type { UserPreference } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const BASE32 = "abcdefghijklmnopqrstuvwxyz234567";

/** `<prefix>-<16 random base32 chars>` (80 bits): unguessable, so the topic itself is the secret. */
export function generateTopic(prefix = process.env.NTFY_TOPIC_PREFIX || "hagit") {
    const bytes = randomBytes(10);
    let bits = 0;
    let value = 0;
    let out = "";
    for (const byte of Array.from(bytes)) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            out += BASE32[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    return `${prefix.replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "hagit"}-${out}`;
}

export function ntfyServerUrl() {
    return (process.env.NTFY_BASE_URL || "https://ntfy.sh").replace(/\/+$/, "");
}

/** The server users subscribe to (may differ from the one the app publishes to, e.g. in Docker). */
export function ntfyPublicUrl() {
    return (process.env.NTFY_PUBLIC_URL || process.env.NTFY_BASE_URL || "https://ntfy.sh").replace(/\/+$/, "");
}

export function subscription(topic: string | null) {
    if (!topic) return null;
    const web = `${ntfyPublicUrl()}/${topic}`;
    const host = ntfyPublicUrl().replace(/^https?:\/\//, "");
    return { topic, webUrl: web, appUrl: `ntfy://${host}/${topic}` };
}

export async function getPreferences(userId: number): Promise<UserPreference> {
    return prisma.userPreference.upsert({ where: { userId }, create: { userId }, update: {} });
}

export function serializePreferences(p: UserPreference) {
    return {
        timezone: p.timezone,
        palette: p.palette,
        nudgeEnabled: p.nudgeEnabled,
        nudgeHour: p.nudgeHour,
        weeklyReportEnabled: p.weeklyReportEnabled,
        ntfy: subscription(p.ntfyTopic),
    };
}

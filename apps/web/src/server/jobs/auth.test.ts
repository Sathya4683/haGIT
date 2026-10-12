import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { isAuthorizedScheduler } from "./auth";

const CURRENT = "sig_current_key_for_tests";
const NEXT = "sig_next_key_for_tests";

function qstashSignature(body: string, key: string) {
    const bodyHash = createHash("sha256").update(body).digest("base64url");
    const now = Math.floor(Date.now() / 1000);
    return jwt.sign({ iss: "Upstash", sub: "https://hagit.test/api/jobs/tick", body: bodyHash, nbf: now - 5, exp: now + 300 }, key, {
        algorithm: "HS256",
    });
}

const request = (headers: Record<string, string>) => new Request("https://hagit.test/api/jobs/tick", { method: "POST", headers });

describe("isAuthorizedScheduler", () => {
    beforeEach(() => {
        process.env.CRON_SECRET = "cron-secret";
        process.env.QSTASH_CURRENT_SIGNING_KEY = CURRENT;
        process.env.QSTASH_NEXT_SIGNING_KEY = NEXT;
    });
    afterEach(() => {
        delete process.env.CRON_SECRET;
        delete process.env.QSTASH_CURRENT_SIGNING_KEY;
        delete process.env.QSTASH_NEXT_SIGNING_KEY;
    });

    it("accepts the cron secret and rejects anything else", async () => {
        expect(await isAuthorizedScheduler(request({ authorization: "Bearer cron-secret" }), "")).toBe(true);
        expect(await isAuthorizedScheduler(request({ authorization: "Bearer nope" }), "")).toBe(false);
        expect(await isAuthorizedScheduler(request({}), "")).toBe(false);
    });

    it("verifies QStash signatures made with either signing key", async () => {
        expect(await isAuthorizedScheduler(request({ "upstash-signature": qstashSignature("", CURRENT) }), "")).toBe(true);
        expect(await isAuthorizedScheduler(request({ "upstash-signature": qstashSignature("", NEXT) }), "")).toBe(true);
    });

    it("rejects signatures with the wrong key or a tampered body", async () => {
        expect(await isAuthorizedScheduler(request({ "upstash-signature": qstashSignature("", "other") }), "")).toBe(false);
        expect(await isAuthorizedScheduler(request({ "upstash-signature": qstashSignature("a", CURRENT) }), "b")).toBe(false);
    });
});

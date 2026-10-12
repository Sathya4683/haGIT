import { describe, expect, it } from "vitest";
import { generateTopic, subscription } from "./prefs";

describe("ntfy topics", () => {
    it("generates unguessable, URL-safe topics", () => {
        const a = generateTopic("hagit");
        const b = generateTopic("hagit");
        expect(a).toMatch(/^hagit-[a-z2-7]{16}$/);
        expect(a).not.toBe(b);
        expect(generateTopic("Ha Git!")).toMatch(/^hagit-/);
    });

    it("builds web and app subscription links", () => {
        process.env.NTFY_BASE_URL = "https://ntfy.sh/";
        delete process.env.NTFY_PUBLIC_URL;
        expect(subscription("hagit-abc")).toEqual({
            topic: "hagit-abc",
            webUrl: "https://ntfy.sh/hagit-abc",
            appUrl: "ntfy://ntfy.sh/hagit-abc",
        });
        expect(subscription(null)).toBeNull();
    });
});

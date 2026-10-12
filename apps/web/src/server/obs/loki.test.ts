import { describe, expect, it } from "vitest";
import { toPushBody } from "./loki";

describe("toPushBody", () => {
    it("groups lines into one stream per label set", () => {
        const a = { service: "hagit-web", level: "info" };
        const b = { service: "hagit-web", level: "error" };
        const body = toPushBody([
            { labels: a, tsNs: "1", line: "x" },
            { labels: b, tsNs: "2", line: "y" },
            { labels: a, tsNs: "3", line: "z" },
        ]);
        expect(body.streams).toEqual([
            { stream: a, values: [["1", "x"], ["3", "z"]] },
            { stream: b, values: [["2", "y"]] },
        ]);
    });
});

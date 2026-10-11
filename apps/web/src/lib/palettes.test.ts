import { describe, expect, it } from "vitest";
import { getPalette, hexToRgb, paletteCss, PALETTES, rgbToHex } from "./palettes";

describe("palettes", () => {
    it("converts colours both ways", () => {
        expect(hexToRgb("#22c55e")).toBe("34 197 94");
        expect(rgbToHex("34 197 94")).toBe("#22c55e");
    });

    it("defines a full brand scale for every palette", () => {
        for (const p of PALETTES) expect(Object.keys(p.brand)).toHaveLength(10);
        expect(new Set(PALETTES.map((p) => p.id)).size).toBe(PALETTES.length);
    });

    it("falls back to the default palette", () => {
        expect(getPalette("nope").id).toBe("classic");
        expect(getPalette(undefined).id).toBe("classic");
    });

    it("emits light and dark rules for each palette", () => {
        const css = paletteCss();
        expect(css).toContain(":root{--brand-50:240 253 244;");
        for (const p of PALETTES.slice(1)) {
            expect(css).toContain(`[data-palette="${p.id}"]{`);
            expect(css).toContain(`.dark[data-palette="${p.id}"]{`);
        }
        expect(css).toContain('[data-palette="nord"]{--brand-50');
        expect(css).toMatch(/\[data-palette="nord"\]\{[^}]*--paper:236 239 244;/);
    });
});

import { afterEach, describe, expect, it } from "vitest";
import { can, isAdminHost, isRole } from "./permissions";

describe("permissions", () => {
    afterEach(() => {
        delete process.env.ADMIN_HOST;
    });

    it("grants editors content access only", () => {
        expect(can("EDITOR", "admin:access")).toBe(true);
        expect(can("EDITOR", "kb:write")).toBe(true);
        expect(can("EDITOR", "users:manage")).toBe(false);
        expect(can("EDITOR", "ops:view")).toBe(false);
    });

    it("grants admins everything and users nothing", () => {
        expect(can("ADMIN", "users:manage")).toBe(true);
        expect(can("USER", "admin:access")).toBe(false);
        expect(can(null, "admin:access")).toBe(false);
    });

    it("validates role names", () => {
        expect(isRole("ADMIN")).toBe(true);
        expect(isRole("admin")).toBe(false);
        expect(isRole(undefined)).toBe(false);
    });

    it("matches the admin host case-insensitively", () => {
        process.env.ADMIN_HOST = "hagithub-admin.vercel.app";
        expect(isAdminHost("HaGitHub-Admin.vercel.app")).toBe(true);
        expect(isAdminHost("hagithub.vercel.app")).toBe(false);
        delete process.env.ADMIN_HOST;
        expect(isAdminHost("hagithub-admin.vercel.app")).toBe(false);
    });
});

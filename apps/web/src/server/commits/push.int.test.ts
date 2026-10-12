// Integration test against a real Postgres. Runs only when TEST_DATABASE_URL is set, e.g.
//   TEST_DATABASE_URL=postgresql://hagit:hagit@localhost:5434/hagit npx vitest run push.int
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("pushCommits (database)", () => {
    let prisma: typeof import("@/lib/prisma").prisma;
    let pushCommits: typeof import("./push").pushCommits;
    let userId: number;

    beforeAll(async () => {
        process.env.DATABASE_URL = url;
        ({ prisma } = await import("@/lib/prisma"));
        ({ pushCommits } = await import("./push"));
        const user = await prisma.user.create({ data: { email: `push-${Date.now()}@test.local` } });
        userId = user.id;
    });

    afterAll(async () => {
        await prisma.user.delete({ where: { id: userId } });
        await prisma.$disconnect();
    });

    it("creates missing habits and stores the batch", async () => {
        const result = await pushCommits(userId, [
            { habitName: "Reading", message: "20 pages", clientId: "c1" },
            { habitName: "Gym", message: "legs", clientId: "c2" },
        ]);
        expect(result.created).toBe(2);
        expect(await prisma.habit.count({ where: { userId } })).toBe(2);
    });

    it("does not duplicate a retried push", async () => {
        const result = await pushCommits(userId, [
            { habitName: "Reading", message: "20 pages", clientId: "c1" },
            { habitName: "Reading", message: "10 more", clientId: "c3" },
        ]);
        expect(result.created).toBe(1);
        expect(result.duplicates).toBe(1);
        expect(result.commits).toHaveLength(2);
        expect(await prisma.commit.count({ where: { userId } })).toBe(3);
    });

    it("handles concurrent pushes that create the same habit", async () => {
        await Promise.all([
            pushCommits(userId, [{ habitName: "Meditate", message: "a" }]),
            pushCommits(userId, [{ habitName: "Meditate", message: "b" }]),
        ]);
        expect(await prisma.habit.count({ where: { userId, name: "Meditate" } })).toBe(1);
        expect(await prisma.commit.count({ where: { userId, habit: { name: "Meditate" } } })).toBe(2);
    });
});

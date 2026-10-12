#!/usr/bin/env node
// Grants a console role to an existing account. Run once against the target database:
//
//   DATABASE_URL=postgresql://... npm run admin:promote -- you@example.com [ADMIN|EDITOR|USER]
//
// Roles are deliberately never granted from environment variables: password signups are not
// email-verified, so an email allow-list would let anyone claim an admin address first.

import { PrismaClient } from "@prisma/client";

const [, , rawEmail, rawRole = "ADMIN"] = process.argv;
const role = rawRole.toUpperCase();

if (!rawEmail || !["ADMIN", "EDITOR", "USER"].includes(role)) {
    console.error("Usage: npm run admin:promote -- <email> [ADMIN|EDITOR|USER]");
    process.exit(1);
}

const email = rawEmail.trim().toLowerCase();
const prisma = new PrismaClient();

try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        console.error(`No account with email ${email}. Sign up first, then run this again.`);
        process.exitCode = 1;
    } else {
        await prisma.user.update({ where: { id: user.id }, data: { role } });
        await prisma.auditLog.create({
            data: { actorId: null, action: "user.role_changed", target: email, meta: { from: user.role, to: role, via: "cli" } },
        });
        console.log(`${email}: ${user.role} → ${role}`);
    }
} finally {
    await prisma.$disconnect();
}

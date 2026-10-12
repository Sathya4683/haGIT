import { z } from "zod";
import { isValidTimezone } from "@/lib/datetime";

const MAX_FUTURE_MS = 24 * 60 * 60 * 1000;

export const habitName = z
    .string({ error: "Habit name is required." })
    .trim()
    .min(1, "Habit name is required.")
    .max(50, "Habit names can be at most 50 characters.");

export const commitMessage = z
    .string({ error: "Commit message is required." })
    .trim()
    .min(1, "Commit message is required.")
    .max(500, "Commit messages can be at most 500 characters.");

/** ISO timestamp, at most one day in the future (clock skew tolerance). */
export const commitTimestamp = z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), "timestamp must be an ISO date.")
    .refine((s) => Date.parse(s) <= Date.now() + MAX_FUTURE_MS, "timestamp cannot be in the future.")
    .transform((s) => new Date(s));

export const clientId = z
    .string()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/, "clientId may only contain letters, digits, '-' and '_'.");

export const email = z
    .string({ error: "Email and password are required." })
    .trim()
    .toLowerCase()
    .min(1, "Email and password are required.")
    .max(254)
    .email("Enter a valid email address.");

export const timezone = z
    .string()
    .optional()
    .transform((tz) => (tz && isValidTimezone(tz) ? tz : "UTC"));

export const idParam = z.coerce.number().int().positive();

export const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD.");

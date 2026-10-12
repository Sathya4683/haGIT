import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
export const contentDir = path.join(repoRoot, "content", "kb");

// Scripts run from the repo root; the model lives with the web app.
process.env.KB_MODEL_DIR ??= path.join(repoRoot, "apps", "web", "models");

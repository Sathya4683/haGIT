// Bundles the server into dist/index.js. @hagit/coach-core is a private
// workspace package, so it can't be an npm dependency — it gets compiled into
// the bundle. Real npm dependencies stay external.
import { readFileSync } from "node:fs";
import { build } from "esbuild";

const { dependencies } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

await build({
    entryPoints: ["src/index.ts"],
    outfile: "dist/index.js",
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    banner: { js: "#!/usr/bin/env node" },
    external: Object.keys(dependencies).flatMap((dep) => [dep, `${dep}/*`]),
});

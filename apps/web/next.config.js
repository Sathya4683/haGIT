/** @type {import('next').NextConfig} */

// Local embeddings ship the ONNX runtime and the bge-small model with the functions that
// search the knowledge base. Only the Linux x64 CPU runtime is needed on Vercel; the CUDA,
// TensorRT and other-platform binaries alone exceed the function size limit. (sharp stays:
// transformers.js imports it at load time.) With
// EMBEDDINGS_PROVIDER=cloudflare none of this is bundled.
const localEmbeddings = process.env.EMBEDDINGS_PROVIDER !== "cloudflare";

// Exclude globs are resolved against this directory; dependencies are hoisted to the repo root.
const fromNodeModules = (paths) => paths.flatMap((p) => [`node_modules/${p}`, `../../node_modules/${p}`]);

const embeddingRoutes = ["/api/coach", "/api/kb/**", "/api/admin/kb/**", "/api/jobs/**", "/api/reports/**"];

const onnxExcludes = fromNodeModules([
    "onnxruntime-node/bin/napi-v3/darwin/**",
    "onnxruntime-node/bin/napi-v3/win32/**",
    "onnxruntime-node/bin/napi-v3/linux/arm64/**",
    "onnxruntime-node/bin/napi-v3/linux/x64/libonnxruntime_providers_cuda.so",
    "onnxruntime-node/bin/napi-v3/linux/x64/libonnxruntime_providers_tensorrt.so",
    // The binding links against libonnxruntime.so.1; the versioned file is an unneeded copy.
    "onnxruntime-node/bin/napi-v3/linux/x64/libonnxruntime.so.1.*",
    // Vercel runs glibc; the musl builds of sharp are never loaded.
    "@img/sharp-linuxmusl-x64/**",
    "@img/sharp-libvips-linuxmusl-x64/**",
    "onnxruntime-web/**",
    "@huggingface/transformers/dist/*.web*",
    "@huggingface/transformers/dist/*.wasm",
    "@huggingface/transformers/dist/*.map",
    "@huggingface/transformers/dist/transformers.js",
    "@huggingface/transformers/dist/transformers.min.js",
]);

const allEmbeddingPackages = fromNodeModules([
    "onnxruntime-node/**",
    "onnxruntime-web/**",
    "onnxruntime-common/**",
    "@huggingface/transformers/**",
    "sharp/**",
    "@img/**",
]);

const nextConfig = {
    reactStrictMode: true,
    // Workspace packages shipped as TypeScript source.
    transpilePackages: ["@hagit/coach-core", "@hagit/kb"],
    experimental: {
        serverComponentsExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "sharp", "@react-pdf/renderer"],
        // Monorepo: trace dependencies from the repository root (hoisted node_modules).
        outputFileTracingRoot: require("node:path").join(__dirname, "../../"),
        outputFileTracingIncludes: localEmbeddings
            ? Object.fromEntries(embeddingRoutes.map((route) => [route, ["./models/**/*"]]))
            : {},
        outputFileTracingExcludes: {
            "*": localEmbeddings ? onnxExcludes : allEmbeddingPackages,
        },
    },
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace package shipped as TypeScript source (like @hagit/types).
  transpilePackages: ["@hagit/coach-core"],
};

module.exports = nextConfig;

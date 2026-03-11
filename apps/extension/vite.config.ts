import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, mkdirSync, existsSync } from "fs";

export default defineConfig({
  plugins: [
    react(),
    {
      // After build: copy manifest + icons into dist
      name: "copy-extension-assets",
      closeBundle() {
        // manifest
        copyFileSync("manifest.json", "dist/manifest.json");

        // icons dir
        if (!existsSync("dist/icons")) mkdirSync("dist/icons", { recursive: true });
        const sizes = [16, 32, 48, 128];
        sizes.forEach((s) => {
          const src = `public/icons/icon${s}.png`;
          const dst = `dist/icons/icon${s}.png`;
          if (existsSync(src)) copyFileSync(src, dst);
        });
      },
    },
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
        background: resolve(__dirname, "src/background.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
});

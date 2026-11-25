import { copyFileSync } from "node:fs"
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import type { Plugin } from "vite"
import { defineConfig } from "vitest/config"

/** Project site: https://benjhongyang-art.github.io/tingshuo-english/ */
const pagesBase = "/tingshuo-english/"

/** GitHub Pages serves this file for unknown paths, so client routes survive a refresh. */
function githubPagesSpaFallback(): Plugin {
  return {
    name: "github-pages-spa-fallback",
    apply: "build",
    closeBundle() {
      const distDir = path.resolve(import.meta.dirname, "dist")
      copyFileSync(path.join(distDir, "index.html"), path.join(distDir, "404.html"))
    },
  }
}

export default defineConfig({
  base: pagesBase,
  plugins: [react(), tailwindcss(), githubPagesSpaFallback()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  server: {
    host: "0.0.0.0",
    port: 43127,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 43127,
    strictPort: true,
  },
})

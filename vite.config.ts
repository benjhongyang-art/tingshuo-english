import { copyFileSync } from "node:fs"
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"
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
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["favicon.svg", "reminder-sw.js", "icons/*.png"],
      manifest: {
        id: pagesBase,
        name: "聽說",
        short_name: "聽說",
        description: "給繁體中文使用者的英文聽力、發音、閱讀與單字練習。進度留在這台裝置。",
        lang: "zh-Hant",
        dir: "ltr",
        start_url: pagesBase,
        scope: pagesBase,
        display: "standalone",
        background_color: "#f4efe6",
        theme_color: "#f4efe6",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        navigateFallback: "index.html",
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,webmanifest,ico}"],
        importScripts: ["reminder-sw.js"],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
    githubPagesSpaFallback(),
  ],
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

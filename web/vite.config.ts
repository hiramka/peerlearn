import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: { proxy: { "/api": "http://localhost:3001" } },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: true },
      workbox: { globPatterns: ["**/*.{js,css,html,svg}"] }, // app shell works offline
      manifest: {
        name: "PeerLearn", short_name: "PeerLearn", display: "standalone",
        theme_color: "#14233c", background_color: "#f3f7fb",
        icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
      },
    }),
  ],
});

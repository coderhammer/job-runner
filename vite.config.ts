import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// root = client/ (index.html + src/ y vivent). Build vers ../dist/client (à côté
// du serveur compilé par tsc dans dist/), pour être livré dans le paquet npm et
// servi statiquement par Express (src/server.ts, join(__dirname, "client")).
export default defineConfig({
  root: "client",
  build: {
    outDir: fileURLToPath(new URL("./dist/client", import.meta.url)),
    emptyOutDir: true,
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./client/src", import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
    // Sandbox de dev derrière un proxy à hostname généré dynamiquement
    // (*.spunto.net) — Vite bloque par défaut tout Host inconnu (protection
    // DNS rebinding). Pas d'exposition publique au-delà du proxy du sandbox.
    allowedHosts: true,
  },
});

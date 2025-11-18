import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const serverHost = process.env.VITE_HOST || "0.0.0.0";
const serverPort = Number(process.env.VITE_PORT || 5001);
const previewPort = Number(process.env.VITE_PREVIEW_PORT || serverPort);
const apiTarget = process.env.VITE_API_URL || "http://localhost:5003";
const allowedHosts = (process.env.VITE_ALLOWED_HOSTS || "mc.tuppdev.futf.se,mc2.tuppdev.futf.se")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: serverHost,
    port: serverPort,
    strictPort: true,
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
      },
    },
    allowedHosts,
  },
  preview: {
    host: serverHost,
    port: previewPort,
    strictPort: true,
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

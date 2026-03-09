import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/", // subpath varsa burayı değiştir
  server: {
    host: true,
    port: 5173,
    allowedHosts: ["heptabot.heptapusgroup.com", "sponsorbot.heptapusgroup.com"]
  }
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const base = process.env.BASE_PATH || "/";

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    watch: {
      ignored: ["**/src-tauri/target/**", "**/src-tauri/gen/**"],
    },
  },
});

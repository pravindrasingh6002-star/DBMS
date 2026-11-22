import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Any request from the React app that starts with /api is forwarded
// to the Express server, so the frontend never needs to know its address.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:5000" },
  },
});

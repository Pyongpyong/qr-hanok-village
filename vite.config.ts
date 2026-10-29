import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import demoConfig from "./vite.demo.config";
export default defineConfig(({ command }) =>
  command === "serve"
    ? demoConfig
    : {
        plugins: [react()],
        build: {
          lib: { entry: "src/index.ts", formats: ["es"], fileName: "index" },
          rollupOptions: {
            external: (id) =>
              /^(react|react-dom|three|@react-three\/fiber|qrcode)(\/|$)/.test(
                id,
              ),
          },
        },
      },
);

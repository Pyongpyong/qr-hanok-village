import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { createRequire } from "node:module";
import { readFileSync, createReadStream } from "node:fs";
import { dirname, join } from "node:path";
const require = createRequire(import.meta.url);
function encoderAssets(): Plugin {
  const core = dirname(require.resolve("@ffmpeg/core"));
  const esm = join(core, "..", "esm");
  const assets: Record<string, string> = {
    "ffmpeg-core.js": join(esm, "ffmpeg-core.js"),
    "ffmpeg-core.wasm": join(esm, "ffmpeg-core.wasm"),
    "NOTICE.txt": join(import.meta.dirname, "demo/export/NOTICE.txt"),
    "MIT.ffmpeg.txt": join(import.meta.dirname, "demo/export/MIT.ffmpeg.txt"),
    "GPL-2.0.txt": join(import.meta.dirname, "demo/export/GPL-2.0.txt"),
  };
  return {
    name: "demo-encoder-assets",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = (req.url ?? "").split("?")[0].replace(/^\/encoder\//, "");
        if (!req.url?.startsWith("/encoder/") || !assets[name]) return next();
        res.setHeader(
          "Content-Type",
          name.endsWith(".wasm")
            ? "application/wasm"
            : name.endsWith(".js")
              ? "text/javascript"
              : "text/plain; charset=utf-8",
        );
        const stream = createReadStream(assets[name]);
        stream.on("error", next);
        stream.pipe(res);
      });
    },
    generateBundle() {
      for (const [name, path] of Object.entries(assets))
        this.emitFile({
          type: "asset",
          fileName: `encoder/${name}`,
          source: readFileSync(path),
        });
    },
  };
}
export default defineConfig({
  plugins: [react(), encoderAssets()],
  optimizeDeps: { exclude: ["@ffmpeg/ffmpeg"] },
  worker: { format: "es" },
  build: { outDir: "demo-dist" },
});

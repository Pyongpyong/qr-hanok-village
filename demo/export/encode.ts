import { FFmpeg } from "@ffmpeg/ffmpeg";
import { generateVillage } from "../../src/utils/villageGenerator";
import { createCapture, pngFrame, type ExportScene } from "./capture";
import {
  cinematicFrame,
  dimensions,
  encodingArgs,
  validateOptions,
  type ExportOptions,
} from "./plan";
export interface ExportProgress {
  stage: "loading" | "rendering" | "encoding";
  progress: number;
  frame?: number;
  total?: number;
}
export async function exportVillage(
  scene: ExportScene,
  options: ExportOptions,
  onProgress: (progress: ExportProgress) => void,
  signal: AbortSignal,
): Promise<Blob> {
  validateOptions(options);
  generateVillage(scene.value, scene.seed);
  signal.throwIfAborted();
  const ffmpeg = new FFmpeg();
  let capture: Awaited<ReturnType<typeof createCapture>> | undefined;
  const cancel = () => ffmpeg.terminate();
  signal.addEventListener("abort", cancel, { once: true });
  try {
    onProgress({ stage: "loading", progress: 0 });
    const base = new URL(
      `${import.meta.env.BASE_URL}encoder/`,
      window.location.href,
    );
    await ffmpeg.load({
      coreURL: new URL("ffmpeg-core.js", base).href,
      wasmURL: new URL("ffmpeg-core.wasm", base).href,
    });
    signal.throwIfAborted();
    const { width, height } = dimensions(options.aspect, options.resolution);
    capture = await createCapture(scene, width, height, signal);
    const count = Math.round(options.duration * options.fps);
    for (let index = 0; index < count; index++) {
      signal.throwIfAborted();
      capture.render(cinematicFrame(index, count, { ...options, transitionDuration: scene.transitionDuration }));
      const bytes = await pngFrame(capture.canvas);
      signal.throwIfAborted();
      await ffmpeg.writeFile(
        `frame${String(index).padStart(5, "0")}.png`,
        bytes,
      );
      onProgress({
        stage: "rendering",
        progress: ((index + 1) / count) * 0.7,
        frame: index + 1,
        total: count,
      });
    }
    capture.dispose();
    capture = undefined;
    signal.throwIfAborted();
    onProgress({ stage: "encoding", progress: 0.7 });
    let progress = 0.7;
    ffmpeg.on("progress", (event) => {
      progress = Math.max(
        progress,
        Math.min(0.99, 0.7 + event.progress * 0.29),
      );
      onProgress({ stage: "encoding", progress });
    });
    const code = await ffmpeg.exec(encodingArgs(options.format, options.fps));
    signal.throwIfAborted();
    if (code !== 0)
      throw new Error("Encoding failed. Try a lower resolution or frame rate.");
    const data = await ffmpeg.readFile(`output.${options.format}`);
    signal.throwIfAborted();
    if (typeof data === "string")
      throw new Error("The encoder returned an invalid file.");
    const bytes = new Uint8Array(data.byteLength);
    bytes.set(data);
    return new Blob([bytes.buffer], {
      type:
        options.format === "mp4"
          ? "video/mp4"
          : options.format === "gif"
            ? "image/gif"
            : "image/apng",
    });
  } catch (error) {
    if (signal.aborted)
      throw new DOMException("Export cancelled", "AbortError");
    throw error;
  } finally {
    capture?.dispose();
    signal.removeEventListener("abort", cancel);
    ffmpeg.terminate();
  }
}

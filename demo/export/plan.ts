import { transitionFrame } from "../../src/utils/transition";
import type { CaptureFrame } from "../../src/scene/CaptureContext";
export type ExportFormat = "mp4" | "gif" | "apng";
export type ExportAspect = "square" | "portrait" | "landscape";
export type ExportLighting = "day" | "night" | "cycle";
export interface ExportOptions {
  format: ExportFormat;
  aspect: ExportAspect;
  resolution: 540 | 1080;
  duration: number;
  fps: number;
  lighting: ExportLighting;
  transitionDuration?: number;
  rotate?: boolean;
  /** Rotation relative to the starting village angle, in degrees. */
  rotationDegrees?: number;
  /** Additional village magnification, as a percentage of its starting zoom. */
  zoomPercent?: number;
}
export function dimensions(aspect: ExportAspect, resolution: number) {
  const long = Math.round((resolution * 16) / 9 / 2) * 2;
  return aspect === "square"
    ? { width: resolution, height: resolution }
    : aspect === "portrait"
      ? { width: resolution, height: long }
      : { width: long, height: resolution };
}
export function validateOptions(options: ExportOptions) {
  if (
    !["mp4", "gif", "apng"].includes(options.format) ||
    !["square", "portrait", "landscape"].includes(options.aspect) ||
    !["day", "night", "cycle"].includes(options.lighting)
  )
    throw new Error("Choose a supported export format and layout.");
  if (
    ![540, 1080].includes(options.resolution) ||
    !Number.isFinite(options.duration) ||
    options.duration < 4 ||
    options.duration > 30 ||
    ![12, 15, 24, 30].includes(options.fps)
  )
    throw new Error(
      "Choose a duration of 4–30 seconds and a supported quality.",
    );
  if (!Number.isFinite(options.zoomPercent ?? 35) || (options.zoomPercent ?? 35) < 0 || (options.zoomPercent ?? 35) > 200)
    throw new Error("Choose a zoom-in amount between 0% and 200%.");
  if (options.rotate && (
    !Number.isFinite(options.rotationDegrees ?? 90) ||
    Math.abs(options.rotationDegrees ?? 90) > 360
  )) throw new Error("Choose a final rotation angle between −360° and 360°.");
  if (
    options.format !== "mp4" &&
    (options.resolution > 540 || options.fps > 15)
  )
    throw new Error("GIF and APNG support up to 540p and 15 FPS.");
}
const ease = (n: number) => {
  const t = Math.max(0, Math.min(1, n));
  return t * t * (3 - 2 * t);
};
/** Start moving immediately, using the demo transition duration in milliseconds. */
export function cinematicFrame(index: number, count: number, options: ExportOptions): CaptureFrame {
  const time = index / options.fps;
  const end = Math.max(0, (count - 1) / options.fps);
  const requested = options.transitionDuration ?? 1400;
  const duration = Number.isFinite(requested) ? Math.max(0, requested) / 1000 : 1.4;
  const travel = Math.min(duration, end / 2);
  const returningAt = end - travel;
  let camera = 1, reveal = 1, zoom = 1, residents = true;
  const zoomAmount = (options.zoomPercent ?? 35) / 100;
  let yaw = 0;
  const finalYaw = options.rotate ? (options.rotationDegrees ?? 90) * Math.PI / 180 : 0;
  let daylight = options.lighting === "night" ? 0 : 1;
  if (time < travel) {
    const frame = transitionFrame("village", time * 1000, travel * 1000);
    camera = frame.camera; reveal = frame.reveal; residents = false;
  } else if (time < returningAt) {
    const t = (time - travel) / Math.max(1 / options.fps, returningAt - travel);
    zoom = 1 + zoomAmount * t;
    yaw = finalYaw * ease(t);
    if (options.lighting === "cycle") daylight = (Math.cos(t * Math.PI * 2) + 1) / 2;
  } else {
    const t = travel === 0 ? 1 : (time - returningAt) / travel;
    const frame = transitionFrame("qr", (time - returningAt) * 1000, travel * 1000);
    camera = frame.camera; reveal = frame.reveal;
    zoom = 1 + zoomAmount * (1 - ease(t)); residents = false;
    yaw = finalYaw * (1 - ease(t));
  }
  return { time, camera, reveal, yaw: yaw || 0, zoom, daylight, residents };
}
export function encodingArgs(format: ExportFormat, fps: number) {
  const input = ["-framerate", String(fps), "-i", "frame%05d.png"];
  if (format === "mp4")
    return [
      ...input,
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      "22",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      "output.mp4",
    ];
  if (format === "gif")
    return [
      ...input,
      "-filter_complex",
      "[0:v]split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3",
      "-loop",
      "0",
      "output.gif",
    ];
  return [...input, "-plays", "0", "-f", "apng", "output.apng"];
}

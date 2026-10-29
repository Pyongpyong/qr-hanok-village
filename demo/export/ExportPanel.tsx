import { useEffect, useRef, useState } from "react";
import type { ExportScene } from "./capture";
import { dimensions, type ExportOptions, type ExportFormat } from "./plan";
import type { ExportProgress } from "./encode";
interface Result {
  url: string;
  name: string;
  size: number;
  format: ExportFormat;
  width: number;
  height: number;
}
export default function ExportPanel({ scene }: { scene: ExportScene }) {
  const [options, setOptions] = useState<ExportOptions>({
    format: "mp4",
    aspect: "square",
    resolution: 540,
    duration: 8,
    fps: 24,
    lighting: "day",
    rotate: false,
    rotationDegrees: 90,
    zoomPercent: 35,
  });
  const [progress, setProgress] = useState<ExportProgress | null>(null),
    [result, setResult] = useState<Result | null>(null),
    [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(
    () => () => {
      if (result) URL.revokeObjectURL(result.url);
    },
    [result],
  );
  const busy = progress !== null,
    animated = options.format !== "mp4";
  function changeFormat(format: ExportFormat) {
    setOptions((o) => ({
      ...o,
      format,
      resolution: format === "mp4" ? o.resolution : 540,
      fps: format === "mp4" ? 24 : 15,
    }));
  }
  async function start() {
    if (controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    setError("");
    setProgress({ stage: "loading", progress: 0 });
    try {
      const { exportVillage } = await import("./encode");
      abort.signal.throwIfAborted();
      const blob = await exportVillage(
        { ...scene },
        options,
        (p) => {
          if (
            mounted.current &&
            !abort.signal.aborted &&
            controller.current === abort
          )
            setProgress(p);
        },
        abort.signal,
      );
      if (!mounted.current || abort.signal.aborted) return;
      const { width, height } = dimensions(options.aspect, options.resolution);
      setResult({
        url: URL.createObjectURL(blob),
        name: `hanok-village-${width}x${height}.${options.format}`,
        size: blob.size,
        format: options.format,
        width,
        height,
      });
    } catch (cause) {
      if (mounted.current && !abort.signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not export this scene.",
        );
    } finally {
      if (controller.current === abort) controller.current = null;
      if (mounted.current) setProgress(null);
    }
  }
  const status =
    progress?.stage === "loading"
      ? "Preparing exporter…"
      : progress?.stage === "rendering"
        ? `Rendering frame ${progress.frame} / ${progress.total}`
        : "Encoding your loop…";
  return (
    <section className="export-panel" aria-labelledby="export-title">
      <div className="export-intro">
        <div className="eyebrow">TAKE THE VILLAGE WITH YOU</div>
        <h2 id="export-title">A little world. On repeat.</h2>
        <p>
          Save a QR → village → slow zoom → QR loop for your next post.
        </p>
        <p className="export-note">
          Files are created in your browser. The encoder (~32 MB) loads on first
          use. MP4 supports 1080p; GIF and APNG support 540p. Uses the current camera zoom and transition speed.
        </p>
      </div>
      <div className="export-settings">
        <fieldset disabled={busy} className="export-fields">
          <legend className="sr-only">Export settings</legend>
          <label>
            FORMAT
            <select
              aria-label="Export format"
              value={options.format}
              onChange={(e) => changeFormat(e.target.value as ExportFormat)}
            >
              <option value="mp4">MP4 video</option>
              <option value="gif">GIF animation</option>
              <option value="apng">APNG animation</option>
            </select>
          </label>
          <label>
            LAYOUT
            <select
              aria-label="Export layout"
              value={options.aspect}
              onChange={(e) =>
                setOptions((o) => ({
                  ...o,
                  aspect: e.target.value as ExportOptions["aspect"],
                }))
              }
            >
              <option value="square">Square · 1:1</option>
              <option value="portrait">Portrait · 9:16</option>
              <option value="landscape">Landscape · 16:9</option>
            </select>
          </label>
          <label>
            RESOLUTION
            <select
              aria-label="Export resolution"
              value={options.resolution}
              onChange={(e) =>
                setOptions((o) => ({
                  ...o,
                  resolution: +e.target.value as 540 | 1080,
                }))
              }
            >
              <option value="540">540p</option>
              <option value="1080" disabled={animated}>
                1080p · MP4
              </option>
            </select>
          </label>
          <label>
            DURATION
            <select
              aria-label="Export duration"
              value={options.duration}
              onChange={(e) =>
                setOptions((o) => ({ ...o, duration: +e.target.value }))
              }
            >
              {[4, 6, 8, 10, 12, 15, 20, 30].map((n) => (
                <option key={n} value={n}>
                  {n} seconds
                </option>
              ))}
            </select>
          </label>
          <label>
            FRAME RATE
            <select
              aria-label="Export frame rate"
              value={options.fps}
              onChange={(e) =>
                setOptions((o) => ({ ...o, fps: +e.target.value }))
              }
            >
              {[12, 15, 24, 30].map((n) => (
                <option key={n} value={n} disabled={animated && n > 15}>
                  {n} FPS
                </option>
              ))}
            </select>
          </label>
          <label>
            LIGHTING
            <select
              aria-label="Export lighting"
              value={options.lighting}
              onChange={(e) =>
                setOptions((o) => ({
                  ...o,
                  lighting: e.target.value as ExportOptions["lighting"],
                }))
              }
            >
              <option value="day">Daytime</option>
              <option value="night">Nighttime</option>
              <option value="cycle">Day → night → day</option>
            </select>
          </label>
          <div className="export-motion">
            <label className="export-checkbox">
              <input
                type="checkbox"
                checked={options.rotate}
                onChange={(e) => setOptions((o) => ({ ...o, rotate: e.target.checked }))}
              />
              Rotate while zooming
            </label>
            <label className="export-angle">
              FINAL ROTATION (°)
              <input
                aria-label="Export final rotation angle"
                aria-describedby="export-motion-help"
                type="number"
                min={-360}
                max={360}
                step={1}
                disabled={!options.rotate}
                value={Number.isFinite(options.rotationDegrees) ? options.rotationDegrees : ""}
                onChange={(e) => setOptions((o) => ({ ...o, rotationDegrees: e.target.valueAsNumber }))}
              />
            </label>
            <label className="export-zoom">
              ZOOM IN (%)
              <input
                aria-label="Export zoom-in amount"
                aria-describedby="export-motion-help"
                type="number"
                min={0}
                max={200}
                step={1}
                value={Number.isFinite(options.zoomPercent) ? options.zoomPercent : ""}
                onChange={(e) => setOptions((o) => ({ ...o, zoomPercent: e.target.valueAsNumber }))}
              />
            </label>
            <p id="export-motion-help" className="export-motion-note">Zoom is added to the starting view (0% keeps its size). Rotation is relative; negative angles reverse direction.</p>
          </div>
        </fieldset>
        <div className="export-actions">
          <button
            type="button"
            className="generate"
            disabled={busy}
            onClick={start}
          >
            {busy
              ? "Creating your loop…"
              : `Export ${options.format.toUpperCase()}`}
            <span>↓</span>
          </button>
          {busy && (
            <button
              type="button"
              className="export-cancel"
              onClick={() => controller.current?.abort()}
            >
              Cancel export
            </button>
          )}
        </div>
        {progress && (
          <div className="export-progress" role="status" aria-live="polite">
            <span>{status}</span>
            <progress
              aria-label="Export progress"
              max="1"
              value={progress.progress}
            />
          </div>
        )}
        {error && (
          <p className="export-error" role="alert">
            {error}
          </p>
        )}
        {result && (
          <div className="export-result">
            {result.format === "mp4" ? (
              <video
                src={result.url}
                controls
                loop
                playsInline
                aria-label="Exported village preview"
              />
            ) : (
              <img src={result.url} alt="Exported looping hanok village" />
            )}
            <div>
              <span>
                {result.width} × {result.height} ·{" "}
                {(result.size / 1024 / 1024).toFixed(1)} MB
              </span>
              <a href={result.url} download={result.name}>
                Download {result.format.toUpperCase()} ↓
              </a>
            </div>
          </div>
        )}
        <p className="export-credit">
          Encoder:{" "}
          <a
            href={`${import.meta.env.BASE_URL}encoder/NOTICE.txt`}
            target="_blank"
            rel="noreferrer"
          >
            ffmpeg.wasm
          </a>
        </p>
      </div>
    </section>
  );
}

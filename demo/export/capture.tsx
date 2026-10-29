import { createRoot, type Root } from "react-dom/client";
import type { RootState } from "@react-three/fiber";
import { QRHanokVillage, type QRHanokVillageProps } from "../../src";
import {
  CaptureContext,
  type CaptureSession,
  type CaptureFrame,
} from "../../src/scene/CaptureContext";
export type ExportScene = Pick<
  QRHanokVillageProps,
  "value" | "seed" | "zoom" | "residentCount" | "architecture" | "dancheong" | "transitionDuration"
>;
export function createCapture(
  scene: ExportScene,
  width: number,
  height: number,
  signal: AbortSignal,
) {
  signal.throwIfAborted();
  return new Promise<{
    canvas: HTMLCanvasElement;
    render: (frame: CaptureFrame) => void;
    dispose: () => void;
  }>((resolve, reject) => {
    const host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    host.dataset.exportCapture = "true";
    Object.assign(host.style, {
      position: "fixed",
      left: "-20000px",
      top: "0",
      width: `${width}px`,
      height: `${height}px`,
      pointerEvents: "none",
    });
    document.body.append(host);
    let root: Root | undefined,
      settled = false,
      disposed = false;
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
      root?.unmount();
      host.remove();
    };
    const fail = (error: unknown) => {
      dispose();
      if (!settled) {
        settled = true;
        reject(error);
      }
    };
    const cancel = () =>
      fail(new DOMException("Export cancelled", "AbortError"));
    const timer = setTimeout(
      () =>
        fail(
          new Error(
            "Could not prepare the 3D scene. Check the QR value and WebGL support.",
          ),
        ),
      20000,
    );
    signal.addEventListener("abort", cancel, { once: true });
    const session: CaptureSession = {
      width,
      height,
      frame: {
        time: 0,
        camera: 0,
        reveal: 0,
        yaw: 0,
        zoom: 1,
        daylight: 1,
        residents: false,
      },
      onReady: (state: RootState) => {
        if (settled || disposed) return;
        clearTimeout(timer);
        settled = true;
        resolve({
          canvas: state.gl.domElement,
          render(frame) {
            signal.throwIfAborted();
            session.frame = frame;
            state.advance(frame.time, true);
          },
          dispose,
        });
      },
    };
    root = createRoot(host, { onUncaughtError: fail });
    root.render(
      <CaptureContext.Provider value={session}>
        <QRHanokVillage
          {...scene}
          zoom={scene.zoom ?? 1.3}
          width={width}
          height={height}
          initialView="village"
          autoPlay={false}
          interactive={false}
          showControls={false}
        />
      </CaptureContext.Provider>,
    );
  });
}
export function pngFrame(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not capture a frame. Try a lower resolution."));
        return;
      }
      blob
        .arrayBuffer()
        .then((buffer) => resolve(new Uint8Array(buffer)), reject);
    }, "image/png"),
  );
}

"use client";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { CaptureBridge, useCapture } from "../scene/CaptureContext";
import { Canvas } from "@react-three/fiber";
import { QRVillageScene } from "../scene/QRVillageScene";
import { generateVillage } from "../utils/villageGenerator";
import type {
  Phase,
  QRHanokVillageProps,
  QRHanokVillageRef,
  QRHanokVillageView,
} from "../types";
const stable = (v: QRHanokVillageView): Phase =>
  v === "qr" ? "QR_VIEW" : "VILLAGE_VIEW";
export const QRHanokVillage = forwardRef<
  QRHanokVillageRef,
  QRHanokVillageProps
>(function QRHanokVillage(
  {
    value,
    architecture = "hanok",
    dancheong = architecture !== "hanok",
    width = "100%",
    height = 500,
    autoPlay = true,
    qrDuration = 3000,
    transitionDuration = 1400,
    zoom = 1.3,
    initialView = "qr",
    interactive = true,
    showControls = false,
    characterAnimation = true,
    residentCount = 24,
    dayNightDuration = 60000,
    seed,
    className,
    style,
    onViewChange,
  },
  ref,
) {
  const capture = useCapture();
  const [mounted, setMounted] = useState(false),
    [target, setTarget] = useState(initialView),
    [phase, setPhase] = useState<Phase>(stable(initialView));
  const [isInteracting, setIsInteracting] = useState(false);
  const orbit = useRef({ yaw: 0, pitch: 0, zoom: 1 });
  const interactionSurface = useRef<HTMLButtonElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistance = useRef(0);
  const pendingReturn = useRef(false);
  const gesture = useRef<{
    id: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
    dragged: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  const phaseRef = useRef(phase),
    targetRef = useRef(target),
    callback = useRef(onViewChange);
  callback.current = onViewChange;
  const generated = useMemo(() => {
    try {
      return { village: generateVillage(value, seed) };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Invalid QR value",
      };
    }
  }, [value, seed]);
  useEffect(() => setMounted(true), []);
  const move = useCallback((view: QRHanokVillageView) => {
    if (phaseRef.current.startsWith("TRANSITION") || view === targetRef.current)
      return;
    targetRef.current = view;
    phaseRef.current =
      view === "qr" ? "TRANSITION_TO_QR" : "TRANSITION_TO_VILLAGE";
    setPhase(phaseRef.current);
    setTarget(view);
  }, []);
  const toggle = useCallback(
    () => move(targetRef.current === "qr" ? "village" : "qr"),
    [move],
  );
  useImperativeHandle(
    ref,
    () => ({
      showVillage: () => move("village"),
      showQR: () => move("qr"),
      toggle,
    }),
    [move, toggle],
  );
  const complete = useCallback((view: QRHanokVillageView) => {
    if (phaseRef.current === stable(view)) return;
    if (view === "qr") orbit.current.zoom = 1;
    phaseRef.current = stable(view);
    setPhase(phaseRef.current);
    callback.current?.(view);
  }, []);
  const cycleComplete = useCallback(() => {
    if (!autoPlay) return;
    pendingReturn.current = true;
    if (!isInteracting) move("qr");
  }, [autoPlay, isInteracting, move]);
  useEffect(() => {
    if (phase !== "VILLAGE_VIEW" || !autoPlay) pendingReturn.current = false;
    else if (!isInteracting && pendingReturn.current) move("qr");
  }, [autoPlay, isInteracting, phase, move]);
  useEffect(() => { orbit.current.zoom = 1; }, [zoom]);
  function changeZoom(factor: number) {
    orbit.current.zoom = Math.max(0.4, Math.min(4, orbit.current.zoom * factor));
  }
  useEffect(() => {
    const surface = interactionSurface.current;
    if (!surface) return;
    function wheel(event: WheelEvent) {
      if (phaseRef.current !== "VILLAGE_VIEW") return;
      event.preventDefault();
      const pixels = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? surface!.clientHeight : 1);
      changeZoom(Math.exp(-Math.max(-500, Math.min(500, pixels)) * 0.0015));
    }
    surface.addEventListener("wheel", wheel, { passive: false });
    return () => surface.removeEventListener("wheel", wheel);
  }, [mounted, interactive, generated]);
  function distance() {
    const [a, b] = Array.from(pointers.current.values());
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }
  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    if (pointers.current.size === 0) suppressClick.current = false;
    if (phaseRef.current !== "VILLAGE_VIEW") return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsInteracting(true);
    if (pointers.current.size >= 2) {
      pinchDistance.current = distance();
      gesture.current = null;
      suppressClick.current = true;
    } else gesture.current = {
      id: event.pointerId, startX: event.clientX, startY: event.clientY,
      x: event.clientX, y: event.clientY, dragged: false,
    };
  }
  function drag(event: PointerEvent<HTMLButtonElement>) {
    if (!pointers.current.has(event.pointerId) || phaseRef.current !== "VILLAGE_VIEW") return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size >= 2) {
      const next = distance();
      if (pinchDistance.current > 0 && next > 0) changeZoom(next / pinchDistance.current);
      pinchDistance.current = next;
      suppressClick.current = true;
      return;
    }
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - g.startX, event.clientY - g.startY) > 5) g.dragged = true;
    if (g.dragged) {
      orbit.current.yaw -= (event.clientX - g.x) * 0.008;
      orbit.current.pitch = Math.max(-0.6, Math.min(0.34, orbit.current.pitch - (event.clientY - g.y) * 0.006));
      suppressClick.current = true;
    }
    g.x = event.clientX; g.y = event.clientY;
  }
  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!pointers.current.delete(event.pointerId)) return;
    if (event.type !== "pointerup") suppressClick.current = true;
    if (gesture.current?.dragged) suppressClick.current = true;
    gesture.current = null;
    pinchDistance.current = distance();
    const remaining = Array.from(pointers.current.entries());
    if (remaining.length === 1) {
      const [id, point] = remaining[0];
      gesture.current = { id, startX: point.x, startY: point.y, ...point, dragged: true };
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (remaining.length === 0) setIsInteracting(false);
  }
  useEffect(() => {
    if (!autoPlay || isInteracting || generated.error || phase !== "QR_VIEW") return;
    const timer = setTimeout(() => move("village"), Number.isFinite(qrDuration) ? Math.max(0, qrDuration) : 3000);
    return () => clearTimeout(timer);
  }, [autoPlay, isInteracting, phase, qrDuration, move, generated]);
  return (
    <div
      className={className}
      style={{
        width,
        height,
        position: "relative",
        overflow: "hidden",
        background: "#fff",
        ...style,
      }}
      data-view={phase}
    >
      {generated.error ? (
        <div role="alert" style={{ padding: 24 }}>
          Unable to generate QR: {generated.error}
        </div>
      ) : (
        mounted && (
          <Canvas
            orthographic
            frameloop={capture ? "never" : "always"}
            camera={{ position: [0, 70, 0], near: 0.1, far: 200, zoom: 10 }}
            dpr={capture ? 1 : [1, 2]}
            gl={{
              antialias: true,
              alpha: false,
              preserveDrawingBuffer: !!capture,
            }}
            fallback={<div>WebGL is required to explore this village.</div>}
          >
            <QRVillageScene
              village={generated.village!}
              architecture={architecture}
              dancheong={dancheong}
              orbit={orbit}
              dayNightDuration={dayNightDuration}
              dayNightActive={phase === "VILLAGE_VIEW"}
              onCycleComplete={cycleComplete}
              target={target}
              tileSeed={String(seed ?? value)}
              zoom={zoom}
              duration={
                Number.isFinite(transitionDuration)
                  ? Math.max(0, transitionDuration)
                  : 1400
              }
              onComplete={complete}
              characters={characterAnimation && phase === "VILLAGE_VIEW"}
              residentCount={residentCount}
            />
            {capture && <CaptureBridge session={capture} />}
          </Canvas>
        )
      )}
      {interactive && !generated.error && (
        <button
          type="button"
          ref={interactionSurface}
          aria-label={
            target === "qr"
              ? "Explore hanok village"
              : "Drag to rotate, scroll or pinch to zoom village; click to return to QR code"
          }
          onPointerDown={startDrag}
          onPointerMove={drag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
          onClick={(event) => {
            if (event.detail === 0 || !suppressClick.current) toggle();
            suppressClick.current = false;
          }}
          style={{
            position: "absolute",
            inset: 0,
            border: 0,
            background: "transparent",
            cursor:
              phase === "VILLAGE_VIEW"
                ? isInteracting
                  ? "grabbing"
                  : "grab"
                : "pointer",
            touchAction: phase === "VILLAGE_VIEW" ? "none" : "auto",
            userSelect: "none",
          }}
        />
      )}
      {showControls && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            display: "flex",
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={() => move("qr")}
            disabled={phase.startsWith("TRANSITION")}
          >
            QR view
          </button>
          <button
            type="button"
            onClick={() => move("village")}
            disabled={phase.startsWith("TRANSITION")}
          >
            Village view
          </button>
        </div>
      )}
    </div>
  );
});

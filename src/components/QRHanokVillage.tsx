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
    width = "100%",
    height = 500,
    autoPlay = false,
    qrDuration = 3000,
    villageDuration = 9000,
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
  const [mounted, setMounted] = useState(false),
    [target, setTarget] = useState(initialView),
    [phase, setPhase] = useState<Phase>(stable(initialView));
  const [isInteracting, setIsInteracting] = useState(false);
  const orbit = useRef({ yaw: 0, pitch: 0 });
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
    phaseRef.current = stable(view);
    setPhase(phaseRef.current);
    callback.current?.(view);
  }, []);
  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick.current = false;
    if (phaseRef.current !== "VILLAGE_VIEW") return;
    gesture.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      dragged: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsInteracting(true);
  }
  function drag(event: PointerEvent<HTMLButtonElement>) {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    if (phaseRef.current !== "VILLAGE_VIEW") return;
    if (Math.hypot(event.clientX - g.startX, event.clientY - g.startY) > 5)
      g.dragged = true;
    if (g.dragged) {
      orbit.current.yaw -= (event.clientX - g.x) * 0.008;
      orbit.current.pitch = Math.max(
        -0.6,
        Math.min(0.34, orbit.current.pitch - (event.clientY - g.y) * 0.006),
      );
      suppressClick.current = true;
    }
    g.x = event.clientX;
    g.y = event.clientY;
  }
  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId) return;
    suppressClick.current = g.dragged || event.type !== "pointerup";
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    setIsInteracting(false);
  }
  useEffect(() => {
    if (
      !autoPlay ||
      isInteracting ||
      generated.error ||
      phase.startsWith("TRANSITION")
    )
      return;
    const timer = setTimeout(
      toggle,
      Math.max(0, phase === "QR_VIEW" ? qrDuration : villageDuration),
    );
    return () => clearTimeout(timer);
  }, [
    autoPlay,
    isInteracting,
    phase,
    qrDuration,
    villageDuration,
    toggle,
    generated,
  ]);
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
            camera={{ position: [0, 70, 0], near: 0.1, far: 200, zoom: 10 }}
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: false }}
            fallback={<div>WebGL is required to explore this village.</div>}
          >
            <QRVillageScene
              village={generated.village!}
              orbit={orbit}
              dayNightDuration={dayNightDuration}
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
          </Canvas>
        )
      )}
      {interactive && !generated.error && (
        <button
          type="button"
          aria-label={
            target === "qr"
              ? "Explore hanok village"
              : "Drag to rotate village; click to return to QR code"
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

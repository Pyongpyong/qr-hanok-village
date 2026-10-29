import { useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useCapture } from "./CaptureContext";
import { Color, type AmbientLight, type DirectionalLight } from "three";

/** Day/night lighting and a matching solid background, without scenery objects. */
export function VillageLighting({
  size,
  progress,
  night,
  cycleDuration,
}: {
  size: number;
  progress: RefObject<number>;
  night: RefObject<number>;
  cycleDuration: number;
}) {
  const capture = useCapture();
  const { gl } = useThree();
  const ambient = useRef<AmbientLight>(null);
  const sunlight = useRef<DirectionalLight>(null);
  const elapsed = useRef(0);
  const palette = useMemo(
    () => ({
      warm: new Color("#ffe1ad"),
      cool: new Color("#8ca9e2"),
      day: new Color("#ffffff"),
      night: new Color("#10192b"),
      background: new Color(),
    }),
    [],
  );
  useFrame((_, delta) => {
    const p = progress.current;
    if (p > 0.99) elapsed.current += delta;
    const duration =
      Number.isFinite(cycleDuration) && cycleDuration > 0
        ? cycleDuration
        : 60000;
    const phase = (elapsed.current / (duration / 1000)) * Math.PI * 2;
    const daylight = capture
      ? capture.frame.daylight
      : (Math.cos(phase) + 1) / 2;
    night.current = (1 - daylight) * p;
    gl.setClearColor(
      palette.background.copy(palette.day).lerp(palette.night, night.current),
    );
    ambient.current!.intensity = 0.07 + daylight * 1.2;
    sunlight.current!.intensity = 0.08 + daylight * 2.24;
    sunlight.current!.color.copy(palette.cool).lerp(palette.warm, daylight);
    sunlight.current!.position.set(
      Math.cos(phase) * size,
      size * (0.5 + daylight),
      size * 0.5,
    );
  }, -1);
  return (
    <>
      <ambientLight ref={ambient} intensity={1.27} />
      <directionalLight
        ref={sunlight}
        position={[15, 30, 10]}
        intensity={2.3}
      />
    </>
  );
}

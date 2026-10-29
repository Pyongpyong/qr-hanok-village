import { useLayoutEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { type MeshBasicMaterial, type OrthographicCamera } from "three";
import { transitionFrame } from "../utils/transition";
import { QRMask } from "./QRMask";
import { VillageLighting } from "./VillageLighting";
import { VillageObjects } from "../objects/VillageObjects";
import { Residents } from "./Residents";
import { type Village } from "../utils/villageGenerator";
import type { QRHanokVillageView } from "../types";
export function QRVillageScene({
  village,
  orbit,
  target,
  duration,
  onComplete,
  characters,
  residentCount,
  dayNightDuration,
  zoom,
  tileSeed,
}: {
  village: Village;
  orbit: RefObject<{ yaw: number; pitch: number }>;
  target: QRHanokVillageView;
  duration: number;
  onComplete: (v: QRHanokVillageView) => void;
  characters: boolean;
  residentCount: number;
  dayNightDuration: number;
  zoom: number;
  tileSeed: string;
}) {
  const { camera, size, gl } = useThree();
  const night = useRef(0);
  const ground = useRef<MeshBasicMaterial>(null),
    base = useRef<MeshBasicMaterial>(null);
  const reveal = useRef(target === "village" ? 1 : 0);
  const progress = useRef(target === "village" ? 1 : 0);
  const motion = useRef({ elapsed: 0, done: true });
  useLayoutEffect(() => {
    const to = target === "village" ? 1 : 0;
    motion.current = {
      elapsed: 0,
      done: progress.current === to && reveal.current === to,
    };
  }, [target]);
  useFrame((_, delta) => {
    const m = motion.current;
    if (!m.done) {
      m.elapsed += delta * 1000;
      const frame = transitionFrame(target, m.elapsed, duration);
      progress.current = frame.camera;
      reveal.current = frame.reveal;
      if (frame.done) {
        m.done = true;
        if (target === "qr") {
          orbit.current.yaw = 0;
          orbit.current.pitch = 0;
        }
        onComplete(target);
      }
    }
    const p = progress.current,
      cam = camera as OrthographicCamera,
      angle = p * (Math.PI * (62 / 180) + orbit.current.pitch),
      azimuth = Math.PI / 4 + orbit.current.yaw * p,
      r = Math.max(70, village.size * 4);
    cam.position.set(
      Math.sin(angle) * r * Math.sin(azimuth),
      Math.cos(angle) * r + village.size * 0.16 * p,
      Math.sin(angle) * r * Math.cos(azimuth),
    );
    cam.up.set(0, p, -(1 - p)).normalize();
    cam.lookAt(0, village.size * 0.16 * p, 0);
    const span = Math.max(
      (village.size + 10) * (1 - p * 0.15),
      ((village.size + 8) *
        Math.SQRT2 *
        p *
        Math.min(size.width, size.height)) /
        size.width,
    );
    cam.far = r + village.size * 8;
    const magnification = Number.isFinite(zoom) && zoom > 0 ? zoom : 1.3;
    cam.zoom =
      (Math.min(size.width, size.height) / span) *
      (1 + (magnification - 1) * p);
    cam.updateProjectionMatrix();
  }, -2);
  useFrame(() => {
    // Use the renderer's exact current background color, including intermediate
    // day/night shades, so neither the floor outline nor slab sides stand out.
    gl.getClearColor(ground.current!.color);
    base.current!.color.copy(ground.current!.color);
  });
  return (
    <>
      <VillageLighting
        size={village.size}
        progress={progress}
        night={night}
        cycleDuration={dayNightDuration}
      />
      <mesh name="village-base" position={[0, -0.22, 0]}>
        <boxGeometry args={[village.size + 8, 0.4, village.size + 8]} />
        <meshBasicMaterial ref={base} color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh
        name="village-ground"
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
      >
        <planeGeometry args={[village.size + 8, village.size + 8]} />
        <meshBasicMaterial ref={ground} color="#ffffff" toneMapped={false} />
      </mesh>
      <VillageObjects lots={village.lots} night={night} seed={tileSeed} />
      <Residents
        village={village}
        count={residentCount}
        seed={tileSeed}
        active={characters && target === "village" && motion.current.done}
      />
      <QRMask village={village} seed={tileSeed} reveal={reveal} />
    </>
  );
}

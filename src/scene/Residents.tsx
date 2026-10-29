import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Object3D, type InstancedMesh } from "three";
import { createResidents } from "../utils/residents";
import type { Village } from "../utils/villageGenerator";
const multipliers = [1, 1, 4, 2, 1, 2, 2, 1];
/** A small crowd rendered in eight batches, rather than a mesh per body part. */
export function Residents({
  village,
  count,
  seed,
  active,
}: {
  village: Village;
  count: number;
  seed: string;
  active: boolean;
}) {
  const residents = useMemo(
    () => createResidents(village, count, seed),
    [village, count, seed],
  );
  const meshes = useRef<(InstancedMesh | null)[]>([]),
    elapsed = useRef(0);
  const object = useMemo(() => new Object3D(), []);
  useLayoutEffect(() => {
    const color = new Color();
    meshes.current.forEach((mesh, part) => {
      if (!mesh) return;
      residents.forEach((r, i) => {
        const palette = [
          r.kind === "person" ? r.shirt : r.coat,
          r.kind === "person" ? "#f1cfac" : r.coat,
          r.kind === "person" ? "#514b43" : r.coat,
          "#20262b",
          r.hair,
          r.coat,
          r.coat,
          r.coat,
        ];
        for (let j = 0; j < multipliers[part]; j++)
          mesh.setColorAt(i * multipliers[part] + j, color.set(palette[part]));
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }, [residents]);
  useFrame((_, delta) => {
    if (!active) return;
    elapsed.current += Math.min(delta, 0.1);
    residents.forEach((r, i) => {
      const time = elapsed.current * r.speed + r.offset,
        index = Math.floor(time) % r.route.length,
        t = time - Math.floor(time),
        a = r.route[index],
        b = r.route[(index + 1) % r.route.length];
      const x = a.x + (b.x - a.x) * t,
        z = a.z + (b.z - a.z) * t,
        yaw = Math.atan2(b.x - a.x, b.z - a.z),
        sin = Math.sin(yaw),
        cos = Math.cos(yaw),
        bob = 0.015 * Math.sin(time * 14);
      function put(
        part: number,
        j: number,
        lx: number,
        y: number,
        lz: number,
        sx: number,
        sy: number,
        sz: number,
        rx = 0,
        rz = 0,
      ) {
        if (sx === 0) {
          sy = 0;
          sz = 0;
        }
        object.position.set(
          x + lx * cos + lz * sin,
          y + 0.025 + bob,
          z - lx * sin + lz * cos,
        );
        object.scale.set(sx, sy, sz);
        object.rotation.set(rx, yaw, rz);
        object.updateMatrix();
        meshes.current[part]!.setMatrixAt(
          i * multipliers[part] + j,
          object.matrix,
        );
      }
      const human = r.kind === "person",
        dog = r.kind === "dog";
      put(
        0,
        0,
        0,
        human ? 0.32 : 0.2,
        0,
        human ? 0.13 : 0.14,
        human ? 0.21 : 0.13,
        human ? 0.12 : 0.24,
      );
      put(
        1,
        0,
        0,
        human ? 0.59 : 0.32,
        human ? 0 : 0.19,
        human ? 0.11 : 0.12,
        human ? 0.12 : 0.11,
        human ? 0.105 : 0.12,
      );
      for (let j = 0; j < 4; j++) {
        const lx = (j % 2 ? 1 : -1) * (human ? 0.065 : 0.085),
          lz = human ? 0 : j < 2 ? -0.14 : 0.14,
          step = Math.sin(time * 14 + (j % 2) * Math.PI) * 0.025;
        put(
          2,
          j,
          lx,
          0.08 + step,
          lz,
          human && j > 1 ? 0 : 0.04,
          human ? 0.085 : 0.065,
          0.045,
        );
      }
      for (let j = 0; j < 2; j++)
        put(
          3,
          j,
          (j ? 1 : -1) * 0.045,
          human ? 0.61 : 0.35,
          human ? 0.095 : 0.293,
          0.014,
          0.017,
          0.011,
        );
      put(4, 0, 0, 0.67, -0.012, human ? 0.112 : 0, 0.06, 0.108);
      for (let j = 0; j < 2; j++) {
        const sign = j ? 1 : -1;
        put(
          5,
          j,
          sign * 0.105,
          0.34,
          0.18,
          dog ? 0.055 : 0,
          0.1,
          0.045,
          0,
          sign * 0.25,
        );
        put(
          6,
          j,
          sign * 0.073,
          0.45,
          0.18,
          r.kind === "cat" ? 0.05 : 0,
          0.12,
          0.055,
        );
      }
      put(
        7,
        0,
        0,
        dog ? 0.22 : 0.32,
        -0.25,
        human ? 0 : 0.035,
        dog ? 0.11 : 0.16,
        0.04,
        0.3 + Math.sin(time * 12) * 0.2,
      );
    });
    for (const mesh of meshes.current)
      if (mesh) mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <group name="village-residents" visible={active}>
      {multipliers.map((multiple, part) => (
        <instancedMesh
          key={part}
          ref={(mesh) => {
            meshes.current[part] = mesh;
          }}
          args={[undefined, undefined, residents.length * multiple]}
          frustumCulled={false}
        >
          {part === 6 ? (
            <coneGeometry args={[1, 1, 3]} />
          ) : (
            <sphereGeometry args={[1, 8, 6]} />
          )}
          <meshStandardMaterial roughness={0.9} />
        </instancedMesh>
      ))}
    </group>
  );
}

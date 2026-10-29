import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Object3D,
  InstancedBufferAttribute,
  type BufferGeometry,
  type InstancedMesh,
  type MeshStandardMaterial,
} from "three";
import { useCapture } from "../scene/CaptureContext";
import { useFrame } from "@react-three/fiber";
import type { QRHanokVillageArchitecture } from "../types";
import { architectureStyle } from "../utils/architecture";
import type { Lot } from "../utils/villageGenerator";
import { createHouseLight, houseBrightness } from "../utils/houseLight";
import { housePlots, roofProfile } from "../utils/housePlots";
import { createHanokRoof } from "./hanokGeometry";
type Piece = {
  p: [number, number, number];
  s: [number, number, number];
  r?: [number, number, number];
  house?: string;
};
function Batch({
  pieces,
  color,
  geometry,
  night,
  seed = "village",
}: {
  pieces: Piece[];
  color: string;
  geometry: BufferGeometry;
  night?: RefObject<number>;
  seed?: string;
}) {
  const capture = useCapture();
  const ref = useRef<InstancedMesh>(null);
  const material = useRef<MeshStandardMaterial>(null);
  const time = useRef(0);
  const lights = useMemo(() => {
    if (!night) return;
    const byHouse = new Map<string, number>(),
      profiles: ReturnType<typeof createHouseLight>[] = [];
    const indices = pieces.map((piece) => {
      const key = piece.house ?? "house";
      if (!byHouse.has(key)) {
        byHouse.set(key, profiles.length);
        profiles.push(createHouseLight(`${seed}:${key}`));
      }
      return byHouse.get(key)!;
    });
    return {
      profiles,
      indices,
      levels: new Float32Array(profiles.length),
      attribute: new InstancedBufferAttribute(
        new Float32Array(pieces.length).fill(1),
        1,
      ),
    };
  }, [pieces, night, seed]);
  const customize = useMemo<MeshStandardMaterial["onBeforeCompile"]>(
    () => (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nattribute float aWindowGlow;\nvarying float vWindowGlow;",
        )
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvWindowGlow = aWindowGlow;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying float vWindowGlow;",
        )
        .replace(
          "vec3 totalEmissiveRadiance = emissive;",
          "vec3 totalEmissiveRadiance = emissive * vWindowGlow;",
        );
    },
    [],
  );
  useFrame((_, delta) => {
    if (!night || !lights || !material.current) return;
    if (capture) time.current = capture.frame.time;
    else if (night.current > 0.001) time.current += delta;
    material.current.emissiveIntensity = night.current * 1.6;
    lights.profiles.forEach((profile, i) => {
      lights.levels[i] = houseBrightness(profile, time.current);
    });
    lights.indices.forEach((house, i) => {
      lights.attribute.setX(i, lights.levels[house]);
    });
    lights.attribute.needsUpdate = true;
  });
  useLayoutEffect(() => {
    const o = new Object3D();
    pieces.forEach((p, i) => {
      o.position.set(...p.p);
      o.scale.set(...p.s);
      o.rotation.set(...(p.r ?? [0, 0, 0]));
      o.updateMatrix();
      ref.current!.setMatrixAt(i, o.matrix);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
    ref.current!.computeBoundingSphere();
    if (lights) geometry.setAttribute("aWindowGlow", lights.attribute);
  }, [pieces, lights, geometry]);
  return (
    <instancedMesh
      name={night ? "hanok-windows" : undefined}
      ref={ref}
      args={[geometry, undefined, pieces.length]}
    >
      <meshStandardMaterial
        ref={material}
        color={color}
        emissive={night ? "#ffb958" : "#000000"}
        emissiveIntensity={0}
        roughness={0.92}
        side={DoubleSide}
        {...(night
          ? {
              onBeforeCompile: customize,
              customProgramCacheKey: () => "hanok-house-lights-v1",
            }
          : {})}
      />
    </instancedMesh>
  );
}

/** Replace these instanced geometry recipes with GLB models to customize the architecture. */
export function VillageObjects({
  lots,
  night,
  seed,
  architecture = "hanok",
  dancheong = false,
}: {
  lots: Lot[];
  night?: RefObject<number>;
  seed: string;
  architecture?: QRHanokVillageArchitecture;
  dancheong?: boolean;
}) {
  const geometries = useMemo(
    () => ({
      box: new BoxGeometry(1, 1, 1),
      paperBox: new BoxGeometry(1, 1, 1),
      roof: createHanokRoof(),
      cylinder: new CylinderGeometry(0.85, 1, 1, 10),
    }),
    [],
  );
  useLayoutEffect(
    () => () => Object.values(geometries).forEach((g) => g.dispose()),
    [geometries],
  );
  const style = architectureStyle(architecture);
  const parts = useMemo(() => {
    const stone: Piece[] = [],
      plaster: Piece[] = [],
      wood: Piece[] = [],
      paper: Piece[] = [],
      roofs: Piece[] = [],
      ridge: Piece[] = [],
      rafters: Piece[] = [],
      green: Piece[] = [],
      blue: Piece[] = [],
      gold: Piece[] = [],
      jars: Piece[] = [];
    function decorate(x: number, z: number, w: number, d: number, y: number) {
      if (!dancheong) return;
      // Paint on the exposed outside of the wall, below the overhanging roof.
      // Previous beams were inside the plaster volume and were occluded.
      for (const side of [-1, 1]) {
        for (const axis of [0, 1]) {
          const along = axis === 0 ? w : d;
          const across = axis === 0 ? d : w;
          const piece = (offset: number, height: number, depth: number, length: number): Piece => ({
            p: axis === 0 ? [x, y + offset, z + side * (across * 0.4 + 0.025)] : [x + side * (across * 0.42 + 0.025), y + offset, z],
            s: axis === 0 ? [length, height, depth] : [depth, height, length],
          });
          green.push(piece(-0.14, 0.16, 0.085, along * 0.91));
          blue.push(piece(-0.235, 0.035, 0.09, along * 0.91));
          gold.push(piece(-0.055, 0.025, 0.095, along * 0.91));
          const count = Math.max(3, Math.round(along * 4));
          for (let i = 0; i < count; i++) {
            const offset = along * ((i + 0.5) / count - 0.5) * 0.85;
            const motif = piece(-0.14, 0.06, 0.025, 0.06);
            if (axis === 0) { motif.p[0] += offset; motif.p[2] += side * 0.055; motif.r = [0, 0, Math.PI / 4]; }
            else { motif.p[2] += offset; motif.p[0] += side * 0.055; motif.r = [Math.PI / 4, 0, 0]; }
            gold.push(motif);
          }
        }
      }
    }
    for (const plot of housePlots(lots)) {
      const { x, z, w, d, lot } = plot;
      const roof = roofProfile(plot, architecture);
      const wallOnly = roof.wallOnly;
      if (wallOnly) {
        stone.push({ p: [x, 0.13, z], s: [w, 0.26, 0.3] });
        plaster.push({ p: [x, 0.38, z], s: [w, 0.3, 0.24] });
        roofs.push({
          p: [x, roof.baseY, z],
          s: [roof.width, roof.heightScale, roof.depth],
        });
        continue;
      }
      const h = roof.wallHeight,
        floor = roof.floorY,
        bodyW = w * 0.8,
        bodyD = d * 0.76;
      const pavilion = lot.kind === "pavilion" && w > 1;
      stone.push({ p: [x, floor / 2, z], s: [w * 0.94, floor, d * 0.94] });
      // Continuous cream plaster walls make homes read as enclosed buildings, rather than red posts.
      if (!pavilion)
        plaster.push({ p: [x, floor + h / 2, z], s: [bodyW, h, bodyD] });
      wood.push({
        p: [x, floor + 0.025, z],
        s: [bodyW + 0.05, 0.055, bodyD + 0.05],
      });
      for (const side of [-1, 1]) {
        wood.push({
          p: [x, floor + h - 0.025, z + (side * bodyD) / 2],
          s: [bodyW + 0.06, 0.075, 0.055],
        });
        const bays = Math.max(2, Math.round(w * 2));
        for (let i = 0; i <= bays; i++) {
          const px = x - bodyW / 2 + (bodyW * i) / bays;
          wood.push({
            p: [px, floor + h / 2, z + side * (bodyD / 2 + 0.009)],
            s: [0.042, h, 0.045],
          });
        }
        if (!pavilion)
          for (let i = 0; i < bays; i++) {
            const px = x - bodyW / 2 + (bodyW * (i + 0.5)) / bays,
              pw = (bodyW / bays) * 0.78,
              pz = z + side * (bodyD / 2 + 0.033);
            paper.push({
              house: `${x},${z}`,
              p: [px, floor + h * 0.52, pz],
              s: [pw, h * 0.65, 0.018],
            });
            // Timber lattice across translucent-looking warm paper window panels.
            for (const dx of [-0.24, 0, 0.24])
              wood.push({
                p: [px + dx * pw, floor + h * 0.52, pz + side * 0.014],
                s: [0.012, h * 0.65, 0.013],
              });
            for (const dy of [-0.17, 0.03, 0.23])
              wood.push({
                p: [px, floor + h * 0.52 + dy, pz + side * 0.015],
                s: [pw, 0.012, 0.014],
              });
          }
        // Plastered end wall with exposed timber framing and a latticed window.
        for (const end of [-1, 1])
          wood.push({ p: [x + side * (bodyW / 2 + 0.01), floor + h / 2, z + end * bodyD / 2], s: [0.05, h, 0.045] });
        for (const level of [0.06, 0.95])
          wood.push({ p: [x + side * (bodyW / 2 + 0.012), floor + h * level, z], s: [0.045, 0.045, bodyD] });
        if (!pavilion) {
          const sx = x + side * (bodyW / 2 + 0.03);
          paper.push({ house: `${x},${z}`, p: [sx, floor + h * 0.53, z], s: [0.016, h * 0.54, bodyD * 0.57] });
          for (const line of [-0.24, 0, 0.24]) {
            wood.push({ p: [sx + side * 0.014, floor + h * 0.53, z + line * bodyD * 0.57], s: [0.014, h * 0.54, 0.012] });
            wood.push({ p: [sx + side * 0.015, floor + h * (0.53 + line * 0.54), z], s: [0.014, 0.012, bodyD * 0.57] });
          }
        }
        // Repeated exposed rafter ends give the deep eave a readable timber underside.
        const count = Math.max(4, Math.round(w * 7));
        for (let i = 0; i < count; i++)
          rafters.push({ p: [x + (i / (count - 1) - 0.5) * w * 0.94, roof.baseY - 0.005, z + side * d * 0.44], s: [0.024, 0.035, d * 0.12] });
      }
      // Wide overhang, concave slopes, tiled surface and raised ridge are the hanok silhouette.
      roofs.push({
        p: [x, roof.baseY, z],
        s: [roof.width, roof.heightScale, roof.depth],
      });
      decorate(x, z, w, d, roof.baseY);
      const crown = roof.upper ?? roof;
      if (roof.upper) {
        const upper = roof.upper;
        roofs.push({
          p: [x, upper.baseY, z],
          s: [upper.width, upper.heightScale, upper.depth],
        });
        plaster.push({
          p: [x, roof.baseY + 0.17, z],
          s: [upper.width * 0.84, 0.3, upper.depth * 0.84],
        });
        for (const sx of [-1, 1])
          for (const sz of [-1, 1])
            wood.push({
              p: [
                x + sx * upper.width * 0.39,
                roof.baseY + 0.17,
                z + sz * upper.depth * 0.39,
              ],
              s: [0.05, 0.34, 0.05],
            });
        decorate(x, z, upper.width, upper.depth, upper.baseY);
      }
      ridge.push({
        p: [x, crown.baseY + 0.365 * crown.heightScale, z],
        s: [
          0.038 * crown.heightScale,
          crown.width * 0.78,
          0.038 * crown.heightScale,
        ],
        r: [0, 0, Math.PI / 2],
      });
      // Front stone step and a narrow wooden toenmaru veranda.
      stone.push({
        p: [x, 0.045, z + bodyD / 2 + 0.08],
        s: [bodyW * 0.48, 0.09, 0.16],
      });
      wood.push({
        p: [x, floor + 0.01, z + bodyD / 2 + 0.045],
        s: [bodyW, 0.045, 0.13],
      });
      if (lot.kind === "jars")
        for (const dx of [-0.12, 0.12])
          jars.push({ p: [x + dx, 0.25, z - d * 0.43], s: [0.09, 0.24, 0.1] });
    }
    return {
      stone,
      plaster,
      wood,
      paper,
      roofs,
      ridge,
      rafters,
      jars,
      green,
      blue,
      gold,
    };
  }, [lots, architecture, dancheong]);
  return (
    <group>
      <Batch
        pieces={parts.stone}
        color={style.stone}
        geometry={geometries.box}
      />
      <Batch pieces={parts.plaster} color="#f3ecdb" geometry={geometries.box} />
      <Batch
        pieces={parts.wood}
        color={dancheong ? "#863b32" : style.wood}
        geometry={geometries.box}
      />
      <Batch
        pieces={parts.paper}
        color="#efe5cc"
        geometry={geometries.paperBox}
        night={night}
        seed={seed}
      />
      <Batch pieces={parts.rafters} color="#b69a74" geometry={geometries.box} />
      <Batch pieces={parts.roofs} color="#393d3b" geometry={geometries.roof} />
      <Batch
        pieces={parts.ridge}
        color="#596167"
        geometry={geometries.cylinder}
      />
      <Batch pieces={parts.green} color="#168967" geometry={geometries.box} />
      <Batch pieces={parts.blue} color="#277fb1" geometry={geometries.box} />
      <Batch pieces={parts.gold} color="#f2ce65" geometry={geometries.box} />
      <Batch
        pieces={parts.jars}
        color="#64503e"
        geometry={geometries.cylinder}
      />
    </group>
  );
}

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
import { useFrame } from "@react-three/fiber";
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
    if (night.current > 0.001) time.current += delta;
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
}: {
  lots: Lot[];
  night?: RefObject<number>;
  seed: string;
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
  const parts = useMemo(() => {
    const stone: Piece[] = [],
      plaster: Piece[] = [],
      wood: Piece[] = [],
      paper: Piece[] = [],
      roofs: Piece[] = [],
      ridge: Piece[] = [],
      jars: Piece[] = [];
    for (const plot of housePlots(lots)) {
      const { x, z, w, d, lot } = plot;
      const roof = roofProfile(plot);
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
      const h = 0.61 + lot.height * 0.16,
        floor = 0.14,
        bodyW = w * 0.8,
        bodyD = d * 0.76;
      const pavilion = lot.kind === "pavilion" && w > 1;
      stone.push({ p: [x, 0.065, z], s: [w * 0.94, 0.13, d * 0.94] });
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
        wood.push({
          p: [x + (side * bodyW) / 2, floor + h / 2, z],
          s: [0.045, h, bodyD],
        });
        if (!pavilion)
          paper.push({
            house: `${x},${z}`,
            p: [x + side * (bodyW / 2 + 0.026), floor + h * 0.53, z],
            s: [0.012, h * 0.54, bodyD * 0.57],
          });
      }
      // Wide overhang, concave slopes, tiled surface and raised ridge are the hanok silhouette.
      roofs.push({
        p: [x, roof.baseY, z],
        s: [roof.width, roof.heightScale, roof.depth],
      });
      ridge.push({
        p: [x, floor + h + 0.385, z],
        s: [0.038, w * 0.6, 0.038],
        r: [0, 0, Math.PI / 2],
      });
      for (const side of [-1, 1])
        ridge.push({
          p: [x + side * w * 0.3, floor + h + 0.405, z],
          s: [0.05, 0.13, 0.05],
          r: [0, 0, -side * 0.65],
        });
      // Front stone step and a narrow wooden toenmaru veranda.
      stone.push({
        p: [x, 0.045, z + bodyD / 2 + 0.08],
        s: [bodyW * 0.48, 0.09, 0.16],
      });
      wood.push({
        p: [x, 0.15, z + bodyD / 2 + 0.045],
        s: [bodyW, 0.045, 0.13],
      });
      if (lot.kind === "jars")
        for (const dx of [-0.12, 0.12])
          jars.push({ p: [x + dx, 0.25, z - d * 0.43], s: [0.09, 0.24, 0.1] });
    }
    return { stone, plaster, wood, paper, roofs, ridge, jars };
  }, [lots]);
  return (
    <group>
      <Batch pieces={parts.stone} color="#b4afa1" geometry={geometries.box} />
      <Batch pieces={parts.plaster} color="#f3ecdb" geometry={geometries.box} />
      <Batch pieces={parts.wood} color="#645642" geometry={geometries.box} />
      <Batch
        pieces={parts.paper}
        color="#e6d4a6"
        geometry={geometries.paperBox}
        night={night}
        seed={seed}
      />
      <Batch pieces={parts.roofs} color="#414a50" geometry={geometries.roof} />
      <Batch
        pieces={parts.ridge}
        color="#596167"
        geometry={geometries.cylinder}
      />
      <Batch
        pieces={parts.jars}
        color="#64503e"
        geometry={geometries.cylinder}
      />
    </group>
  );
}

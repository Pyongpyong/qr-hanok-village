import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Color,
  DoubleSide,
  InstancedBufferAttribute,
  Object3D,
  type InstancedMesh,
  type ShaderMaterial,
} from "three";
import type { Village } from "../utils/villageGenerator";
import { housePlots, roofProfile } from "../utils/housePlots";
import { tileOrder } from "../utils/transition";

const vertexShader = `
attribute float aOrder;
attribute vec4 aRoof;
attribute vec2 aRoofBase;

// Same hipped-roof profile used by the hanok geometry: the QR lies on the tiles.
float roofHeight(vec2 point) {
  if (aRoof.z <= 0.0) return 0.005;
  vec2 q = (point - aRoof.xy) / aRoof.zw;
  // Clamp tiny floating-point errors at the exact QR-module roof boundary.
  q = clamp(q, vec2(-0.5), vec2(0.5));
  float t = 2.0 * abs(q.y);
  float u;
  if (abs(q.x) <= 0.28 + 0.22 * t) {
    u = 0.5 + q.x / (0.56 + 0.44 * t);
  } else {
    t = clamp((abs(q.x) - 0.28) / 0.22, 0.0, 1.0);
    u = 0.5 + q.y / max(t, 0.0001);
  }
  float height = 0.36 * pow(1.0-t, 1.5) + 0.075 * pow(t, 8.0)
    + 0.012 * cos(u * 125.663706) + 0.003 * cos(t * 56.548668);
  // Follow the raised cylindrical ridge as well as the roof slopes.
  vec2 local = point - aRoof.xy;
  if (aRoofBase.y > 0.9 && abs(local.x) < aRoof.z * 0.30 && abs(local.y) < 0.038) {
    height = max(height, 0.385 + sqrt(max(0.0, 0.038*0.038-local.y*local.y)));
  }
  return aRoofBase.x + height * aRoofBase.y + 0.008;
}
varying float vOrder;
varying vec3 vTileColor;
void main() {
  vOrder = aOrder;
  #ifdef USE_INSTANCING_COLOR
    vTileColor = instanceColor;
  #else
    vTileColor = vec3(1.0);
  #endif
  vec4 surface = instanceMatrix * vec4(position, 1.0);
  surface.y = roofHeight(surface.xz);
  gl_Position = projectionMatrix * modelViewMatrix * surface;
}`;
const fragmentShader = `
uniform float uReveal;
varying float vOrder;
varying vec3 vTileColor;
void main() {
  // Only a small band of tiles fades at a time; the rest are fully opaque or absent.
  float start = vOrder * 0.84;
  float alpha = 1.0 - smoothstep(start, start + 0.16, uReveal);
  if (alpha <= 0.0001) discard;
  gl_FragColor = vec4(vTileColor, alpha);
}`;

/** White AND black modules dissolve individually, including the four-module quiet zone. */
export function QRMask({
  village,
  seed,
  reveal,
}: {
  village: Village;
  seed: string;
  reveal: RefObject<number>;
}) {
  const mesh = useRef<InstancedMesh>(null),
    material = useRef<ShaderMaterial>(null);
  const side = village.size + 8,
    count = side * side;
  const subdivisions = Math.max(
    2,
    Math.min(12, Math.floor(320 / village.size)),
  );
  const order = useMemo(() => tileOrder(count, seed), [count, seed]);
  const uniforms = useMemo(
    () => ({ uReveal: { value: reveal.current } }),
    [reveal],
  );
  useLayoutEffect(() => {
    const object = new Object3D(),
      black = new Color(0, 0, 0),
      white = new Color(1, 1, 1);
    const roofByCell = new Map<string, ReturnType<typeof housePlots>[number]>();
    for (const plot of housePlots(village.lots)) {
      for (let dz = 0; dz < plot.d; dz++)
        for (let dx = 0; dx < plot.w; dx++) {
          roofByCell.set(`${plot.lot.x + dx},${plot.lot.z + dz}`, plot);
        }
    }
    const roofData = new Float32Array(count * 4),
      roofBase = new Float32Array(count * 2);
    const occupied = new Set(village.lots.map((l) => `${l.x},${l.z}`));
    for (let row = 0; row < side; row++)
      for (let col = 0; col < side; col++) {
        const x = col - 4 - (village.size - 1) / 2,
          z = row - 4 - (village.size - 1) / 2,
          index = row * side + col;
        object.position.set(x, 0, z);
        const plot = roofByCell.get(`${x},${z}`);
        if (plot) {
          const roof = roofProfile(plot);
          roofData.set([plot.x, plot.z, roof.width, roof.depth], index * 4);
          roofBase.set([roof.baseY, roof.heightScale], index * 2);
        }
        object.rotation.set(-Math.PI / 2, 0, 0);
        object.updateMatrix();
        mesh.current!.setMatrixAt(index, object.matrix);
        mesh.current!.setColorAt(
          index,
          occupied.has(`${x},${z}`) ? black : white,
        );
      }
    mesh.current!.instanceMatrix.needsUpdate = true;
    mesh.current!.instanceColor!.needsUpdate = true;
    mesh.current!.geometry.setAttribute(
      "aOrder",
      new InstancedBufferAttribute(order, 1),
    );
    mesh.current!.geometry.setAttribute(
      "aRoof",
      new InstancedBufferAttribute(roofData, 4),
    );
    mesh.current!.geometry.setAttribute(
      "aRoofBase",
      new InstancedBufferAttribute(roofBase, 2),
    );
    // Vertex displacement follows roofs above the CPU-side plane bounds.
    mesh.current!.frustumCulled = false;
  }, [village, side, order]);
  useFrame(() => {
    material.current!.uniforms.uReveal.value = reveal.current;
    mesh.current!.visible = reveal.current < 1;
  }, -1);
  return (
    <instancedMesh
      name="qr-module-mask"
      ref={mesh}
      args={[undefined, undefined, count]}
      renderOrder={10}
    >
      <planeGeometry args={[1, 1, subdivisions, subdivisions]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        side={DoubleSide}
        transparent
        depthWrite={false}
        depthTest={false}
        toneMapped={false}
      />
    </instancedMesh>
  );
}

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
import type { QRHanokVillageArchitecture } from "../types";
import type { Village } from "../utils/villageGenerator";
import { housePlots, roofProfile } from "../utils/housePlots";
import { tileOrder } from "../utils/transition";

const vertexShader = `
attribute float aOrder;
attribute vec4 aRoof;
attribute vec2 aRoofBase;
attribute vec4 aUpperRoof;

float surfaceHeight(vec2 point, vec4 roof, vec2 base, bool extend) {
  if (roof.z <= 0.0) return 0.005;
  vec2 q = (point - roof.xy) / roof.zw;
  if (!extend && (abs(q.x) > .5 || abs(q.y) > .5)) return 0.005;
  q = clamp(q, vec2(-0.5), vec2(0.5));
  float t = 2.0 * abs(q.y);
  float u;
  if (abs(q.x) <= 0.38 + 0.12 * t) {
    u = 0.5 + q.x / (0.76 + 0.24 * t);
  } else {
    t = clamp((abs(q.x) - 0.38) / 0.12, 0.0, 1.0);
    u = 0.5 + q.y / max(t, 0.0001);
  }
  float height = 0.34 * pow(1.0-t, 1.3) + 0.025 * pow(t, 8.0)
    + 0.01 * cos(u * 75.398224) + 0.003 * cos(t * 56.548668);
  vec2 local = point - roof.xy;
  if (base.y > 0.5 && abs(local.x) < roof.z * 0.39 && abs(local.y) < 0.038 * base.y) {
    float ridgeZ = local.y / base.y;
    height = max(height, 0.365 + sqrt(max(0.0, 0.038*0.038-ridgeZ*ridgeZ)));
  }
  return base.x + height * base.y + 0.008;
}
float roofHeight(vec2 point) {
  float height = surfaceHeight(point, aRoof, aRoofBase, true);
  if (aUpperRoof.x > 0.0) height = max(height, surfaceHeight(point, vec4(aRoof.xy,aUpperRoof.xy),aUpperRoof.zw,false));
  return height;
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
  architecture = "hanok",
}: {
  village: Village;
  architecture?: QRHanokVillageArchitecture;
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
      roofBase = new Float32Array(count * 2),
      upperRoof = new Float32Array(count * 4);
    const occupied = new Set(village.lots.map((l) => `${l.x},${l.z}`));
    for (let row = 0; row < side; row++)
      for (let col = 0; col < side; col++) {
        const x = col - 4 - (village.size - 1) / 2,
          z = row - 4 - (village.size - 1) / 2,
          index = row * side + col;
        object.position.set(x, 0, z);
        const plot = roofByCell.get(`${x},${z}`);
        if (plot) {
          const roof = roofProfile(plot, architecture);
          roofData.set([plot.x, plot.z, roof.width, roof.depth], index * 4);
          roofBase.set([roof.baseY, roof.heightScale], index * 2);
          if (roof.upper)
            upperRoof.set(
              [
                roof.upper.width,
                roof.upper.depth,
                roof.upper.baseY,
                roof.upper.heightScale,
              ],
              index * 4,
            );
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
    function attribute(name: string, array: Float32Array, size: number) {
      const current = mesh.current!.geometry.getAttribute(name);
      if (current && current.array.length === array.length) {
        current.array.set(array);
        current.needsUpdate = true;
      } else
        mesh.current!.geometry.setAttribute(
          name,
          new InstancedBufferAttribute(array, size),
        );
    }
    attribute("aOrder", order, 1);
    attribute("aRoof", roofData, 4);
    attribute("aRoofBase", roofBase, 2);
    attribute("aUpperRoof", upperRoof, 4);
    // Vertex displacement follows roofs above the CPU-side plane bounds.
    mesh.current!.frustumCulled = false;
  }, [village, side, order, architecture]);
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

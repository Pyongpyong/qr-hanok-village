import { BufferGeometry, Float32BufferAttribute } from "three";

/** Four curved roof slopes: a long ridge, restrained hipped ends and shallow lifted eaves. */
export function createHanokRoof() {
  const positions: number[] = [],
    indices: number[] = [];
  const columns = 48,
    rows = 16;
  function patch(point: (u: number, t: number) => number[]) {
    const offset = positions.length / 3;
    for (let j = 0; j <= rows; j++)
      for (let i = 0; i <= columns; i++)
        positions.push(...point(i / columns, j / rows));
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < columns; i++) {
        const a = offset + j * (columns + 1) + i,
          b = a + columns + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
  }
  const height = (u: number, t: number) =>
    0.34 * Math.pow(1 - t, 1.3) +
    0.025 * Math.pow(t, 8) +
    0.01 * Math.cos(u * Math.PI * 24) +
    0.003 * Math.cos(t * Math.PI * 18);
  for (const side of [-1, 1]) {
    patch((u, t) => [
      (u - 0.5) * (0.76 + 0.24 * t),
      height(u, t),
      side * t * 0.5,
    ]);
    patch((u, t) => [side * (0.38 + 0.12 * t), height(u, t), (u - 0.5) * t]);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

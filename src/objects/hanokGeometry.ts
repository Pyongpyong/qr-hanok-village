import { BufferGeometry, Float32BufferAttribute } from "three";

/** Four curved roof slopes: a short ridge, hipped ends and gently lifted eaves. */
export function createHanokRoof() {
  const positions: number[] = [],
    indices: number[] = [];
  const columns = 40,
    rows = 18;
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
    0.36 * Math.pow(1 - t, 1.5) +
    0.075 * Math.pow(t, 8) +
    0.012 * Math.cos(u * Math.PI * 40) +
    0.003 * Math.cos(t * Math.PI * 18);
  for (const side of [-1, 1]) {
    patch((u, t) => [
      (u - 0.5) * (0.56 + 0.44 * t),
      height(u, t),
      side * t * 0.5,
    ]);
    patch((u, t) => [side * (0.28 + 0.22 * t), height(u, t), (u - 0.5) * t]);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

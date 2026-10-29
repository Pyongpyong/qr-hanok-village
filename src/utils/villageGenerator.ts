import QRCode from "qrcode";
export function seededRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++)
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export type Kind = "small" | "large" | "wall" | "pavilion" | "jars";
export interface Lot {
  x: number;
  z: number;
  height: number;
  kind: Kind;
}
export function generateVillage(value: string, seed: string | number = value) {
  const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
  const size = qr.modules.size,
    random = seededRandom(String(seed));
  const lots: Lot[] = [],
    lanes: { x: number; z: number }[] = [];
  const kinds: Kind[] = [
    "small",
    "small",
    "large",
    "wall",
    "pavilion",
    "small",
    "jars",
  ];
  for (let row = 0; row < size; row++)
    for (let col = 0; col < size; col++) {
      const x = col - (size - 1) / 2,
        z = row - (size - 1) / 2;
      if (qr.modules.get(row, col))
        lots.push({
          x,
          z,
          height: 0.45 + random() * 0.6,
          kind: kinds[Math.floor(random() * kinds.length)],
        });
      else lanes.push({ x, z });
    }
  return { size, lots, lanes };
}
export type Village = ReturnType<typeof generateVillage>;
/** Walk only between orthogonally adjacent white modules. */
export function makeRoute(lanes: Village["lanes"], seed: string) {
  const random = seededRandom(seed),
    keys = new Set(lanes.map((p) => `${p.x},${p.z}`));
  const usable = lanes.filter((p) =>
    [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].some(([x, z]) => keys.has(`${p.x + x},${p.z + z}`)),
  );
  if (!usable.length) return [];
  let p = usable[Math.floor(random() * usable.length)];
  const route = [p];
  for (let i = 0; i < 48; i++) {
    const neighbors = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]
      .map(([x, z]) => ({ x: p.x + x, z: p.z + z }))
      .filter((q) => keys.has(`${q.x},${q.z}`));
    p = neighbors[Math.floor(random() * neighbors.length)];
    route.push(p);
  }
  return [...route, ...route.slice(1, -1).reverse()];
}

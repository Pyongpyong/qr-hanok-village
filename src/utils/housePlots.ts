import type { Lot } from "./villageGenerator";

export interface HousePlot {
  x: number;
  z: number;
  w: number;
  d: number;
  lot: Lot;
}

/** Roof footprints cover the occupied QR cells exactly, without an inset. */
export function housePlots(lots: Lot[]) {
  const occupied = new Map(lots.map((l) => [`${l.x},${l.z}`, l])),
    used = new Set<string>();
  const houses: HousePlot[] = [];
  for (const lot of lots) {
    const { x, z } = lot;
    if (used.has(`${x},${z}`)) continue;
    let w = 1,
      d = 1;
    for (const [cw, cd] of [
      [3, 2],
      [2, 2],
      [3, 1],
      [2, 1],
      [1, 2],
    ]) {
      let fits = true;
      for (let dx = 0; dx < cw; dx++)
        for (let dz = 0; dz < cd; dz++)
          if (
            !occupied.has(`${x + dx},${z + dz}`) ||
            used.has(`${x + dx},${z + dz}`)
          )
            fits = false;
      if (fits) {
        w = cw;
        d = cd;
        break;
      }
    }
    for (let dx = 0; dx < w; dx++)
      for (let dz = 0; dz < d; dz++) used.add(`${x + dx},${z + dz}`);
    houses.push({
      x: x + (w - 1) / 2,
      z: z + (d - 1) / 2,
      w,
      d,
      lot,
    });
  }
  return houses;
}

/** Shared by the visible roofs and their conforming QR tiles. */
export function roofProfile(plot: HousePlot) {
  const wallOnly = plot.lot.kind === "wall" && plot.w === 1 && plot.d === 1;
  return {
    width: plot.w,
    depth: plot.d,
    baseY: wallOnly ? 0.53 : 0.14 + 0.61 + plot.lot.height * 0.16,
    heightScale: wallOnly ? 0.4 : 1,
    wallOnly,
  };
}

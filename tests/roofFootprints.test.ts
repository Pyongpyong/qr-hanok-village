import { test } from "node:test";
import assert from "node:assert/strict";
import { housePlots, roofProfile } from "../src/utils/housePlots";
import { generateVillage, type Lot } from "../src/utils/villageGenerator";
import { createHanokRoof } from "../src/objects/hanokGeometry";

test("every roof covers exactly the full union of its black QR cells", () => {
  const village = generateVillage("https://example.com", "bukchon"),
    covered = new Set<string>();
  let area = 0;
  for (const plot of housePlots(village.lots)) {
    const roof = roofProfile(plot);
    assert.equal(roof.width, plot.w);
    assert.equal(roof.depth, plot.d);
    area += roof.width * roof.depth;
    assert.equal(plot.x - roof.width / 2, plot.lot.x - 0.5);
    assert.equal(plot.z - roof.depth / 2, plot.lot.z - 0.5);
    for (let dx = 0; dx < plot.w; dx++)
      for (let dz = 0; dz < plot.d; dz++) {
        const key = `${plot.lot.x + dx},${plot.lot.z + dz}`;
        assert.equal(covered.has(key), false);
        covered.add(key);
      }
  }
  assert.equal(area, village.lots.length);
  assert.deepEqual(covered, new Set(village.lots.map((l) => `${l.x},${l.z}`)));
});
test("an isolated wall roof is a full 1x1 tile, not a narrow strip", () => {
  const lot: Lot = { x: 0, z: 0, height: 0.7, kind: "wall" };
  const plot = housePlots([lot])[0],
    roof = roofProfile(plot);
  assert.equal(roof.wallOnly, true);
  assert.equal(roof.width, 1);
  assert.equal(roof.depth, 1);
});
test("hipped roof geometry covers its entire normalized rectangular footprint", () => {
  const geometry = createHanokRoof(),
    position = geometry.getAttribute("position"),
    indices = geometry.index!;
  let area = 0;
  for (let i = 0; i < indices.count; i += 3) {
    const a = indices.getX(i),
      b = indices.getX(i + 1),
      c = indices.getX(i + 2);
    area +=
      Math.abs(
        (position.getX(b) - position.getX(a)) *
          (position.getZ(c) - position.getZ(a)) -
          (position.getX(c) - position.getX(a)) *
            (position.getZ(b) - position.getZ(a)),
      ) / 2;
  }
  assert.ok(Math.abs(area - 1) < 1e-6);
  geometry.dispose();
});

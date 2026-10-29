import { test } from "node:test";
import assert from "node:assert/strict";
import { createHouseLight, houseBrightness } from "../src/utils/houseLight";
import { createResidents } from "../src/utils/residents";
import { generateVillage } from "../src/utils/villageGenerator";
test("house lights are reproducible and vary independently over time", () => {
  const a = createHouseLight("house-a"),
    b = createHouseLight("house-b");
  assert.deepEqual(a, createHouseLight("house-a"));
  assert.notDeepEqual(a, b);
  const values = Array.from({ length: 200 }, (_, i) =>
    houseBrightness(a, i * 0.2),
  );
  assert.ok(values.every((v) => v >= 0.06 && v <= 1.56));
  assert.ok(Math.max(...values) - Math.min(...values) > 0.5);
  assert.notEqual(houseBrightness(a, 3), houseBrightness(b, 3));
  const boundary = a.period * 10 - a.offset;
  assert.ok(
    Math.abs(
      houseBrightness(a, boundary - 1e-5) - houseBrightness(a, boundary + 1e-5),
    ) < 1e-7,
  );
});
test("default crowd contains eight people, eight dogs, and eight cats on white alleys", () => {
  const v = generateVillage("https://example.com"),
    crowd = createResidents(v, 24, "bukchon");
  assert.equal(crowd.length, 24);
  assert.deepEqual(crowd, createResidents(v, 24, "bukchon"));
  for (const kind of ["person", "dog", "cat"])
    assert.equal(crowd.filter((r) => r.kind === kind).length, 8);
  const white = new Set(v.lanes.map((p) => `${p.x},${p.z}`));
  for (const r of crowd)
    for (let i = 0; i < r.route.length; i++) {
      const p = r.route[i],
        next = r.route[(i + 1) % r.route.length];
      assert.ok(white.has(`${p.x},${p.z}`));
      assert.equal(Math.abs(p.x - next.x) + Math.abs(p.z - next.z), 1);
    }
  assert.ok(new Set(crowd.map((r) => r.offset)).size > 20);
  assert.ok(new Set(crowd.map((r) => r.speed)).size > 20);
});
test("crowd controls handle zero, oversized, and unusable populations", () => {
  const v = generateVillage("https://example.com");
  assert.equal(createResidents(v, 0, "a").length, 0);
  assert.equal(createResidents(v, 1000, "a").length, 96);
  assert.equal(createResidents({ ...v, lanes: [] }, 24, "a").length, 0);
});

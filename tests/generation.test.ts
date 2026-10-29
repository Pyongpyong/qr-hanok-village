import { test } from "node:test";
import assert from "node:assert/strict";
import QRCode from "qrcode";
import { generateVillage, makeRoute } from "../src/utils/villageGenerator";
test("every dark module maps exactly to one lot, with the correct orientation", () => {
  const value = "https://example.com",
    v = generateVillage(value),
    q = QRCode.create(value, { errorCorrectionLevel: "M" });
  for (let r = 0; r < v.size; r++)
    for (let c = 0; c < v.size; c++)
      assert.equal(
        v.lots.some(
          (p) => p.x === c - (v.size - 1) / 2 && p.z === r - (v.size - 1) / 2,
        ),
        !!q.modules.get(r, c),
      );
  assert.equal(v.lots.length + v.lanes.length, v.size * v.size);
});
test("layout is deterministic and a different seed changes geometry without changing QR", () => {
  const a = generateVillage("hello", "one");
  assert.deepEqual(a, generateVillage("hello", "one"));
  const b = generateVillage("hello", "two");
  assert.notDeepEqual(a.lots, b.lots);
  assert.deepEqual(
    a.lots.map(({ x, z }) => [x, z]),
    b.lots.map(({ x, z }) => [x, z]),
  );
});
test("residents remain in connected white-module alleys, including loop seam", () => {
  const v = generateVillage("https://example.com"),
    route = makeRoute(v.lanes, "cat");
  assert.ok(route.length > 1);
  route.forEach((p, i) => {
    assert.ok(v.lanes.some((q) => q.x === p.x && q.z === p.z));
    const next = route[(i + 1) % route.length];
    assert.ok(Math.abs(p.x - next.x) + Math.abs(p.z - next.z) <= 1);
  });
});

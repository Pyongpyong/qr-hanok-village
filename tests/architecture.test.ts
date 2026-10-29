import { test } from "node:test";
import assert from "node:assert/strict";
import { housePlots, roofProfile } from "../src/utils/housePlots";
import { generateVillage } from "../src/utils/villageGenerator";
import type { QRHanokVillageArchitecture } from "../src/types";
const presets: QRHanokVillageArchitecture[] = ["hanok", "palace"];
test("all architecture styles retain exact QR footprints and shared tile heights", () => {
  const village = generateVillage("https://example.com", "bukchon"),
    plots = housePlots(village.lots);
  const counts: number[] = [];
  for (const preset of presets) {
    let area = 0,
      tiers = 0;
    for (const plot of plots) {
      const roof = roofProfile(plot, preset);
      area += roof.width * roof.depth;
      assert.equal(roof.width, plot.w);
      assert.equal(roof.depth, plot.d);
      if (roof.upper) {
        tiers++;
        assert.ok(
          roof.upper.width < roof.width && roof.upper.depth < roof.depth,
        );
        assert.ok(roof.upper.baseY > roof.baseY);
        assert.ok(roof.upper.heightScale > 0);
      }
    }
    assert.equal(area, village.lots.length);
    counts.push(tiers);
  }
  assert.equal(counts[0], 0);
  assert.ok(counts[1] > 0);
});

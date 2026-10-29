import { test } from "node:test";
import assert from "node:assert/strict";
import { transitionFrame, tileOrder } from "../src/utils/transition";

test("short tile dissolve and camera movement start together", () => {
  const middle = transitionFrame("village", 175, 2000);
  assert.equal(middle.reveal, 0.5);
  assert.ok(middle.camera > 0 && middle.camera < 1);
  assert.equal(middle.done, false);
  const tilesDone = transitionFrame("village", 350, 2000);
  assert.equal(tilesDone.reveal, 1);
  assert.ok(tilesDone.camera > 0 && tilesDone.camera < 1);
  assert.equal(tilesDone.done, false);
  assert.deepEqual(transitionFrame("village", 2000, 2000), {
    camera: 1,
    reveal: 1,
    done: true,
  });
});
test("QR tiles remain absent until the final camera-return segment", () => {
  for (const time of [0, 175, 350, 800, 1649, 1650]) {
    const frame = transitionFrame("qr", time, 2000);
    assert.equal(frame.reveal, 1);
    assert.equal(frame.done, false);
  }
  const restoring = transitionFrame("qr", 1825, 2000);
  assert.equal(restoring.reveal, 0.5);
  assert.ok(restoring.camera > 0 && restoring.camera < 1);
  for (const time of [0, 175, 350, 800, 1650, 1825, 2000]) {
    const forward = transitionFrame("village", 2000 - time, 2000),
      reverse = transitionFrame("qr", time, 2000);
    assert.ok(Math.abs(forward.camera - reverse.camera) < 1e-12);
    assert.ok(Math.abs(forward.reveal - reverse.reveal) < 1e-12);
  }
  assert.deepEqual(transitionFrame("qr", 2000, 2000), {
    camera: 0,
    reveal: 0,
    done: true,
  });
});
test("short overall transitions keep the tile phase shorter than the camera movement", () => {
  assert.equal(transitionFrame("village", 50, 400).reveal, 0.5);
  const frame = transitionFrame("village", 100, 400);
  assert.equal(frame.reveal, 1);
  assert.ok(frame.camera < 1);
  assert.equal(frame.done, false);
  assert.equal(transitionFrame("qr", 300, 400).reveal, 1);
  assert.equal(transitionFrame("qr", 350, 400).reveal, 0.5);
  assert.equal(transitionFrame("qr", 400, 400).reveal, 0);
});
test("zero-duration transitions reach stable endpoints immediately", () => {
  assert.deepEqual(transitionFrame("village", 0, 0), {
    camera: 1,
    reveal: 1,
    done: true,
  });
  assert.deepEqual(transitionFrame("qr", 0, -1), {
    camera: 0,
    reveal: 0,
    done: true,
  });
  assert.equal(transitionFrame("village", 1400, NaN).done, true);
});
test("tile order is a seeded permutation that covers every cell exactly once", () => {
  const a = tileOrder(49, "village-a");
  assert.deepEqual(a, tileOrder(49, "village-a"));
  assert.notDeepEqual(a, tileOrder(49, "village-b"));
  assert.equal(new Set(a).size, 49);
  assert.equal(Math.min(...a), 0);
  assert.equal(Math.max(...a), 1);
  assert.deepEqual(tileOrder(1, "a"), new Float32Array([0]));
  assert.deepEqual(tileOrder(0, "a"), new Float32Array([]));
});

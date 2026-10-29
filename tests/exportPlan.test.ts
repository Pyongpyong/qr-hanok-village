import { transitionFrame } from "../src/utils/transition";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cinematicFrame,
  dimensions,
  encodingArgs,
  validateOptions,
  type ExportOptions,
} from "../demo/export/plan";
const options: ExportOptions = {
  format: "mp4",
  aspect: "square",
  resolution: 540,
  duration: 8,
  fps: 24,
  lighting: "day",
};
test("social dimensions preserve aspect ratios and even H.264 dimensions", () => {
  assert.deepEqual(dimensions("square", 1080), { width: 1080, height: 1080 });
  assert.deepEqual(dimensions("portrait", 1080), { width: 1080, height: 1920 });
  assert.deepEqual(dimensions("landscape", 540), { width: 960, height: 540 });
});
test("exports move immediately with the same transition timing as the web and never orbit", () => {
  for (const duration of [8, 20, 30]) {
    const settings = { ...options, duration, transitionDuration: 1400 };
    const count = duration * options.fps;
    for (const index of [1, 8, 20, 33]) {
      const frame = cinematicFrame(index, count, settings);
      const expected = transitionFrame("village", index / options.fps * 1000, 1400);
      assert.equal(frame.camera, expected.camera);
      assert.equal(frame.reveal, expected.reveal);
      assert.ok(frame.camera > 0);
    }
    assert.equal(cinematicFrame(34, count, settings).camera, 1);
    const frames = Array.from({ length: count }, (_, i) => cinematicFrame(i, count, settings));
    assert.ok(frames.every(f => f.yaw === 0));
    assert.equal(frames[0].reveal, 0);
    assert.equal(frames.at(-1)!.reveal, 0);
    assert.equal(frames.at(-1)!.camera, 0);
  }
});
test("lighting is deterministic and selected night applies to all frames", () => {
  for (const index of [0, 50, 100, 191])
    assert.equal(cinematicFrame(index, 192, { ...options, lighting: "night" }).daylight, 0);
  const a = cinematicFrame(96, 193, { ...options, lighting: "cycle" });
  assert.equal(a.daylight, 0);
});
test("animated image limits prevent oversized export settings", () => {
  validateOptions(options);
  validateOptions({ ...options, format: "gif", fps: 15 });
  assert.throws(() => validateOptions({ ...options, format: "gif" }));
  assert.throws(() =>
    validateOptions({ ...options, format: "apng", resolution: 1080, fps: 15 }),
  );
  assert.throws(() => validateOptions({ ...options, duration: NaN }));
  assert.throws(() => validateOptions({ ...options, fps: 999 }));
});
test("encoding uses social video pixels and looping animated formats", () => {
  const mp4 = encodingArgs("mp4", 24);
  assert.ok(mp4.includes("yuv420p"));
  assert.ok(mp4.includes("+faststart"));
  assert.equal(mp4.at(-1), "output.mp4");
  const gif = encodingArgs("gif", 15);
  assert.equal(gif[gif.indexOf("-loop") + 1], "0");
  const apng = encodingArgs("apng", 12);
  assert.equal(apng[apng.indexOf("-plays") + 1], "0");
  assert.equal(apng.at(-1), "output.apng");
});

test("30-second exports are valid for all formats and zoom in slowly in village view", () => {
  for (const format of ["mp4", "gif", "apng"] as const)
    validateOptions({ ...options, format, duration: 30, fps: 15 });
  assert.throws(() => validateOptions({ ...options, duration: 31 }));
  const a = cinematicFrame(75, 201, options),
    b = cinematicFrame(125, 201, options);
  assert.ok(a.zoom >= 1 && b.zoom > a.zoom && b.zoom <= 1.35);
  assert.equal(cinematicFrame(0, 201, options).zoom, 1);
  assert.equal(cinematicFrame(200, 201, options).zoom, 1);
});

test("village zoom grows visibly throughout the hold and honors custom web transition duration", () => {
  const settings = { ...options, duration: 20, transitionDuration: 600 };
  const count = 480;
  assert.equal(cinematicFrame(15, count, settings).camera, 1);
  const start = cinematicFrame(16, count, settings);
  const end = cinematicFrame(463, count, settings);
  assert.ok(end.zoom / start.zoom > 1.3);
});


test("optional rotation accompanies zoom, reaches the requested angle and returns with the QR", () => {
  for (const format of ["mp4", "gif", "apng"] as const) {
    for (const degrees of [-360, -90, 0, 90, 180, 360]) {
      const settings = { ...options, format, fps: 15, duration: 10, transitionDuration: 1000, rotate: true, rotationDegrees: degrees };
      validateOptions(settings);
      // 151 frames places the hold boundaries exactly at 1 and 9 seconds.
      const start = cinematicFrame(15, 151, settings);
      const middle = cinematicFrame(75, 151, settings);
      const final = cinematicFrame(135, 151, settings);
      assert.equal(start.yaw, 0);
      assert.ok(Math.abs(middle.yaw - degrees * Math.PI / 360) < 1e-10);
      assert.ok(Math.abs(final.yaw - degrees * Math.PI / 180) < 1e-10);
      assert.ok(middle.zoom > start.zoom && final.zoom > middle.zoom);
      const returning = cinematicFrame(142, 151, settings);
      assert.ok(Math.abs(returning.yaw) <= Math.abs(final.yaw));
      assert.equal(cinematicFrame(150, 151, settings).yaw, 0);
      assert.equal(cinematicFrame(75, 151, { ...settings, rotate: false }).yaw, 0);
    }
  }
});
test("rotation angles reject invalid values", () => {
  for (const rotationDegrees of [NaN, Infinity, -361, 361])
    assert.throws(() => validateOptions({ ...options, rotate: true, rotationDegrees }));
});


test("configurable zoom reaches the requested magnification in every format and returns to its start", () => {
  for (const format of ["mp4", "gif", "apng"] as const) {
    for (const zoomPercent of [0, 10, 35, 100, 200]) {
      const settings = { ...options, format, fps: 15, duration: 10, transitionDuration: 1000, zoomPercent, rotate: true, rotationDegrees: 90 };
      validateOptions(settings);
      assert.equal(cinematicFrame(15, 151, settings).zoom, 1);
      assert.ok(Math.abs(cinematicFrame(75, 151, settings).zoom - (1 + zoomPercent / 200)) < 1e-10);
      assert.ok(Math.abs(cinematicFrame(135, 151, settings).zoom - (1 + zoomPercent / 100)) < 1e-10);
      assert.equal(cinematicFrame(150, 151, settings).zoom, 1);
      assert.ok(cinematicFrame(75, 151, settings).yaw > 0);
    }
  }
});
test("zoom rejects invalid percentages", () => {
  for (const zoomPercent of [-1, 201, NaN, Infinity])
    assert.throws(() => validateOptions({ ...options, zoomPercent }));
});

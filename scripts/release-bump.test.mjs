import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { classify, bumpFor, releaseBump } from "./release-bump.mjs";
import { shouldPublish } from "./release-plan.mjs";
test("Conventional Commits select the largest semantic version bump", () => {
  assert.equal(classify("feat: a"), "minor");
  assert.equal(classify("fix(core): b"), "patch");
  assert.equal(classify("perf: c"), "patch");
  assert.equal(classify("refactor: d"), "patch");
  assert.equal(classify("revert: e"), "patch");
  assert.equal(classify("feat!: changed"), "major");
  assert.equal(classify("fix: changed", "BREAKING CHANGE: new API"), "major");
  assert.equal(classify("docs: update"), "none");
  assert.equal(classify("chore(release): v1.0.0"), "none");
  assert.equal(
    bumpFor([{ subject: "fix: a" }, { subject: "feat: b" }]),
    "minor",
  );
  assert.equal(bumpFor([]), "none");
});
test("a fresh repository keeps its initial version, then only unreleased commits count", () => {
  const cwd = mkdtempSync(join(tmpdir(), "hanok-release-"));
  const git = (...args) =>
    execFileSync("git", args, {
      cwd,
      stdio: "pipe",
      env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1" },
    });
  try {
    git("init", "-b", "main");
    assert.equal(releaseBump(cwd), "none");
    git("config", "user.name", "Release Test");
    git("config", "user.email", "release@example.com");
    writeFileSync(join(cwd, "README.md"), "initial");
    git("add", "README.md");
    git("commit", "-m", "feat: initial");
    assert.equal(releaseBump(cwd), "none");
    git("tag", "v0.1.0");
    git("commit", "--allow-empty", "-m", "docs: update");
    assert.equal(releaseBump(cwd), "none");
    git("commit", "--allow-empty", "-m", "fix: patch");
    assert.equal(releaseBump(cwd), "patch");
    git("commit", "--allow-empty", "-m", "feat: feature");
    assert.equal(releaseBump(cwd), "minor");
    git("commit", "--allow-empty", "-m", "feat!: API");
    assert.equal(releaseBump(cwd), "major");
    git("tag", "v1.0.0");
    assert.equal(releaseBump(cwd), "none");
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
test("release retries skip existing versions and only a real 404 permits publishing", async () => {
  assert.equal(
    await shouldPublish("qr-hanok-village", "0.1.0", async () => ({
      status: 404,
      ok: false,
    })),
    true,
  );
  assert.equal(
    await shouldPublish("qr-hanok-village", "0.1.0", async () => ({
      status: 200,
      ok: true,
    })),
    false,
  );
  await assert.rejects(
    shouldPublish("qr-hanok-village", "0.1.0", async () => ({
      status: 503,
      ok: false,
    })),
    /registry check failed/,
  );
  await assert.rejects(
    shouldPublish("qr-hanok-village", "0.1.0", async () => {
      throw new Error("offline");
    }),
    /offline/,
  );
});

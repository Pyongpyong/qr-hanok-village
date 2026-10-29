import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { classify, bumpFor, releaseBump } from "./release-bump.mjs";
import { shouldPublish, releasePlanBump } from "./release-plan.mjs";
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

test("manual npm publication is the baseline even when tags are missing or point at skipped releases", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "hanok-bootstrap-"));
  const git = (...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: "pipe" }).trim();
  try {
    git("init", "-b", "main");
    git("config", "user.name", "Release Test");
    git("config", "user.email", "release@example.com");
    git("commit", "--allow-empty", "-m", "feat: initial package");
    const gitHead = git("rev-parse", "HEAD");
    const fetcher = async () => ({ status: 200, ok: true, json: async () => ({ gitHead }) });
    assert.equal(await releasePlanBump("example", "0.1.0", { cwd, fetcher }), "none");
    git("commit", "--allow-empty", "-m", "feat: social exports");
    assert.equal(releaseBump(cwd), "none");
    assert.equal(await releasePlanBump("example", "0.1.0", { cwd, fetcher }), "minor");
    git("tag", "v0.1.0"); // The prior broken run tagged newer code without publishing it.
    assert.equal(releaseBump(cwd), "none");
    assert.equal(await releasePlanBump("example", "0.1.0", { cwd, fetcher }), "minor");
    git("commit", "--allow-empty", "-m", "chore(release): v0.2.0");
    git("tag", "v0.2.0");
    assert.equal(await releasePlanBump("example", "0.2.0", { cwd, fetcher: async () => ({ status: 404 }) }), "none");
    await assert.rejects(releasePlanBump("example", "0.2.0", { cwd, fetcher: async () => ({ status: 503 }) }), /metadata check failed/);
    await assert.rejects(releasePlanBump("example", "0.1.0", { cwd, fetcher: async () => ({ ok: true, json: async () => ({}) }) }), /no gitHead/);
    assert.throws(() => releaseBump(cwd, "not-a-sha"), /Invalid published gitHead/);
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});

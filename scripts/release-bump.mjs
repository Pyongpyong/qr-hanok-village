import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const RANK = { none: 0, patch: 1, minor: 2, major: 3 };
const PATCH_TYPES = new Set(["fix", "perf", "refactor", "revert"]);
export function classify(subject, body = "") {
  if (/^chore\(release\)/i.test(subject)) return "none";
  const match = /^(\w+)(?:\([^)]*\))?(!)?:/i.exec(subject.trim());
  if (!match) return "none";
  if (match[2] || /^BREAKING[ -]CHANGE:/m.test(body)) return "major";
  const type = match[1].toLowerCase();
  return type === "feat" ? "minor" : PATCH_TYPES.has(type) ? "patch" : "none";
}
export function bumpFor(commits) {
  return commits.reduce((best, c) => {
    const bump = classify(c.subject, c.body);
    return RANK[bump] > RANK[best] ? bump : best;
  }, "none");
}
export function releaseBump(cwd = process.cwd()) {
  const git = (...args) =>
    execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  try {
    git("rev-parse", "--verify", "--quiet", "HEAD");
  } catch (error) {
    if (error.status === 1) return "none";
    throw error;
  }
  const tag = git(
    "tag",
    "--merged",
    "HEAD",
    "--list",
    "v*",
    "--sort=-version:refname",
  )
    .split("\n")
    .find((t) => /^v\d+\.\d+\.\d+$/.test(t));
  // Bootstrap with package.json's current version, even in a one-commit repository.
  if (!tag) return "none";
  const commits = git("log", "--format=%s%x1f%b%x1e", `${tag}..HEAD`)
    .split("\x1e")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [subject, body = ""] = entry.split("\x1f");
      return { subject, body };
    });
  return bumpFor(commits);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  console.log(releaseBump());

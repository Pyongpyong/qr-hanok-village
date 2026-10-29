import { execFileSync } from "node:child_process";
import { readFileSync, appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { releaseBump } from "./release-bump.mjs";

export async function shouldPublish(name, version, fetcher = fetch) {
  const response = await fetcher(
    `https://registry.npmjs.org/${encodeURIComponent(name)}/${version}`,
  );
  if (response.status === 404) return true;
  if (response.ok) return false;
  throw new Error(
    `npm registry check failed (${response.status}); refusing to treat it as an unpublished version.`,
  );
}
async function main() {
  const bump = releaseBump();
  if (bump !== "none")
    execFileSync(
      "npm",
      ["version", bump, "--no-git-tag-version", "--ignore-scripts"],
      { stdio: "inherit" },
    );
  const { name, version } = JSON.parse(readFileSync("package.json", "utf8"));
  const publish = await shouldPublish(name, version);
  const outputs = `bump=${bump}\nversion=${version}\npublish=${publish}\n`;
  process.stdout.write(outputs);
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, outputs);
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `Release plan: **${name}@${version}**, bump: **${bump}**, publish: **${publish}**\n`,
    );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await main();

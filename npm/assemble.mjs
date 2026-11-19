import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { MAIN_PACKAGE, MCP_NAME, PLATFORMS, REPOSITORY_URL, SEMVER } from "./platforms.mjs";

const here = dirname(fileURLToPath(import.meta.url));

// `SM-CLI-07`
export const LICENSE = "SEE LICENSE IN LICENSE.md";

// `SM-CLI-07`
const common = (version) => ({
  version,
  license: LICENSE,
  homepage: "https://dten.com.br/cli",
  repository: { type: "git", url: REPOSITORY_URL },
});

// `SM-CLI-07`
export function platformManifest(platform, version) {
  return {
    name: platform.pkg,
    ...common(version),
    description: `The ${platform.key} binary of dten-speed. Install dten-speed instead of this package.`,
    os: [platform.os],
    cpu: [platform.cpu, ...(platform.alsoCpu ?? [])],
    files: ["bin", "LICENSE.md"],
    preferUnplugged: true,
  };
}

// `SM-CLI-07`
// `SM-CLI-09`
export function mainManifest(version) {
  return {
    name: MAIN_PACKAGE,
    ...common(version),
    description:
      "Internet speed test from the terminal, and an MCP server so AI assistants can measure this computer's connection. Free, no account.",
    keywords: ["speedtest", "speed-test", "internet-speed", "bandwidth", "cli", "mcp", "mcp-server", "dten"],
    mcpName: MCP_NAME,
    bin: { "dten-speed": "bin/dten-speed.cjs" },
    files: ["bin", "README.md", "LICENSE.md"],
    engines: { node: ">=18" },
    optionalDependencies: Object.fromEntries(PLATFORMS.map((p) => [p.pkg, version])),
  };
}

// `SM-CLI-07`
const write = (dir, manifest) => {
  mkdirSync(join(dir, "bin"), { recursive: true });
  writeFileSync(join(dir, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  copyFileSync(join(here, "..", "LICENSE.md"), join(dir, "LICENSE.md"));
};

// `SM-CLI-07`
export const RESERVED_VERSION = "0.0.0";

// `SM-CLI-07`
export function reserve(outDir) {
  const notice = "Reserved name: the first release of dten-speed is not out yet. See https://dten.com.br/cli\n";
  const dirs = [];
  for (const manifest of [...PLATFORMS.map((p) => platformManifest(p, RESERVED_VERSION)), mainManifest(RESERVED_VERSION)]) {
    const { optionalDependencies: _deps, bin: _bin, mcpName: _mcp, ...bare } = manifest;
    const dir = join(outDir, manifest.name.replace("@dten4you/speed-", "").replace("dten-speed", "main"));
    write(dir, { ...bare, files: ["README.md", "LICENSE.md"] });
    writeFileSync(join(dir, "README.md"), notice);
    dirs.push(dir);
  }
  return dirs;
}

// `SM-CLI-07`
export function assemble(releaseDir, version, outDir) {
  if (!SEMVER.test(version)) throw new Error(`not a release version: ${version}`);
  if (!existsSync(join(here, "..", "LICENSE.md"))) throw new Error("LICENSE.md is missing at the repository root");
  const dirs = [];
  for (const platform of PLATFORMS) {
    const dir = join(outDir, platform.key);
    write(dir, platformManifest(platform, version));
    const binary = join(dir, "bin", platform.exe);
    copyFileSync(join(releaseDir, platform.asset), binary);
    chmodSync(binary, 0o755);
    dirs.push(dir);
  }
  const main = join(outDir, "main");
  write(main, mainManifest(version));
  const launcher = join(main, "bin", "dten-speed.cjs");
  copyFileSync(join(here, "launcher.cjs"), launcher);
  chmodSync(launcher, 0o755);
  writeFileSync(join(main, "README.md"), readFileSync(join(here, "README.package.md"), "utf8"));
  dirs.push(main);
  return dirs;
}

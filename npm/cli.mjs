import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assemble, reserve } from "./assemble.mjs";
import { verifyRelease } from "./verify.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const option = (name) => {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : (process.argv[i + 1] ?? null);
};

// `SM-CLI-07`
function main() {
  const command = process.argv[2];
  if (command === "reserve") {
    const out = option("--out");
    if (out === null) throw new Error("reserve needs --out <dir>");
    for (const packageDir of reserve(resolve(out))) console.log(packageDir);
    return;
  }
  const version = option("--version");
  const dir = option("--dir");
  if (!["verify", "assemble"].includes(command) || version === null || dir === null) {
    console.error(
      "usage: node npm/cli.mjs verify|assemble --version <x.y.z> --dir <release> [--out <dir>]\n" +
        "       node npm/cli.mjs reserve --out <dir>",
    );
    process.exit(64);
  }
  const publicKey = readFileSync(join(here, "..", "minisign.pub"), "utf8");
  const sums = verifyRelease(resolve(dir), version, publicKey);
  console.log(`dten-speed ${version}: signature and ${sums.size} checksums verified`);
  if (command === "assemble") {
    const out = option("--out");
    if (out === null) throw new Error("assemble needs --out <dir>");
    for (const packageDir of assemble(resolve(dir), version, resolve(out))) console.log(packageDir);
  }
}

try {
  main();
} catch (error) {
  console.error(`dten-speed release: ${error.message}`);
  process.exit(1);
}

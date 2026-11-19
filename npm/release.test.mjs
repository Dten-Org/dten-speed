import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, randomBytes, sign } from "node:crypto";
import { mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";

import { assemble, mainManifest, reserve } from "./assemble.mjs";
import { parseSums, verifyRelease } from "./verify.mjs";
import { ASSETS, MCP_NAME, PLATFORMS } from "./platforms.mjs";

const require = createRequire(import.meta.url);
const launcher = require("./launcher.cjs");

function minisignKey() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const id = randomBytes(8);
  const raw = publicKey.export({ format: "der", type: "spki" }).subarray(12);
  const pub = `untrusted comment: test key\n${Buffer.concat([Buffer.from("Ed"), id, raw]).toString("base64")}\n`;
  const signText = (message, trustedComment) => {
    const sig = sign(null, createHash("blake2b512").update(message).digest(), privateKey);
    const global = sign(null, Buffer.concat([sig, Buffer.from(trustedComment)]), privateKey);
    const line = Buffer.concat([Buffer.from("ED"), id, sig]).toString("base64");
    return `untrusted comment: sig\n${line}\ntrusted comment: ${trustedComment}\n${global.toString("base64")}\n`;
  };
  return { pub, signText };
}

function release({ version = "1.2.3", comment, tamper, extraLine } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "dten-speed-"));
  const key = minisignKey();
  let sums = "";
  for (const asset of ASSETS) {
    const bytes = Buffer.from(`binary ${asset}`);
    writeFileSync(join(dir, asset), bytes);
    sums += `${createHash("sha256").update(bytes).digest("hex")}  ${asset}\n`;
  }
  if (extraLine) sums += extraLine;
  writeFileSync(join(dir, "SHA256SUMS"), sums);
  writeFileSync(join(dir, "SHA256SUMS.minisig"), key.signText(Buffer.from(sums), comment ?? `dten-speed ${version}`));
  if (tamper) writeFileSync(join(dir, tamper), "changed");
  return { dir, pub: key.pub, version };
}

describe("verifyRelease", () => {
  test("accepts a signed list whose sums match", () => {
    const r = release();
    assert.equal(verifyRelease(r.dir, r.version, r.pub).size, 5);
  });

  test("refuses a binary that is not the signed one", () => {
    const r = release({ tamper: "dten-speed-linux-x64" });
    assert.throws(() => verifyRelease(r.dir, r.version, r.pub), /dten-speed-linux-x64: sha256/);
  });

  test("refuses a signature made for another version", () => {
    const r = release({ comment: "dten-speed 1.2.2" });
    assert.throws(() => verifyRelease(r.dir, r.version, r.pub), /not "dten-speed 1.2.3"/);
  });

  test("refuses another key", () => {
    const r = release();
    assert.throws(() => verifyRelease(r.dir, r.version, minisignKey().pub), /does not verify/);
  });

  test("refuses a list with a file that is not a release asset", () => {
    const r = release({ extraLine: `${"0".repeat(64)}  extra\n` });
    assert.throws(() => verifyRelease(r.dir, r.version, r.pub), /must list exactly/);
  });

  test("refuses a version that is not x.y.z", () => {
    const r = release();
    assert.throws(() => verifyRelease(r.dir, "1.2.3-beta", r.pub), /not a release version/);
  });

  test("parseSums refuses a repeated file", () => {
    const line = `${"a".repeat(64)}  x\n`;
    assert.equal(parseSums(line + line), null);
  });
});

describe("assemble", () => {
  test("one package per platform with the binary, and the main package last", () => {
    const r = release();
    const out = mkdtempSync(join(tmpdir(), "dten-speed-out-"));
    const dirs = assemble(r.dir, r.version, out);
    assert.equal(dirs.length, 6);
    for (const [i, platform] of PLATFORMS.entries()) {
      const manifest = JSON.parse(readFileSync(join(dirs[i], "package.json"), "utf8"));
      assert.equal(manifest.name, platform.pkg);
      assert.deepEqual([manifest.os, manifest.cpu], [[platform.os], [platform.cpu, ...(platform.alsoCpu ?? [])]]);
      assert.equal(manifest.scripts, undefined);
      const binary = join(dirs[i], "bin", platform.exe);
      assert.equal(readFileSync(binary, "utf8"), `binary ${platform.asset}`);
      if (process.platform !== "win32") assert.ok(statSync(binary).mode & 0o111);
    }
    const main = JSON.parse(readFileSync(join(dirs[5], "package.json"), "utf8"));
    assert.equal(main.name, "dten-speed");
    assert.equal(main.scripts, undefined);
  });

  test("the main package pins every platform package to its own version, and names the MCP server", () => {
    const manifest = mainManifest("2.0.0");
    assert.deepEqual(Object.values(manifest.optionalDependencies), Array(5).fill("2.0.0"));
    assert.equal(manifest.mcpName, MCP_NAME);
  });
});

describe("reserve", () => {
  test("six empty 0.0.0 packages that install nothing and run nothing", () => {
    const out = mkdtempSync(join(tmpdir(), "dten-speed-reserve-"));
    const dirs = reserve(out);
    const names = dirs.map((d) => JSON.parse(readFileSync(join(d, "package.json"), "utf8")));
    assert.deepEqual(names.map((m) => m.name).sort(), [...PLATFORMS.map((p) => p.pkg), "dten-speed"].sort());
    for (const m of names) {
      assert.equal(m.version, "0.0.0");
      assert.equal(m.bin, undefined);
      assert.equal(m.optionalDependencies, undefined);
      assert.equal(m.scripts, undefined);
    }
  });
});

describe("launcher", () => {
  test("its table is the same as the release's platforms", () => {
    const fromPlatforms = PLATFORMS.flatMap((p) =>
      [p.cpu, ...(p.alsoCpu ?? [])].map((cpu) => [`${p.os}-${cpu}`, [p.pkg, p.exe]]),
    );
    assert.deepEqual(launcher.BINARIES, Object.fromEntries(fromPlatforms));
  });

  test("musl and unknown platforms get a message instead of a crash", () => {
    assert.match(launcher.binaryFor("linux", "x64", true).error, /musl/);
    assert.match(launcher.binaryFor("freebsd", "x64", false).error, /no binary for freebsd-x64/);
    assert.deepEqual(launcher.binaryFor("win32", "x64", false), {
      pkg: "@dten4you/speed-windows-x64",
      exe: "dten-speed.exe",
    });
  });

  test("with --json a failure is the JSON error of SM-CLI-04 on stdout; without it, only stderr", () => {
    const json = launcher.failureOutput(["--json"], "no binary");
    assert.deepEqual(JSON.parse(json.stdout), { schema: 1, error: "no_binary", message: "no binary" });
    assert.match(json.stderr, /no binary/);
    assert.equal(launcher.failureOutput([], "no binary").stdout, "");
  });

  test("a child killed by a signal exits with 128 + its number", () => {
    assert.equal(launcher.exitCodeOfSignal("SIGTERM"), 143);
    if (process.platform !== "win32") assert.equal(launcher.exitCodeOfSignal("SIGPIPE"), 141);
  });

  test("a missing optional package resolves to null", () => {
    const resolve = () => {
      throw new Error("MODULE_NOT_FOUND");
    };
    assert.equal(launcher.resolveBinary({ pkg: "@dten4you/speed-linux-x64", exe: "dten-speed" }, resolve), null);
  });
});

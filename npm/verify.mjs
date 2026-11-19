import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { parsePublicKey, verifySignature } from "./minisign.mjs";
import { ASSETS, SEMVER, trustedCommentOf } from "./platforms.mjs";

// `SM-CLI-07`
export function parseSums(text) {
  const sums = new Map();
  for (const line of text.split("\n")) {
    if (line === "") continue;
    const match = /^([0-9a-f]{64}) [ *](\S+)$/.exec(line);
    if (match === null || sums.has(match[2])) return null;
    sums.set(match[2], match[1]);
  }
  return sums;
}

// `SM-CLI-07`
export function verifyRelease(dir, version, publicKeyText) {
  if (!SEMVER.test(version)) throw new Error(`not a release version: ${version}`);
  const publicKey = parsePublicKey(publicKeyText);
  if (publicKey === null) throw new Error("minisign.pub is not a minisign public key");
  for (const name of ["SHA256SUMS", "SHA256SUMS.minisig", ...ASSETS]) {
    if (!existsSync(join(dir, name))) throw new Error(`missing from the release: ${name}`);
  }
  const list = readFileSync(join(dir, "SHA256SUMS"));
  const signed = verifySignature(publicKey, list, readFileSync(join(dir, "SHA256SUMS.minisig"), "utf8"));
  if (signed === null) throw new Error("SHA256SUMS.minisig does not verify with minisign.pub");
  if (signed.trustedComment !== trustedCommentOf(version)) {
    throw new Error(`the signature is for "${signed.trustedComment}", not "${trustedCommentOf(version)}"`);
  }
  const sums = parseSums(list.toString("utf8"));
  if (sums === null) throw new Error("SHA256SUMS is not one '<sha256>  <file>' per line");
  if ([...sums.keys()].sort().join(",") !== ASSETS.join(",")) {
    throw new Error(`SHA256SUMS must list exactly ${ASSETS.join(", ")}`);
  }
  for (const [name, expected] of sums) {
    const actual = createHash("sha256").update(readFileSync(join(dir, name))).digest("hex");
    if (actual !== expected) throw new Error(`${name}: sha256 ${actual}, the signed list says ${expected}`);
  }
  return sums;
}

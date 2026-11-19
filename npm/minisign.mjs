import { createHash, createPublicKey, verify } from "node:crypto";

// `SM-CLI-07`
function exactBase64(value, length) {
  const clean = value.trim();
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) return null;
  const bytes = Buffer.from(clean, "base64");
  return bytes.length === length ? bytes : null;
}

// `SM-CLI-07`
export function parsePublicKey(text) {
  const line =
    text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l !== "" && !l.startsWith("untrusted comment:"))[0] ?? null;
  const bytes = line === null ? null : exactBase64(line, 42);
  if (bytes === null || bytes.subarray(0, 2).toString("latin1") !== "Ed") return null;
  const spki = Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), bytes.subarray(10, 42)]);
  return { line, id: bytes.subarray(2, 10), key: createPublicKey({ key: spki, format: "der", type: "spki" }) };
}

// `SM-CLI-07`
export function verifySignature(publicKey, message, signatureText) {
  const lines = signatureText.split(/\r?\n/);
  if (lines.length < 4 || !lines[0].startsWith("untrusted comment:") || !lines[2].startsWith("trusted comment: ")) {
    return null;
  }
  const signature = exactBase64(lines[1], 74);
  const global = exactBase64(lines[3], 64);
  if (signature === null || global === null || !signature.subarray(2, 10).equals(publicKey.id)) return null;
  const algorithm = signature.subarray(0, 2).toString("latin1");
  const signed =
    algorithm === "ED" ? createHash("blake2b512").update(message).digest() : algorithm === "Ed" ? message : null;
  if (signed === null) return null;
  const sig = signature.subarray(10, 74);
  const trustedComment = lines[2].slice("trusted comment: ".length);
  const trusted = Buffer.from(trustedComment, "utf8");
  if (!verify(null, signed, publicKey.key, sig)) return null;
  if (!verify(null, Buffer.concat([sig, trusted]), publicKey.key, global)) return null;
  return { trustedComment };
}

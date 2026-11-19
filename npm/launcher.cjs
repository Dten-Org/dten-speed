#!/usr/bin/env node
"use strict";

const { spawn } = require("node:child_process");
const { accessSync, chmodSync, constants } = require("node:fs");
const { constants: osConstants } = require("node:os");
const { dirname, join } = require("node:path");

// `SM-CLI-07`
// Windows 11 on Arm runs the x64 binary under emulation, so win32-arm64 uses the x64 package.
const BINARIES = {
  "linux-x64": ["@dten4you/speed-linux-x64", "dten-speed"],
  "linux-arm64": ["@dten4you/speed-linux-arm64", "dten-speed"],
  "darwin-arm64": ["@dten4you/speed-macos-arm64", "dten-speed"],
  "darwin-x64": ["@dten4you/speed-macos-x64", "dten-speed"],
  "win32-x64": ["@dten4you/speed-windows-x64", "dten-speed.exe"],
  "win32-arm64": ["@dten4you/speed-windows-x64", "dten-speed.exe"],
};

// `SM-CLI-03`
const NOT_MEASURED = 2;

// `SM-CLI-07`
function isMusl() {
  if (process.platform !== "linux") return false;
  const header = process.report && process.report.getReport().header;
  return Boolean(header) && !header.glibcVersionRuntime;
}

// `SM-CLI-07`
function binaryFor(platform, arch, musl) {
  if (musl) return { error: "dten-speed needs glibc; Alpine and other musl systems are not supported." };
  const entry = BINARIES[`${platform}-${arch}`];
  if (!entry) {
    const supported = Object.keys(BINARIES).join(", ");
    return { error: `dten-speed has no binary for ${platform}-${arch}. Supported: ${supported}.` };
  }
  return { pkg: entry[0], exe: entry[1] };
}

// `SM-CLI-07`
function resolveBinary(found, resolve) {
  try {
    return join(dirname(resolve(`${found.pkg}/package.json`)), "bin", found.exe);
  } catch {
    return null;
  }
}

// `SM-CLI-04`
function failureOutput(args, message) {
  const json = args.includes("--json");
  return {
    stdout: json ? `${JSON.stringify({ schema: 1, error: "no_binary", message })}\n` : "",
    stderr: `dten-speed: ${message}\nMeasure in the browser instead: https://dten.com.br\n`,
  };
}

// `SM-CLI-07`
function exitCodeOfSignal(signal) {
  return 128 + (osConstants.signals[signal] || 0);
}

// `SM-CLI-07`
function fail(args, message) {
  const out = failureOutput(args, message);
  process.stdout.write(out.stdout);
  process.stderr.write(out.stderr);
  process.exit(NOT_MEASURED);
}

// `SM-CLI-07`
function ensureExecutable(path) {
  if (process.platform === "win32") return true;
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    try {
      chmodSync(path, 0o755);
      return true;
    } catch {
      return false;
    }
  }
}

// `SM-CLI-07`
function main() {
  const args = process.argv.slice(2);
  const found = binaryFor(process.platform, process.arch, isMusl());
  if (found.error) fail(args, found.error);
  const binary = resolveBinary(found, require.resolve);
  if (binary === null) {
    fail(
      args,
      `the package ${found.pkg} is not installed. It is an optional dependency of dten-speed; ` +
        "reinstall without --no-optional or --omit=optional.",
    );
  }
  if (!ensureExecutable(binary)) fail(args, `${binary} is not executable, and it could not be made executable.`);
  const child = spawn(binary, args, { stdio: "inherit", windowsHide: true });
  // A terminal sends Ctrl+C to the whole group, so the binary already gets SIGINT; the launcher only
  // stays alive to return its exit code. SIGTERM and SIGHUP come from whoever runs the launcher
  // (an MCP client closing the server), so they are passed on.
  process.on("SIGINT", () => {});
  for (const signal of ["SIGTERM", "SIGHUP"]) {
    process.on(signal, () => {
      if (child.exitCode === null) child.kill(signal);
    });
  }
  child.on("error", (error) => fail(args, `could not start ${binary}: ${error.message}`));
  child.on("exit", (code, signal) => {
    if (signal) {
      process.removeAllListeners(signal);
      process.kill(process.pid, signal);
      // A signal that Node ignores (SIGPIPE) does not end the launcher; the shell convention does.
      process.exit(exitCodeOfSignal(signal));
    }
    process.exit(code === null ? NOT_MEASURED : code);
  });
}

if (require.main === module) main();

module.exports = { BINARIES, binaryFor, resolveBinary, failureOutput, exitCodeOfSignal };

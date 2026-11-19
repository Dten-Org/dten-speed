// `SM-CLI-07`
export const MAIN_PACKAGE = "dten-speed";

// `SM-CLI-09`
export const MCP_NAME = "br.com.dten/speed";

// `SM-CLI-07`
export const REPOSITORY_URL = "git+https://github.com/Dten-Org/dten-speed.git";

// `SM-CLI-07`
export const PLATFORMS = [
  { key: "linux-x64", os: "linux", cpu: "x64", asset: "dten-speed-linux-x64", exe: "dten-speed" },
  { key: "linux-arm64", os: "linux", cpu: "arm64", asset: "dten-speed-linux-arm64", exe: "dten-speed" },
  { key: "macos-arm64", os: "darwin", cpu: "arm64", asset: "dten-speed-macos-arm64", exe: "dten-speed" },
  { key: "macos-x64", os: "darwin", cpu: "x64", asset: "dten-speed-macos-x64", exe: "dten-speed" },
  // Windows 11 on Arm runs the x64 binary under emulation.
  { key: "windows-x64", os: "win32", cpu: "x64", alsoCpu: ["arm64"], asset: "dten-speed-windows-x64.exe", exe: "dten-speed.exe" },
].map((p) => ({ ...p, pkg: `@dten4you/speed-${p.key}` }));

// `SM-CLI-07`
export const ASSETS = PLATFORMS.map((p) => p.asset).sort();

// `SM-CLI-07`
export const trustedCommentOf = (version) => `dten-speed ${version}`;

// `SM-CLI-07`
export const SEMVER = /^\d+\.\d+\.\d+$/;

# dten-speed

Internet speed test from the terminal, for people and for AI assistants, by [Dten](https://dten.com.br).

It measures the download and upload of **this computer's** connection with the same engine as the
[Real Net Speed](https://play.google.com/store/apps/details?id=br.com.maishub.speedmonitor) app and the
[dten.com.br](https://dten.com.br) web meter. Free, no account.

## Status

**Not released yet.** The first release, the npm package and the install scripts will be announced
here and at [dten.com.br/cli](https://dten.com.br/cli). Until then, measure in the browser at
[dten.com.br](https://dten.com.br).

## What each release contains

- `dten-speed` binaries for `linux-x64`, `linux-arm64`, `macos-arm64`, `macos-x64` and `windows-x64`;
- `SHA256SUMS`, the checksum of every binary, and `SHA256SUMS.minisig`, its
  [minisign](https://jedisct1.github.io/minisign/) signature, made with the key in
  [`minisign.pub`](./minisign.pub).

To check a download by hand:

```
minisign -Vm SHA256SUMS -p minisign.pub
sha256sum --check --ignore-missing SHA256SUMS
```

The npm packages (`dten-speed` and `@dten4you/speed-*`) are published from these releases by
[`npm.yml`](.github/workflows/npm.yml), after the same checks, with npm provenance. How a release is
made is in [RELEASING.md](./RELEASING.md).

The source code is not in this repository. The license is in [LICENSE.md](./LICENSE.md).

## Privacy

See the [privacy policy](https://dten.com.br/privacy).

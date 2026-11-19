# dten-speed

Internet speed test from the terminal, for people and for AI assistants, by [Dten](https://dten.com.br).
Free, no account.

It measures the download and upload of **this computer's** connection against Dten's measurement
servers, with the same engine as the Real Net Speed app and the [dten.com.br](https://dten.com.br) web
meter.

```
npx -y dten-speed
```

## For AI assistants (MCP)

`dten-speed mcp` is an MCP server over stdio with one tool, `measure_connection`.

```
claude mcp add dten-speed -- npx -y dten-speed mcp
```

Or, in `claude_desktop_config.json` and similar clients:

```json
{
  "mcpServers": {
    "dten-speed": { "command": "npx", "args": ["-y", "dten-speed", "mcp"] }
  }
}
```

## Before you run it

- A measurement takes about a minute (up to 10 on a very slow network) and uses data in proportion to the speed: about 375 MB per
  direction at 100 Mbps. Mind a mobile data allowance.
- The result is a preview, not a certificate.
- The record goes to Dten's archive with no account and no name, unless `--no-send` or `DTEN_SPEED_NO_SEND=1`;
  `dten-speed forget` deletes it. See the [privacy policy](https://dten.com.br/privacy).

`dten-speed --help` lists every option. More at [dten.com.br/cli](https://dten.com.br/cli).

This package only starts the native binary for your system, installed by npm from one of the
`@dten4you/speed-*` packages. No install script runs and nothing is downloaded from outside npm. The
binaries are the same bytes as the [signed releases](https://github.com/Dten-Org/dten-speed/releases).

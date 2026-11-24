# Releasing dten-speed

The source code lives in a private repository. This repository only receives the signed releases and
turns them into npm packages. Nothing here builds a binary.

```
source repo:  tag cli-vX.Y.Z on master  ->  5 binaries built and run on their own systems
              ->  SHA256SUMS, kept as an artifact of that private run (nothing is pushed anywhere)
owner:        tool/lancar.sh downloads that artifact, checks it, signs SHA256SUMS with minisign
              (the private key never touches GitHub) and creates release vX.Y.Z here
here:         npm.yml waits for the owner's approval (environment "npm"), checks that the release is
              on master and signed with the pinned key, verifies every checksum, publishes 6 packages
dten.com.br:  the install scripts get the new version and checksums from the same signed list
```

No token that can write to this repository is stored anywhere, and what the owner signs is what the
private CI run built, not what happens to be in a public draft.

## Every release

1. In the source repository, the version goes up in `packages/cli/pubspec.yaml` and
   `packages/cli/lib/version.dart`, in a commit on `master`.
2. Tag it: `git tag cli-vX.Y.Z && git push origin cli-vX.Y.Z`. The release workflow refuses a tag that
   is not on `master` or not the version in the code, runs the tests, builds and runs each binary, and
   keeps them with `SHA256SUMS` as an artifact for 14 days.
3. On the owner's machine, from the source repository, with this repository cloned next to it:

   ```
   bash packages/cli/tool/lancar.sh <run id> <cli private key>
   ```

   It signs with the trusted comment `dten-speed X.Y.Z`, which binds the signature to the version, so
   a signed list from an older release cannot be published under a new tag.
4. Approve the `npm.yml` run (environment `npm`). Check its summary, then
   `npx -y dten-speed@X.Y.Z --version`.
5. Update the install scripts on dten.com.br: `yarn cli --release <folder printed by lancar.sh>` in
   the web repository, and push it. If the tool description in `mcp.dart` changed, `yarn cli` refuses
   until `CLI_TOOL` in the web repository's `scripts/ia.mjs` is the same text.
6. Once dten.com.br serves the new `/.well-known/mcp.json`, publish it to the official MCP registry as
   `br.com.dten/speed`: save it as `server.json`, then `mcp-publisher login dns --domain dten.com.br
   --private-key <hex of the DNS key>` and `mcp-publisher publish`. The key is the one in the `TXT`
   record at the apex of `dten.com.br`; keep that record. Check
   `https://registry.modelcontextprotocol.io/v0/servers?search=br.com.dten/speed` shows the new version
   as latest. Without this step the registry keeps the old version: it stayed at 1.0.0 until 1.4.0.

A failed `npm.yml` can be run again from the Actions tab with the tag; packages already on npm are
skipped. A published version is never replaced: fix forward with a new version.

## Once, before the first release

1. **The CLI signing key**, separate from any other minisign key:
   `minisign -G -p minisign.pub -s <a path outside every repository>`, with a password. Commit
   `minisign.pub` at the root of this repository, and put its key line (the second line) in
   `CLI_PUBLIC_KEY` in `.github/workflows/npm.yml`. The private key and its password stay with the
   owner.
2. **This repository's settings**:
   - an environment `npm` with the owner as required reviewer, deployments allowed only from tags
     `v*` and from `master` (a re-run by hand starts from `master`);
   - a ruleset on `master` (no force push, no deletion, changes only by the owner) and a tag ruleset
     so that only the owner creates `v*` tags.
3. **The npm names**, because a trusted publisher can only be set on a package that exists. With the
   `dten4you` account (2FA):

   ```
   node npm/cli.mjs reserve --out reserved
   for d in reserved/*; do (cd "$d" && npm publish --access public); done
   for p in dten-speed @dten4you/speed-linux-x64 @dten4you/speed-linux-arm64 \
            @dten4you/speed-macos-arm64 @dten4you/speed-macos-x64 @dten4you/speed-windows-x64; do
     npm trust github "$p" --file npm.yml --repo Dten-Org/dten-speed --env npm --allow-publish
   done
   ```

   `reserve` makes empty `0.0.0` packages, with no binary and nothing to run. `npm trust` needs npm
   11.15 or later. After the first real release, deprecate the placeholders:
   `npm deprecate "dten-speed@0.0.0" "placeholder, use the latest version"` (and the same for each
   platform package).

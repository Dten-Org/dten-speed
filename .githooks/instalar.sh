#!/bin/bash
# Liga os hooks versionados deste repositorio. Rode UMA vez por clone -- ele mexe so na
# configuracao LOCAL deste clone, e o git nao traz `core.hooksPath` no clone.
#
# ⚠️ ARQUIVO GERADO pela raiz do workspace (`node scripts/gerar-hooks.mjs`).
set -e
cd "$(dirname "$0")/.."
git config core.hooksPath .githooks
chmod +x .githooks/* 2>/dev/null || true
echo "hooks ligados: $(ls .githooks | grep -v instalar.sh | tr '\n' ' ')"

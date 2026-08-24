#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../docs"

# Submodule .git is a file (gitdir: ../.git/modules/docs), not a directory —
# resolve the real git-dir rather than assuming .git/info exists directly.
GIT_DIR="$(git rev-parse --git-dir)"
mkdir -p "$GIT_DIR/info"

git sparse-checkout init --no-cone
cat > "$GIT_DIR/info/sparse-checkout" <<'EOF'
/*
!/dashboard/
!/scripts/
EOF
git sparse-checkout reapply

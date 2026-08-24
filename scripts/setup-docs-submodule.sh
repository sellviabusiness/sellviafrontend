#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# A plain `git clone` does NOT populate submodule content — docs/ starts
# empty until this runs. Safe to re-run; no-ops if already initialized.
git submodule update --init --recursive docs

cd docs

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

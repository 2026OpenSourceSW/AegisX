#!/usr/bin/env bash

set -euo pipefail

cd "$(dirname "$0")/.."

workflow=".github/workflows/ci.yml"
failed=0

if grep -nE '^[[:space:]]*continue-on-error:[[:space:]]*true[[:space:]]*$' "$workflow"; then
    echo "CI policy violation: critical workflow steps must not use continue-on-error: true" >&2
    failed=1
fi

if grep -n -- '--issues-exit-code=0' "$workflow"; then
    echo "CI policy violation: golangci-lint must fail on issues" >&2
    failed=1
fi

if (( failed != 0 )); then
    exit 1
fi

echo "CI quality gates are configured to fail on errors."

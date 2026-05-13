#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${1:-.}"

mkdir -p "$ROOT_DIR/docs/design-docs"
mkdir -p "$ROOT_DIR/docs/exec-plans/active"
mkdir -p "$ROOT_DIR/docs/exec-plans/completed"
mkdir -p "$ROOT_DIR/docs/generated"
mkdir -p "$ROOT_DIR/docs/product-specs"
mkdir -p "$ROOT_DIR/docs/references"
mkdir -p "$ROOT_DIR/scripts"

echo "Finance_lab harness directories are ready at $ROOT_DIR"

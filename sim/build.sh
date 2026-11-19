#!/bin/sh
set -eu
cd "$(dirname "$0")"
if ! command -v cargo >/dev/null && [ -f "$HOME/.cargo/env" ]; then
  . "$HOME/.cargo/env"
fi
cargo build --locked --release --target wasm32-unknown-unknown
mkdir -p ../public
cp "${CARGO_TARGET_DIR:-target}/wasm32-unknown-unknown/release/ripple_simulation.wasm" ../public/simulation.wasm

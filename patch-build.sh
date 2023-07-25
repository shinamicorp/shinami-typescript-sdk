#!/usr/bin/env bash
set -e

echo '{"type":"module"}' > dist/esm/package.json
echo '{"type":"commonjs"}' > dist/cjs/package.json
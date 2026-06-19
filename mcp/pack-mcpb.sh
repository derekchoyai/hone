#!/bin/bash
# Build and pack the Hone MCP server as a one-click .mcpb desktop bundle.
# Handles the symlinked @hone/sdk file: dependency (a zip can't follow the symlink,
# so we dereference it into a real copy with the built dist before packing).
set -e
cd "$(dirname "$0")"

echo "→ installing deps + building (SDK then MCP)…"
npm install --silent
npm run build

echo "→ pruning to runtime deps…"
npm prune --omit=dev --silent

echo "→ dereferencing @hone/sdk symlink into the bundle…"
if [ -L node_modules/@hone/sdk ]; then
  rm node_modules/@hone/sdk
fi
rm -rf node_modules/@hone/sdk
mkdir -p node_modules/@hone/sdk
cp -R ../sdk/typescript/dist node_modules/@hone/sdk/dist
cp ../sdk/typescript/package.json node_modules/@hone/sdk/package.json

echo "→ packing hone.mcpb…"
npx -y @anthropic-ai/mcpb@latest pack . hone.mcpb

echo "→ restoring dev symlink for local development…"
rm -rf node_modules/@hone/sdk
npm install --silent

echo "✅ built hone.mcpb"

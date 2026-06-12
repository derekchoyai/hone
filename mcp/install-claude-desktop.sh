#!/bin/bash
# Adds the Hone MCP server to Claude Desktop's config.
# IMPORTANT: fully quit Claude Desktop (Cmd+Q) BEFORE running this —
# Desktop rewrites its config on quit and will erase edits made while it runs.
set -e

CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
SERVER_JS="$(cd "$(dirname "$0")" && pwd)/dist/index.js"

if pgrep -xq "Claude"; then
  echo "⚠️  Claude Desktop is still running. Quit it first (Cmd+Q), then re-run this."
  exit 1
fi

if [ ! -f "$SERVER_JS" ]; then
  echo "Building the MCP server first..."
  (cd "$(dirname "$0")" && npm install && npm run build)
fi

python3 - "$CONFIG" "$SERVER_JS" <<'PY'
import json, sys
config_path, server_js = sys.argv[1], sys.argv[2]
try:
    cfg = json.load(open(config_path))
except FileNotFoundError:
    cfg = {}
cfg.setdefault("mcpServers", {})["hone"] = {"command": "node", "args": [server_js]}
json.dump(cfg, open(config_path, "w"), ensure_ascii=False, indent=2)
print("✓ Added 'hone' MCP server to Claude Desktop config:")
print("  ", server_js)
PY

echo ""
echo "Now open Claude Desktop. In a chat, click the sliders icon (Search & tools)"
echo "and check that 'hone' is listed and enabled. Then try: \"run hone on <work>\"."

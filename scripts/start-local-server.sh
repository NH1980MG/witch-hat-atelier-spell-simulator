#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PYTHON_BIN="/Library/Frameworks/Python.framework/Versions/3.14/bin/python3"
PORT="${WHA_PORT:-8000}"

cd "$PROJECT_DIR"
exec "$PYTHON_BIN" -m http.server "$PORT" --bind 127.0.0.1

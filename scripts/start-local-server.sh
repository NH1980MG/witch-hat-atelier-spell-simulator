#!/bin/zsh
set -euo pipefail

PROJECT_DIR="/Users/nathanh/Projets/witch-hat-atelier-simulator"
PYTHON_BIN="/Library/Frameworks/Python.framework/Versions/3.14/bin/python3"
PORT="${WHA_PORT:-8000}"

cd "$PROJECT_DIR"
exec "$PYTHON_BIN" -m http.server "$PORT" --bind 127.0.0.1

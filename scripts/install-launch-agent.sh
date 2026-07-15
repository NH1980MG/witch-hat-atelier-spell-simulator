#!/bin/zsh
set -euo pipefail

LABEL="local.witch-hat-atelier-simulator.server"
OLD_LABEL="local.whitch-hat-atelier.server"
PROJECT_DIR="/Users/nathanh/Projets/witch-hat-atelier-simulator"
PLIST_SOURCE="$PROJECT_DIR/scripts/$LABEL.plist"
PLIST_TARGET="$HOME/Library/LaunchAgents/$LABEL.plist"
OLD_PLIST_TARGET="$HOME/Library/LaunchAgents/$OLD_LABEL.plist"
USER_ID="$(id -u)"

chmod +x "$PROJECT_DIR/scripts/start-local-server.sh"
mkdir -p "$HOME/Library/LaunchAgents" "$PROJECT_DIR/logs"
cp "$PLIST_SOURCE" "$PLIST_TARGET"

launchctl bootout "gui/$USER_ID" "$OLD_PLIST_TARGET" 2>/dev/null || true
rm -f "$OLD_PLIST_TARGET"
launchctl bootout "gui/$USER_ID" "$PLIST_TARGET" 2>/dev/null || true
launchctl bootstrap "gui/$USER_ID" "$PLIST_TARGET"
launchctl enable "gui/$USER_ID/$LABEL"
launchctl kickstart -k "gui/$USER_ID/$LABEL"

echo "Serveur automatique installe: http://127.0.0.1:8000/"

#!/bin/zsh
set -euo pipefail

LABEL="local.witch-hat-atelier-simulator.server"
OLD_LABEL="local.whitch-hat-atelier.server"
PLIST_TARGET="$HOME/Library/LaunchAgents/$LABEL.plist"
OLD_PLIST_TARGET="$HOME/Library/LaunchAgents/$OLD_LABEL.plist"
USER_ID="$(id -u)"

launchctl bootout "gui/$USER_ID" "$PLIST_TARGET" 2>/dev/null || true
launchctl bootout "gui/$USER_ID" "$OLD_PLIST_TARGET" 2>/dev/null || true
rm -f "$PLIST_TARGET"
rm -f "$OLD_PLIST_TARGET"

echo "Serveur automatique desinstalle."

#!/bin/zsh
set -euo pipefail

LABEL="local.witch-hat-atelier-simulator.server"
OLD_LABEL="local.whitch-hat-atelier.server"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PLIST_TARGET="$HOME/Library/LaunchAgents/$LABEL.plist"
OLD_PLIST_TARGET="$HOME/Library/LaunchAgents/$OLD_LABEL.plist"
USER_ID="$(id -u)"

chmod +x "$PROJECT_DIR/scripts/start-local-server.sh"
mkdir -p "$HOME/Library/LaunchAgents" "$PROJECT_DIR/logs"
cat > "$PLIST_TARGET" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>$LABEL</string>

    <key>ProgramArguments</key>
    <array>
      <string>$PROJECT_DIR/scripts/start-local-server.sh</string>
    </array>

    <key>WorkingDirectory</key>
    <string>$PROJECT_DIR</string>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>$PROJECT_DIR/logs/server.out.log</string>

    <key>StandardErrorPath</key>
    <string>$PROJECT_DIR/logs/server.err.log</string>
  </dict>
</plist>
EOF

launchctl bootout "gui/$USER_ID" "$OLD_PLIST_TARGET" 2>/dev/null || true
rm -f "$OLD_PLIST_TARGET"
launchctl bootout "gui/$USER_ID" "$PLIST_TARGET" 2>/dev/null || true
launchctl bootstrap "gui/$USER_ID" "$PLIST_TARGET"
launchctl enable "gui/$USER_ID/$LABEL"
launchctl kickstart -k "gui/$USER_ID/$LABEL"

echo "Serveur automatique installe: http://127.0.0.1:8000/"

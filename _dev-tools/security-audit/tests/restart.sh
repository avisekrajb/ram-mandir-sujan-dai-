#!/bin/bash
# stop whatever listens on :5700 (by port) and wait; caller starts the backend again
PID=$(netstat -ano | grep ':5700 .*LISTENING' | awk '{print $5}' | head -1)
[ -n "$PID" ] && powershell -NoProfile -Command "Stop-Process -Id $PID -Force"
sleep 2

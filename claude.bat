@echo off
cd /d "%~dp0"
start powershell -NoExit -Command "claude --dangerously-skip-permissions"

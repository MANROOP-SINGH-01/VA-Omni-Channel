@echo off
title Launching Omni-Channel Retail Intelligence Platform
cls
echo ==============================================================================
echo   OMNI-CHANNEL RETAIL INTELLIGENCE PLATFORM (SAAS WEB EDITION)
echo   Starting Local Analytics Engine Server...
echo ==============================================================================
echo.
echo Serving files from: %~dp0
echo Opening default web browser at http://localhost:8000
echo.
echo Press Ctrl+C in this terminal window to stop the server.
echo ==============================================================================
echo.

start "" "http://localhost:8000"
python -m http.server 8000
pause

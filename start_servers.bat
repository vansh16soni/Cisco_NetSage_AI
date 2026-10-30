@echo off
title NetSage AI Launcher
echo ========================================================
echo               Starting NetSage AI System
echo ========================================================
echo.

echo [1/2] Starting Python FastAPI Backend on port 5000...
start "NetSage Backend (Port 5000)" cmd /k "cd /d "%~dp0backend" && "C:\Users\LENOVO\.local\bin\uv.exe" run --offline --with-requirements requirements.txt python app.py"

echo [2/2] Starting React Frontend on port 3000...
start "NetSage Frontend (Port 3000)" cmd /k "cd /d "%~dp0frontend" && npm start"

echo.
echo Both servers have been launched in dedicated terminal windows!
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo ========================================================


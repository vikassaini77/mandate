@echo off
echo ===================================================
echo     STARTING MANDATE MONOREPO DEV ENVIRONMENT
echo ===================================================

echo.
echo [1/2] Starting FastAPI Backend...
start "MANDATE BACKEND" cmd /k "apps\api\.venv\Scripts\uvicorn.exe apps.api.src.main:app --host 0.0.0.0 --port 8000 --reload"

echo.
echo [2/2] Starting React Frontend...
start "MANDATE FRONTEND" cmd /k "cd apps\web && npm run dev"

echo.
echo Both services are starting up in separate windows!
echo Backend: http://localhost:8000
echo Frontend: http://localhost:8080 (or whatever port Vite selects)
echo.
echo Close this window at any time. To stop the servers, close their respective command prompt windows.
pause

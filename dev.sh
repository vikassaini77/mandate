#!/usr/bin/env bash
set -e

echo "==================================================="
echo "    STARTING MANDATE MONOREPO DEV ENVIRONMENT      "
echo "==================================================="

# Check for uv or python venv
if command -v uv &> /dev/null; then
    RUN_BACKEND="uv run --project apps/api uvicorn apps.api.src.main:app --host 0.0.0.0 --port 8000 --reload"
elif [ -d "apps/api/.venv" ]; then
    RUN_BACKEND="apps/api/.venv/bin/uvicorn apps.api.src.main:app --host 0.0.0.0 --port 8000 --reload"
else
    RUN_BACKEND="python3 -m uvicorn apps.api.src.main:app --host 0.0.0.0 --port 8000 --reload"
fi

echo ""
echo "[1/2] Starting FastAPI Backend on :8000..."
$RUN_BACKEND &
BACKEND_PID=$!

echo ""
echo "[2/2] Starting React Frontend on :8080..."
(cd apps/web && (npm run dev || bun dev)) &
FRONTEND_PID=$!

cleanup() {
    echo ""
    echo "Stopping MANDATE services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

echo ""
echo "Both services are running in background!"
echo "Backend:  http://localhost:8000 (API Docs at /docs)"
echo "Frontend: http://localhost:8080"
echo "Press Ctrl+C to stop both servers."

wait

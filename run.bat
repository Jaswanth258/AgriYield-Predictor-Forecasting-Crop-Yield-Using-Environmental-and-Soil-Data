@echo off
echo Starting AgriYield Predictor Background Services...

:: Start the FastAPI backend in a new command window
echo Launching Backend...
start "AgriYield Backend" cmd /c "cd backend && venv\Scripts\activate && uvicorn app.main:app --reload"

:: Start the Vite frontend in a new command window
echo Launching Frontend...
start "AgriYield Frontend" cmd /c "cd frontend && npm run dev"

echo.
echo Both servers are starting up!
echo The Frontend will accessible at http://localhost:5173
echo The Backend API is available at http://localhost:8000
echo.
echo You can safely close this window.
pause

Write-Host "Starting AgriYield Predictor Background Services..." -ForegroundColor Green

Write-Host "Launching Backend..." -ForegroundColor Cyan
Start-Process "cmd.exe" -ArgumentList "/c cd backend && venv\Scripts\activate && uvicorn app.main:app --reload"

Write-Host "Launching Frontend..." -ForegroundColor Cyan
Start-Process "cmd.exe" -ArgumentList "/c cd frontend && npm run dev"

Write-Host ""
Write-Host "Both servers are starting up!" -ForegroundColor Green
Write-Host "The Frontend will accessible at http://localhost:5173"
Write-Host "The Backend API is available at http://localhost:8000"
Write-Host ""
Write-Host "You can safely close this window." -ForegroundColor Yellow

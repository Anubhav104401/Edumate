# =====================================================================
# Starts EduMate for development on Windows, in two new windows:
#   backend  -> http://localhost:8080  (Spring Boot, in-memory H2 database with demo data)
#   frontend -> http://localhost:5173  (Vite + React; open this one in the browser)
# Usage (from the project folder):   powershell -ExecutionPolicy Bypass -File scripts\dev-start.ps1
# =====================================================================
$root = Split-Path -Parent $PSScriptRoot

Write-Host "Starting the backend on port 8080 ..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; .\mvnw.cmd spring-boot:run"

if (-not (Test-Path "$root\frontend\node_modules")) {
    Write-Host "Installing frontend packages (first run only) ..."
    Push-Location "$root\frontend"
    npm install
    Pop-Location
}

Write-Host "Starting the frontend on port 5173 ..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm run dev"

Write-Host ""
Write-Host "When both windows say they are ready, open http://localhost:5173"
Write-Host "Demo password for every account: Edumate@2026"

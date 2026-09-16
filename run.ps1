# SurakshaShe PowerShell 1-Click Launcher
Set-Location -Path $PSScriptRoot

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "          SURAKSHASHE - SAFETY PLATFORM           " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js is not installed. Download from https://nodejs.org" -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    Exit
}

# 2. Check .env
if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
    Write-Host "[SETUP] Initializing .env from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

# 3. Open browser after 3 seconds
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:3000"
} | Out-Null

# 4. Start the server
Write-Host "[STARTING] Launching server on http://localhost:3000 ..." -ForegroundColor Green
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    pnpm run dev
} else {
    npx tsx server/_core/index.ts
}

@echo off
title SurakshaShe - Launch Application
cd /d "%~dp0"

echo ===================================================
echo           SURAKSHASHE - SAFETY PLATFORM           
echo ===================================================
echo.

:: 1. Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in your PATH.
    echo Please download and install Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: 2. Check if .env file exists; create from .env.example if missing
if not exist ".env" (
    if exist ".env.example" (
        echo [SETUP] Creating initial .env from .env.example...
        copy ".env.example" ".env" >nul
    )
)

:: Check Port 3000 Availability
netstat -ano | findstr LISTENING | findstr :3000 >nul
if %errorlevel% equ 0 (
    echo [ERROR] Port 3000 is already in use by another process.
    echo Please close the application using port 3000 before starting SurakshaShe.
    echo.
    pause
    exit /b 1
)

:: 3. Check if node_modules exists; install dependencies if missing
if not exist "node_modules" (
    echo [SETUP] Installing project dependencies...
    where pnpm >nul 2>nul
    if %errorlevel% equ 0 (
        call pnpm install
    ) else (
        call npm install
    )
)

:: 4. Automatically open the browser after a 3-second delay
echo [STARTING] Launching SurakshaShe server on http://localhost:3000 ...
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

:: 5. Start the server (pnpm dev or npx tsx)
where pnpm >nul 2>nul
if %errorlevel% equ 0 (
    call pnpm run dev
) else (
    call npx tsx server/_core/index.ts
)

if %errorlevel% neq 0 (
    echo.
    echo [SERVER STOPPED] An error occurred or the server was terminated.
    pause
)

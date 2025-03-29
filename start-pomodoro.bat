@echo off
echo Starting Pomodoro Timer...

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Node.js is not installed.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Change to script directory
cd /d "%~dp0"

:: Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %ERRORLEVEL% neq 0 (
        echo Error: Failed to install dependencies.
        pause
        exit /b 1
    )
)

:: Start the application
echo Loading application...
npm start
if %ERRORLEVEL% neq 0 (
    echo Error: Application failed to start.
    echo Check the logs for more information.
    pause
    exit /b 1
)

pause
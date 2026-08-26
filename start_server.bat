@echo off
echo LatticeVeil Local Server
echo ========================
echo.

REM Kill any existing process on port 8080
echo Closing existing server on port 8080...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo Existing server closed.
echo.

REM Start the Python HTTP server
echo Starting server on http://localhost:8080/
echo Press any key to stop the server...
echo.

cd /d "%~dp0"
start /B python -m http.server 8080

REM Wait for a key press
pause >nul

REM Kill the server when done
echo.
echo Stopping server...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo Server stopped.
timeout /t 2 >nul

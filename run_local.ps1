# Simple local server using Python (if available) or Node.js (if available)
# This will serve the site locally at http://localhost:8000

$Host.UI.RawUI.WindowTitle = "LatticeVeil Local Server"

Write-Host "--- LatticeVeil Local Server ---" -ForegroundColor Cyan
Write-Host "Attempting to start local server..." -ForegroundColor White

# Check for Python
if (Get-Command "python" -ErrorAction SilentlyContinue) {
    Write-Host "Starting Python HTTP Server on http://localhost:8000" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop the server." -ForegroundColor Yellow
    python -m http.server 8000
}
# Check for Node.js (npx serve)
elseif (Get-Command "npx" -ErrorAction SilentlyContinue) {
    Write-Host "Starting Node.js 'serve' on http://localhost:3000" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop the server." -ForegroundColor Yellow
    npx serve .
}
else {
    Write-Host "ERROR: No suitable server found! Please install Python or Node.js." -ForegroundColor Red
    Write-Host "Alternative: Open index.html directly in your browser, though some features might be limited." -ForegroundColor Yellow
    Pause
}

@echo off
REM Run E2E tests with dev server
REM Usage: run_e2e_tests.bat

echo ==========================================
echo Bilibili Focus Mode - E2E Test Suite
echo ==========================================
echo.

REM Create screenshots directory
if not exist e2e\screenshots mkdir e2e\screenshots

REM Check if playwright is installed
python -c "import playwright" 2>NUL
if errorlevel 1 (
    echo Installing Playwright...
    pip install playwright
    python -m playwright install chromium
)

echo.
echo Starting E2E tests with dev server...
echo.

REM Run tests using with_server.py helper
python %USERPROFILE%\.opencode\skills\webapp-testing\scripts\with_server.py ^
    --server "npm run dev" --port 5173 --timeout 60 ^
    -- python e2e/run_all_tests.py

if errorlevel 1 (
    echo.
    echo ==========================================
    echo Some tests failed!
    echo ==========================================
    exit /b 1
) else (
    echo.
    echo ==========================================
    echo All tests passed! 
    echo ==========================================
    exit /b 0
)

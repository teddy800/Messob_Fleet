@echo off
REM MESSOB Fleet Management - Run All Load Tests
REM Tests SRS NFR-1.1 and NFR-1.2 compliance

echo ============================================================
echo MESSOB Fleet Management System - Performance Load Tests
echo ============================================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ to run load tests
    exit /b 1
)

REM Check if application is running
curl -s http://localhost:8018/web/health >nul 2>&1
if errorlevel 1 (
    echo WARNING: Odoo service may not be running on port 8018
    echo Please start the application first: docker-compose up -d
    echo.
    set /p continue="Continue anyway? (y/n): "
    if /i not "%continue%"=="y" exit /b 1
)

echo.
echo [1/2] Running API Performance Test (NFR-1.1)...
echo ============================================================
python api_performance_test.py
set api_result=%errorlevel%

echo.
echo.
echo [2/2] Running GPS Throughput Test (NFR-1.2)...
echo ============================================================
python gps_throughput_test.py
set gps_result=%errorlevel%

echo.
echo.
echo ============================================================
echo TEST SUMMARY
echo ============================================================

if %api_result%==0 (
    echo [PASS] API Performance Test - NFR-1.1 compliance verified
) else (
    echo [FAIL] API Performance Test - NFR-1.1 not met
)

if %gps_result%==0 (
    echo [PASS] GPS Throughput Test - NFR-1.2 compliance verified
) else (
    echo [FAIL] GPS Throughput Test - NFR-1.2 not met
)

echo ============================================================

if %api_result%==0 if %gps_result%==0 (
    echo.
    echo All tests PASSED - System meets SRS performance requirements
    exit /b 0
) else (
    echo.
    echo Some tests FAILED - Review results above
    exit /b 1
)

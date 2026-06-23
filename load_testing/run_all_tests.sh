#!/bin/bash
# MESSOB Fleet Management - Run All Load Tests
# Tests SRS NFR-1.1 and NFR-1.2 compliance

set -e

echo "============================================================"
echo "MESSOB Fleet Management System - Performance Load Tests"
echo "============================================================"
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed or not in PATH"
    echo "Please install Python 3.8+ to run load tests"
    exit 1
fi

# Check if application is running
if ! curl -s http://localhost:8018/web/health &> /dev/null; then
    echo "WARNING: Odoo service may not be running on port 8018"
    echo "Please start the application first: docker-compose up -d"
    echo ""
    read -p "Continue anyway? (y/n): " continue
    if [ "$continue" != "y" ]; then
        exit 1
    fi
fi

echo ""
echo "[1/2] Running API Performance Test (NFR-1.1)..."
echo "============================================================"
python3 api_performance_test.py
api_result=$?

echo ""
echo ""
echo "[2/2] Running GPS Throughput Test (NFR-1.2)..."
echo "============================================================"
python3 gps_throughput_test.py
gps_result=$?

echo ""
echo ""
echo "============================================================"
echo "TEST SUMMARY"
echo "============================================================"

if [ $api_result -eq 0 ]; then
    echo "[PASS] API Performance Test - NFR-1.1 compliance verified"
else
    echo "[FAIL] API Performance Test - NFR-1.1 not met"
fi

if [ $gps_result -eq 0 ]; then
    echo "[PASS] GPS Throughput Test - NFR-1.2 compliance verified"
else
    echo "[FAIL] GPS Throughput Test - NFR-1.2 not met"
fi

echo "============================================================"

if [ $api_result -eq 0 ] && [ $gps_result -eq 0 ]; then
    echo ""
    echo "✅ All tests PASSED - System meets SRS performance requirements"
    exit 0
else
    echo ""
    echo "❌ Some tests FAILED - Review results above"
    exit 1
fi

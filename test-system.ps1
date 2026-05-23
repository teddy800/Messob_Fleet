# MESSOB Fleet Management - System Verification Script
# This script tests all components of the system

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MESSOB Fleet Management System Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allPassed = $true

# Test 1: Docker Containers
Write-Host "[1/7] Testing Docker Containers..." -ForegroundColor Yellow
$odooContainer = docker ps --filter "name=odoo18" --format "{{.Status}}"
$dbContainer = docker ps --filter "name=db18" --format "{{.Status}}"

if ($odooContainer -match "Up") {
    Write-Host "  ✓ Odoo container is running" -ForegroundColor Green
} else {
    Write-Host "  ✗ Odoo container is NOT running" -ForegroundColor Red
    $allPassed = $false
}

if ($dbContainer -match "Up") {
    Write-Host "  ✓ Database container is running" -ForegroundColor Green
} else {
    Write-Host "  ✗ Database container is NOT running" -ForegroundColor Red
    $allPassed = $false
}

# Test 2: Backend API
Write-Host "`n[2/7] Testing Backend API..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8018/web/database/list" -Method POST -ContentType "application/json" -Body '{"jsonrpc":"2.0","method":"call","params":{}}' -TimeoutSec 5
    Write-Host "  ✓ Backend API is responding" -ForegroundColor Green
    
    if ($response.result -contains "fleet_management") {
        Write-Host "  ✓ Database 'fleet_management' exists" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Database 'fleet_management' NOT found" -ForegroundColor Red
        Write-Host "    Available databases: $($response.result -join ', ')" -ForegroundColor Yellow
        $allPassed = $false
    }
} catch {
    Write-Host "  ✗ Cannot connect to backend API" -ForegroundColor Red
    Write-Host "    Error: $_" -ForegroundColor Red
    $allPassed = $false
}

# Test 3: Frontend Server
Write-Host "`n[3/7] Testing Frontend Server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✓ Frontend is accessible at http://localhost:3000" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ Frontend is NOT accessible" -ForegroundColor Red
    Write-Host "    Make sure 'npm run dev' is running" -ForegroundColor Yellow
    $allPassed = $false
}

# Test 4: Module Files
Write-Host "`n[4/7] Testing Module Files..." -ForegroundColor Yellow
$manifestPath = "c:\Users\HP\odoo-addons\mesob_fleet_management\addons\messob_fleet\__manifest__.py"
$modelsPath = "c:\Users\HP\odoo-addons\mesob_fleet_management\addons\messob_fleet\models"
$viewsPath = "c:\Users\HP\odoo-addons\mesob_fleet_management\addons\messob_fleet\views"

if (Test-Path $manifestPath) {
    Write-Host "  ✓ Module manifest exists" -ForegroundColor Green
} else {
    Write-Host "  ✗ Module manifest missing" -ForegroundColor Red
    $allPassed = $false
}

if (Test-Path $modelsPath) {
    $modelCount = (Get-ChildItem $modelsPath -Filter "*.py" | Measure-Object).Count
    Write-Host "  ✓ Models directory exists ($modelCount model files)" -ForegroundColor Green
} else {
    Write-Host "  ✗ Models directory missing" -ForegroundColor Red
    $allPassed = $false
}

if (Test-Path $viewsPath) {
    $viewCount = (Get-ChildItem $viewsPath -Filter "*.xml" | Measure-Object).Count
    Write-Host "  ✓ Views directory exists ($viewCount view files)" -ForegroundColor Green
} else {
    Write-Host "  ✗ Views directory missing" -ForegroundColor Red
    $allPassed = $false
}

# Test 5: Frontend Configuration
Write-Host "`n[5/7] Testing Frontend Configuration..." -ForegroundColor Yellow
$viteConfig = Get-Content "c:\Users\HP\odoo-addons\mesob_fleet_management\frontend\vite.config.js" -Raw

if ($viteConfig -match "port: 3000") {
    Write-Host "  ✓ Frontend port configured (3000)" -ForegroundColor Green
} else {
    Write-Host "  ✗ Frontend port not configured correctly" -ForegroundColor Red
    $allPassed = $false
}

if ($viteConfig -match "target: 'http://localhost:8018'") {
    Write-Host "  ✓ Proxy target configured correctly" -ForegroundColor Green
} else {
    Write-Host "  ✗ Proxy target not configured correctly" -ForegroundColor Red
    $allPassed = $false
}

# Test 6: API Configuration
Write-Host "`n[6/7] Testing API Configuration..." -ForegroundColor Yellow
$apiConfig = Get-Content "c:\Users\HP\odoo-addons\mesob_fleet_management\frontend\src\lib\odooApi.js" -Raw

if ($apiConfig -match 'db: "fleet_management"') {
    Write-Host "  ✓ Database name configured correctly" -ForegroundColor Green
} else {
    Write-Host "  ✗ Database name not configured correctly" -ForegroundColor Red
    $allPassed = $false
}

if ($apiConfig -match 'BASE_URL = "/odoo"') {
    Write-Host "  ✓ API base URL configured correctly" -ForegroundColor Green
} else {
    Write-Host "  ✗ API base URL not configured correctly" -ForegroundColor Red
    $allPassed = $false
}

# Test 7: Port Availability
Write-Host "`n[7/7] Testing Port Availability..." -ForegroundColor Yellow
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
$port8018 = Get-NetTCPConnection -LocalPort 8018 -ErrorAction SilentlyContinue

if ($port3000) {
    Write-Host "  ✓ Port 3000 is in use (Frontend)" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Port 3000 is not in use (Frontend may not be running)" -ForegroundColor Yellow
}

if ($port8018) {
    Write-Host "  ✓ Port 8018 is in use (Backend)" -ForegroundColor Green
} else {
    Write-Host "  ✗ Port 8018 is not in use (Backend not accessible)" -ForegroundColor Red
    $allPassed = $false
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "✓ ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "`nYour system is ready!" -ForegroundColor Green
    Write-Host "`nNext Steps:" -ForegroundColor Cyan
    Write-Host "1. Open http://localhost:8018" -ForegroundColor White
    Write-Host "2. Go to Apps → Install 'MESSOB Fleet Management'" -ForegroundColor White
    Write-Host "3. Open http://localhost:3000 and login" -ForegroundColor White
} else {
    Write-Host "⚠ SOME TESTS FAILED" -ForegroundColor Red
    Write-Host "`nPlease fix the issues above before proceeding." -ForegroundColor Yellow
    Write-Host "`nCommon fixes:" -ForegroundColor Cyan
    Write-Host "- Start Docker: docker-compose up -d odoo18 db18" -ForegroundColor White
    Write-Host "- Start Frontend: cd frontend && npm run dev" -ForegroundColor White
    Write-Host "- Check logs: docker-compose logs odoo18" -ForegroundColor White
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# URLs
Write-Host "Quick Access URLs:" -ForegroundColor Cyan
Write-Host "  Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:   http://localhost:8018" -ForegroundColor White
Write-Host "  Test Page: http://localhost:3000/test-connection.html" -ForegroundColor White
Write-Host ""

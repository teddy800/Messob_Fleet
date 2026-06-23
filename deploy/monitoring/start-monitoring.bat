@echo off
REM Start MESSOB Fleet Management Monitoring Stack (Windows)
REM NFR-4.1: 99.9% Availability Monitoring

echo Starting MESSOB Fleet Management Monitoring Stack...

REM Check if main application is running
docker ps | findstr "odoo18" >nul
if errorlevel 1 (
    echo WARNING: Odoo18 service is not running!
    echo Please start main application first: docker-compose up -d
    exit /b 1
)

REM Start monitoring services
cd /d "%~dp0"
docker-compose -f docker-compose.monitoring.yml up -d

echo.
echo Monitoring stack started successfully!
echo.
echo Access Points:
echo   - Prometheus:    http://localhost:9090
echo   - Grafana:       http://localhost:3001 (admin/admin)
echo   - AlertManager:  http://localhost:9093
echo.
echo Monitoring Components:
echo   * Prometheus      - Metrics collection and alerting
echo   * Grafana         - Visualization dashboards
echo   * AlertManager    - Alert routing and notifications
echo   * Node Exporter   - System metrics (CPU, Memory, Disk)
echo   * Postgres Export - Database metrics
echo   * Blackbox Export - Endpoint health checks
echo.
echo SRS Compliance:
echo   * NFR-4.1: 99.9%% availability monitoring enabled
echo   * NFR-1.1: API response time tracking (less than 500ms)
echo   * NFR-1.2: GPS update rate monitoring (1000+/min)
echo.
echo To view logs: docker-compose -f deploy\monitoring\docker-compose.monitoring.yml logs -f
echo To stop:      docker-compose -f deploy\monitoring\docker-compose.monitoring.yml down

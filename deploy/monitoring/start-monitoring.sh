#!/bin/bash
# Start MESSOB Fleet Management Monitoring Stack
# NFR-4.1: 99.9% Availability Monitoring

set -e

echo "🚀 Starting MESSOB Fleet Management Monitoring Stack..."

# Check if main application is running
if ! docker ps | grep -q "odoo18"; then
    echo "⚠️  WARNING: Odoo18 service is not running!"
    echo "Please start main application first: docker-compose up -d"
    exit 1
fi

# Start monitoring services
cd "$(dirname "$0")"
docker-compose -f docker-compose.monitoring.yml up -d

echo ""
echo "✅ Monitoring stack started successfully!"
echo ""
echo "📊 Access Points:"
echo "  - Prometheus:    http://localhost:9090"
echo "  - Grafana:       http://localhost:3001 (admin/admin)"
echo "  - AlertManager:  http://localhost:9093"
echo ""
echo "🔍 Monitoring Components:"
echo "  ✓ Prometheus      - Metrics collection and alerting"
echo "  ✓ Grafana         - Visualization dashboards"
echo "  ✓ AlertManager    - Alert routing and notifications"
echo "  ✓ Node Exporter   - System metrics (CPU, Memory, Disk)"
echo "  ✓ Postgres Export - Database metrics"
echo "  ✓ Blackbox Export - Endpoint health checks"
echo ""
echo "📈 SRS Compliance:"
echo "  ✓ NFR-4.1: 99.9% availability monitoring enabled"
echo "  ✓ NFR-1.1: API response time tracking (<500ms)"
echo "  ✓ NFR-1.2: GPS update rate monitoring (1000+/min)"
echo ""
echo "🔔 Alert Channels Configured:"
echo "  ✓ Email notifications to ops@messob.et"
echo "  ✓ Critical alerts to admin@messob.et"
echo "  ✓ SMS webhook integration ready"
echo ""
echo "To view logs: docker-compose -f deploy/monitoring/docker-compose.monitoring.yml logs -f"
echo "To stop:      docker-compose -f deploy/monitoring/docker-compose.monitoring.yml down"

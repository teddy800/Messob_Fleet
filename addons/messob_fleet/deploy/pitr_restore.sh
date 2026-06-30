#!/bin/bash
# ============================================================================
# MESSOB Fleet Management System - PITR Restore Script
# NFR-DB-2: Point-in-Time Recovery Implementation
# ============================================================================
# This script restores PostgreSQL database from PITR base backup
# Usage: ./pitr_restore.sh <backup_name> [target_time]
# Example: ./pitr_restore.sh base_backup_20240630_120000
# Example with time: ./pitr_restore.sh base_backup_20240630_120000 "2024-06-30 14:30:00"
# ============================================================================

set -e  # Exit on any error

# Configuration
BACKUP_DIR="/var/backups/fleet_management/pitr"
DB_CONTAINER="fleet_db"
DB_DATA_DIR="/var/lib/postgresql/data"
DB_USER="odoo"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Check arguments
if [ $# -lt 1 ]; then
    error "Usage: $0 <backup_name> [target_time]"
    error "Example: $0 base_backup_20240630_120000"
    error "Example with point-in-time: $0 base_backup_20240630_120000 \"2024-06-30 14:30:00\""
    exit 1
fi

BACKUP_NAME=$1
TARGET_TIME=${2:-""}
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Verify backup exists
if [ ! -d "${BACKUP_PATH}" ]; then
    error "Backup '${BACKUP_NAME}' not found at: ${BACKUP_PATH}"
    error "Available backups:"
    ls -1 "${BACKUP_DIR}" | grep "base_backup_"
    exit 1
fi

# Display warning banner
echo ""
echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${RED}║                       ⚠️  WARNING ⚠️                            ║${NC}"
echo -e "${RED}║                                                                ║${NC}"
echo -e "${RED}║  This operation will DESTROY the current database and         ║${NC}"
echo -e "${RED}║  restore it from backup: ${BACKUP_NAME:0:30}...║${NC}"
echo -e "${RED}║                                                                ║${NC}"
if [ -n "${TARGET_TIME}" ]; then
echo -e "${RED}║  Recovery target time: ${TARGET_TIME}                    ║${NC}"
else
echo -e "${RED}║  Recovery target: End of backup (latest available state)      ║${NC}"
fi
echo -e "${RED}║                                                                ║${NC}"
echo -e "${RED}║  ALL CURRENT DATA WILL BE LOST!                                ║${NC}"
echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Confirm with user
read -p "Type 'YES' to confirm database restoration: " confirmation
if [ "${confirmation}" != "YES" ]; then
    warning "Restoration cancelled by user"
    exit 0
fi

log "Starting PITR database restoration..."
log "Backup: ${BACKUP_NAME}"
if [ -n "${TARGET_TIME}" ]; then
    log "Target recovery time: ${TARGET_TIME}"
else
    log "Target recovery: Latest available state"
fi

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    error "Docker is not running or not accessible"
    exit 1
fi

# Stop dependent services (Odoo)
log "Stopping Odoo services..."
docker-compose stop odoo18 odoo1 odoo2 odoo3 2>/dev/null || true

# Stop database container
log "Stopping database container..."
docker stop "${DB_CONTAINER}" 2>/dev/null || true
sleep 5

# Backup current data (safety measure)
SAFETY_BACKUP_DIR="/var/backups/fleet_management/safety_backup_$(date +%Y%m%d_%H%M%S)"
log "Creating safety backup of current data: ${SAFETY_BACKUP_DIR}"
docker run --rm \
    -v fleet_db_data:/source \
    -v "${SAFETY_BACKUP_DIR}:/backup" \
    alpine \
    tar czf /backup/data_before_restore.tar.gz -C /source .

log "Safety backup created at: ${SAFETY_BACKUP_DIR}"

# Clear current data directory
log "Clearing current database data..."
docker run --rm \
    -v fleet_db_data:/data \
    alpine \
    sh -c "rm -rf /data/*"

# Restore base backup
log "Restoring base backup..."
docker run --rm \
    -v "${BACKUP_PATH}:/backup" \
    -v fleet_db_data:/data \
    alpine \
    tar xzf /backup/base.tar.gz -C /data

# Create recovery configuration
log "Creating recovery configuration..."
if [ -n "${TARGET_TIME}" ]; then
    RECOVERY_CONFIG="recovery_target_time = '${TARGET_TIME}'\nrecovery_target_action = 'promote'"
else
    RECOVERY_CONFIG="recovery_target = 'immediate'\nrecovery_target_action = 'promote'"
fi

# Create recovery.signal file
docker run --rm \
    -v fleet_db_data:/data \
    alpine \
    sh -c "touch /data/recovery.signal"

# Add recovery configuration to postgresql.auto.conf
docker run --rm \
    -v fleet_db_data:/data \
    alpine \
    sh -c "echo -e '${RECOVERY_CONFIG}' >> /data/postgresql.auto.conf"

# Restore WAL archive if available
WAL_ARCHIVE_PATH="${BACKUP_DIR}/wal_archive/${BACKUP_NAME}_wal"
if [ -d "${WAL_ARCHIVE_PATH}" ]; then
    log "Restoring WAL archive..."
    docker run --rm \
        -v "${WAL_ARCHIVE_PATH}:/wal_source" \
        -v fleet_db_wal_archive:/wal_dest \
        alpine \
        cp -r /wal_source/* /wal_dest/
else
    warning "WAL archive not found at: ${WAL_ARCHIVE_PATH}"
    warning "Recovery will only reach the state of the base backup"
fi

# Start database container
log "Starting database container..."
docker start "${DB_CONTAINER}"

# Wait for database to be ready
log "Waiting for database recovery to complete..."
RETRIES=0
MAX_RETRIES=60
while [ ${RETRIES} -lt ${MAX_RETRIES} ]; do
    if docker exec "${DB_CONTAINER}" pg_isready -U "${DB_USER}" > /dev/null 2>&1; then
        log "Database is ready!"
        break
    fi
    sleep 5
    RETRIES=$((RETRIES + 1))
    info "Waiting for database... (${RETRIES}/${MAX_RETRIES})"
done

if [ ${RETRIES} -eq ${MAX_RETRIES} ]; then
    error "Database failed to start within expected time"
    error "Check logs: docker logs ${DB_CONTAINER}"
    exit 1
fi

# Verify recovery
log "Verifying database recovery..."
RECOVERY_INFO=$(docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d postgres -t -c "SELECT pg_is_in_recovery();")
if echo "${RECOVERY_INFO}" | grep -q "f"; then
    log "Database recovery completed successfully!"
else
    error "Database is still in recovery mode"
    exit 1
fi

# Display recovery statistics
log "Gathering recovery statistics..."
docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d postgres -c "
SELECT 
    'Database Size' as metric, 
    pg_size_pretty(pg_database_size('fleet_management')) as value
UNION ALL
SELECT 
    'Recovery Completion Time' as metric, 
    now()::text as value;
"

# Start Odoo services
log "Starting Odoo services..."
docker-compose start odoo18 2>/dev/null || true

log "PITR database restoration completed successfully!"
log "Database has been restored from backup: ${BACKUP_NAME}"
if [ -n "${TARGET_TIME}" ]; then
    log "Recovery point: ${TARGET_TIME}"
else
    log "Recovery point: Latest available state"
fi
log "Safety backup stored at: ${SAFETY_BACKUP_DIR}"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  ✅  RESTORATION SUCCESSFUL ✅                  ║${NC}"
echo -e "${GREEN}║                                                                ║${NC}"
echo -e "${GREEN}║  Database has been restored from PITR backup                   ║${NC}"
echo -e "${GREEN}║  System is now operational                                     ║${NC}"
echo -e "${GREEN}║                                                                ║${NC}"
echo -e "${GREEN}║  Next steps:                                                   ║${NC}"
echo -e "${GREEN}║  1. Verify data integrity                                      ║${NC}"
echo -e "${GREEN}║  2. Test critical business functions                           ║${NC}"
echo -e "${GREEN}║  3. Inform users of restoration                                ║${NC}"
echo -e "${GREEN}║                                                                ║${NC}"
echo -e "${GREEN}║  Safety backup available at:                                   ║${NC}"
echo -e "${GREEN}║  ${SAFETY_BACKUP_DIR:0:62}║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

exit 0

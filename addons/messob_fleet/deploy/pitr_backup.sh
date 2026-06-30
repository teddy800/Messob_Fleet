#!/bin/bash
# ============================================================================
# MESSOB Fleet Management System - PITR Backup Script
# NFR-DB-2: Point-in-Time Recovery Implementation
# ============================================================================
# This script creates base backups for PostgreSQL PITR recovery
# Run this script regularly (recommended: daily via cron)
# ============================================================================

set -e  # Exit on any error

# Configuration
BACKUP_DIR="/var/backups/fleet_management/pitr"
RETENTION_DAYS=30
DB_CONTAINER="fleet_db"
DB_USER="odoo"
DB_NAME="fleet_management"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="base_backup_${TIMESTAMP}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
    error "Docker is not running or not accessible"
    exit 1
fi

# Check if database container exists
if ! docker ps -a --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    error "Database container '${DB_CONTAINER}' not found"
    exit 1
fi

# Check if database container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    error "Database container '${DB_CONTAINER}' is not running"
    exit 1
fi

log "Starting PITR base backup for MESSOB Fleet Management System"
log "Backup directory: ${BACKUP_DIR}"
log "Backup name: ${BACKUP_NAME}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Create base backup using pg_basebackup
log "Creating PostgreSQL base backup..."
docker exec -i "${DB_CONTAINER}" pg_basebackup \
    -U "${DB_USER}" \
    -D "/tmp/${BACKUP_NAME}" \
    -F tar \
    -z \
    -P \
    -X stream \
    -c fast

# Copy backup from container to host
log "Copying backup to host..."
docker cp "${DB_CONTAINER}:/tmp/${BACKUP_NAME}" "${BACKUP_DIR}/${BACKUP_NAME}"

# Clean up temporary backup in container
docker exec -i "${DB_CONTAINER}" rm -rf "/tmp/${BACKUP_NAME}"

# Get backup size
BACKUP_SIZE=$(du -sh "${BACKUP_DIR}/${BACKUP_NAME}" | cut -f1)
log "Backup completed successfully. Size: ${BACKUP_SIZE}"

# Create backup metadata file
cat > "${BACKUP_DIR}/${BACKUP_NAME}/backup_info.txt" << EOF
MESSOB Fleet Management System - PITR Base Backup
=================================================
Backup Name: ${BACKUP_NAME}
Backup Date: $(date)
Database: ${DB_NAME}
User: ${DB_USER}
Container: ${DB_CONTAINER}
Backup Size: ${BACKUP_SIZE}
Backup Type: PostgreSQL Base Backup (PITR)

Recovery Instructions:
1. Stop the database container
2. Clear the data directory
3. Restore base backup: tar -xzf base.tar.gz -C /var/lib/postgresql/data
4. Create recovery.signal file
5. Start the database container
6. Database will replay WAL files automatically

For detailed recovery steps, see: pitr_restore.sh
EOF

log "Backup metadata saved to: ${BACKUP_DIR}/${BACKUP_NAME}/backup_info.txt"

# Verify backup integrity
log "Verifying backup integrity..."
if [ -f "${BACKUP_DIR}/${BACKUP_NAME}/base.tar.gz" ]; then
    if tar -tzf "${BACKUP_DIR}/${BACKUP_NAME}/base.tar.gz" > /dev/null 2>&1; then
        log "Backup integrity verified successfully"
    else
        error "Backup integrity check failed!"
        exit 1
    fi
else
    error "Backup file not found!"
    exit 1
fi

# Clean up old backups (keep last RETENTION_DAYS days)
log "Cleaning up old backups (keeping last ${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -maxdepth 1 -type d -name "base_backup_*" -mtime +${RETENTION_DAYS} -exec rm -rf {} \;
OLD_BACKUPS_CLEANED=$(find "${BACKUP_DIR}" -maxdepth 1 -type d -name "base_backup_*" -mtime +${RETENTION_DAYS} | wc -l)
if [ ${OLD_BACKUPS_CLEANED} -gt 0 ]; then
    log "Cleaned up ${OLD_BACKUPS_CLEANED} old backup(s)"
else
    log "No old backups to clean up"
fi

# Display current backups
log "Current backups:"
ls -lh "${BACKUP_DIR}" | grep "base_backup_" | tail -5

# Calculate total backup size
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
log "Total backup directory size: ${TOTAL_SIZE}"

# Archive WAL files (optional - for additional safety)
WAL_ARCHIVE_DIR="${BACKUP_DIR}/wal_archive"
mkdir -p "${WAL_ARCHIVE_DIR}"
log "Archiving WAL files..."
docker cp "${DB_CONTAINER}:/var/lib/postgresql/wal_archive/" "${WAL_ARCHIVE_DIR}/${BACKUP_NAME}_wal/"

log "PITR base backup completed successfully!"
log "Backup location: ${BACKUP_DIR}/${BACKUP_NAME}"
log "To restore from this backup, use: ./pitr_restore.sh ${BACKUP_NAME}"

# Optional: Send notification (uncomment if needed)
# echo "PITR backup completed successfully" | mail -s "Fleet Management Backup - ${TIMESTAMP}" admin@messob.et

exit 0

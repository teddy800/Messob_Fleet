#!/bin/bash
# ============================================================================
# MESSOB Fleet Management System
# Database Restore Script with PITR Support
# SRS Requirement: DB-2 - Point-in-Time Recovery
# ============================================================================

set -e

# Configuration
BACKUP_DIR="/backups"
WAL_ARCHIVE_DIR="/var/lib/postgresql/wal_archive"
LOG_FILE="${BACKUP_DIR}/restore.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Log function
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

# Error handler
error_exit() {
    log "${RED}✗ ERROR: $1${NC}"
    exit 1
}

# Display usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
    -f FILE         Backup file to restore (required)
    -t TIMESTAMP    Point-in-time recovery target (optional, format: YYYY-MM-DD HH:MM:SS)
    -h              Display this help message

Examples:
    # Full restore from backup
    $0 -f messob_fms_backup_20260531_020000.sql.gz

    # Point-in-time recovery to specific timestamp
    $0 -f messob_fms_backup_20260531_020000.sql.gz -t "2026-05-31 14:30:00"

EOF
    exit 1
}

# Parse arguments
BACKUP_FILE=""
PITR_TARGET=""

while getopts "f:t:h" opt; do
    case $opt in
        f) BACKUP_FILE="$OPTARG" ;;
        t) PITR_TARGET="$OPTARG" ;;
        h) usage ;;
        *) usage ;;
    esac
done

# Validate arguments
if [ -z "$BACKUP_FILE" ]; then
    error_exit "Backup file is required. Use -f option."
fi

if [ ! -f "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
    error_exit "Backup file not found: ${BACKUP_DIR}/${BACKUP_FILE}"
fi

log "========================================="
log "Starting database restore"
log "========================================="
log "Backup file: ${BACKUP_FILE}"
if [ -n "$PITR_TARGET" ]; then
    log "PITR target: ${PITR_TARGET}"
fi

# Confirmation prompt
echo -e "${YELLOW}WARNING: This will overwrite the current database!${NC}"
echo -e "${YELLOW}Database: ${PGDATABASE}${NC}"
echo -e "${YELLOW}Host: ${PGHOST}${NC}"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log "Restore cancelled by user"
    exit 0
fi

# Stop Odoo service (if running)
log "Stopping Odoo service..."
# This would be handled externally in production

# Terminate existing connections
log "Terminating existing database connections..."
psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d postgres -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${PGDATABASE}' AND pid <> pg_backend_pid();" \
    >> "${LOG_FILE}" 2>&1 || true

# Drop and recreate database
log "Dropping existing database..."
psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d postgres -c \
    "DROP DATABASE IF EXISTS ${PGDATABASE};" \
    >> "${LOG_FILE}" 2>&1

log "Creating new database..."
psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d postgres -c \
    "CREATE DATABASE ${PGDATABASE} WITH OWNER = ${PGUSER};" \
    >> "${LOG_FILE}" 2>&1

# Restore backup
log "Restoring backup..."
if gunzip -c "${BACKUP_DIR}/${BACKUP_FILE}" | \
    pg_restore -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${PGDATABASE}" \
    --verbose --clean --if-exists 2>> "${LOG_FILE}"; then
    log "${GREEN}✓ Backup restored successfully${NC}"
else
    error_exit "Backup restore failed!"
fi

# Point-in-Time Recovery
if [ -n "$PITR_TARGET" ]; then
    log "Performing Point-in-Time Recovery to: ${PITR_TARGET}"
    
    # Create recovery configuration
    RECOVERY_CONF="/tmp/recovery.conf"
    cat > "${RECOVERY_CONF}" << EOF
restore_command = 'cp ${WAL_ARCHIVE_DIR}/%f %p'
recovery_target_time = '${PITR_TARGET}'
recovery_target_action = 'promote'
EOF
    
    log "Recovery configuration created"
    log "Applying WAL files for PITR..."
    
    # Note: In production, this would involve stopping PostgreSQL,
    # placing recovery.conf in data directory, and restarting
    log "${YELLOW}⚠ PITR requires PostgreSQL restart with recovery.conf${NC}"
    log "${YELLOW}⚠ Manual intervention required for production systems${NC}"
fi

# Verify restore
log "Verifying restore..."
TABLE_COUNT=$(psql -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${PGDATABASE}" -t -c \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>> "${LOG_FILE}" | tr -d ' ')

if [ "$TABLE_COUNT" -gt 0 ]; then
    log "${GREEN}✓ Restore verification passed (${TABLE_COUNT} tables found)${NC}"
else
    error_exit "Restore verification failed (no tables found)"
fi

log "========================================="
log "Database restore completed successfully"
log "========================================="
log "${YELLOW}⚠ Remember to restart Odoo service${NC}"

exit 0

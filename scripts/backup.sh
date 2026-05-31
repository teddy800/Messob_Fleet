#!/bin/bash
# ============================================================================
# MESSOB Fleet Management System
# Automated Database Backup Script
# SRS Requirement: DB-3 - Regular Automated Backups
# ============================================================================

set -e

# Configuration
BACKUP_DIR="/backups"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="messob_fms_backup_${TIMESTAMP}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

log "========================================="
log "Starting automated database backup"
log "========================================="

# Perform backup
log "Creating backup: ${BACKUP_FILE}"
if pg_dump -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${PGDATABASE}" \
    --format=custom --compress=9 --verbose \
    | gzip > "${BACKUP_DIR}/${BACKUP_FILE}" 2>> "${LOG_FILE}"; then
    
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    log "✓ Backup completed successfully: ${BACKUP_FILE} (${BACKUP_SIZE})"
    
    # Verify backup integrity
    log "Verifying backup integrity..."
    if gunzip -t "${BACKUP_DIR}/${BACKUP_FILE}" 2>> "${LOG_FILE}"; then
        log "✓ Backup verification passed"
    else
        log "✗ Backup verification failed!"
        exit 1
    fi
else
    log "✗ Backup failed!"
    exit 1
fi

# Cleanup old backups
log "Cleaning up backups older than ${RETENTION_DAYS} days..."
DELETED_COUNT=$(find "${BACKUP_DIR}" -name "messob_fms_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete -print | wc -l)
log "✓ Deleted ${DELETED_COUNT} old backup(s)"

# Display backup statistics
TOTAL_BACKUPS=$(find "${BACKUP_DIR}" -name "messob_fms_backup_*.sql.gz" -type f | wc -l)
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
log "Backup statistics:"
log "  - Total backups: ${TOTAL_BACKUPS}"
log "  - Total size: ${TOTAL_SIZE}"
log "  - Retention: ${RETENTION_DAYS} days"

log "========================================="
log "Backup process completed successfully"
log "========================================="

exit 0

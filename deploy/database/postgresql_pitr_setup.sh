#!/bin/bash
# ---------------------------------------------------------------------------
# MESSOB Fleet Management System
# PostgreSQL Point-in-Time Recovery (PITR) Setup Script
# Requirement: DB-2 (SRS §6.2)
#
# This script configures PostgreSQL for Point-in-Time Recovery,
# enabling restoration to any point in time in case of failure.
#
# Features:
#   - WAL (Write-Ahead Logging) archiving
#   - Continuous backup capability
#   - Automated archive management
#   - Restore point creation
#
# Usage:
#   sudo ./postgresql_pitr_setup.sh
# ---------------------------------------------------------------------------

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   MESSOB Fleet Management - PostgreSQL PITR Setup${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

# Configuration
PG_VERSION="16"
PG_DATA_DIR="/var/lib/postgresql/${PG_VERSION}/main"
PG_CONFIG_FILE="/etc/postgresql/${PG_VERSION}/main/postgresql.conf"
WAL_ARCHIVE_DIR="/var/lib/postgresql/wal_archive"
BACKUP_DIR="/var/lib/postgresql/backups"
LOG_FILE="/var/log/postgresql/pitr_setup.log"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: This script must be run as root (use sudo)${NC}"
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: PostgreSQL is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ PostgreSQL detected${NC}"

# Create directories
echo -e "${YELLOW}Creating archive directories...${NC}"
mkdir -p ${WAL_ARCHIVE_DIR}
mkdir -p ${BACKUP_DIR}
chown -R postgres:postgres ${WAL_ARCHIVE_DIR}
chown -R postgres:postgres ${BACKUP_DIR}
chmod 700 ${WAL_ARCHIVE_DIR}
chmod 700 ${BACKUP_DIR}
echo -e "${GREEN}✓ Directories created${NC}"

# Backup original postgresql.conf
echo -e "${YELLOW}Backing up postgresql.conf...${NC}"
cp ${PG_CONFIG_FILE} ${PG_CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)
echo -e "${GREEN}✓ Configuration backed up${NC}"

# Configure PostgreSQL for PITR
echo -e "${YELLOW}Configuring PostgreSQL for PITR...${NC}"

cat >> ${PG_CONFIG_FILE} << 'EOF'

# ============================================================================
# MESSOB Fleet Management - PITR Configuration
# Added by postgresql_pitr_setup.sh
# ============================================================================

# WAL Settings (Write-Ahead Logging)
wal_level = replica                    # Enables PITR and replication
archive_mode = on                      # Enable WAL archiving
archive_command = 'test ! -f /var/lib/postgresql/wal_archive/%f && cp %p /var/lib/postgresql/wal_archive/%f'
archive_timeout = 300                  # Force archive every 5 minutes

# WAL Configuration
max_wal_size = 2GB                     # Maximum WAL size before checkpoint
min_wal_size = 1GB                     # Minimum WAL retention
wal_keep_size = 512MB                  # Keep at least 512MB of WAL files

# Checkpoint Settings (optimized for PITR)
checkpoint_completion_target = 0.9     # Spread checkpoints over 90% of interval
checkpoint_timeout = 15min             # Maximum time between checkpoints

# Replication (for future high availability)
max_wal_senders = 10                   # Allow up to 10 replication connections
wal_sender_timeout = 60s               # Timeout for replication

# ============================================================================
# Performance Tuning for MESSOB Fleet (NFR-1.1, NFR-1.2, NFR-1.3)
# ============================================================================

# Memory Settings
shared_buffers = 2GB                   # 25% of system RAM (for 8GB system)
effective_cache_size = 6GB             # 75% of system RAM
maintenance_work_mem = 512MB           # Memory for maintenance operations
work_mem = 32MB                        # Memory per query operation

# Connection Settings
max_connections = 200                  # Support 1,000+ concurrent users (NFR-1.2)
shared_preload_libraries = 'pg_stat_statements'  # Query performance monitoring

# Query Planner
random_page_cost = 1.1                 # SSD optimization
effective_io_concurrency = 200         # SSD concurrent I/O

# Logging (for performance monitoring and security auditing)
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d.log'
log_min_duration_statement = 500       # Log queries taking > 500ms (NFR-1.1)
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
log_temp_files = 0

# Autovacuum (optimized for high-write workload)
autovacuum = on
autovacuum_max_workers = 4
autovacuum_naptime = 30s

# ============================================================================

EOF

echo -e "${GREEN}✓ PostgreSQL configured for PITR${NC}"

# Restart PostgreSQL to apply changes
echo -e "${YELLOW}Restarting PostgreSQL...${NC}"
systemctl restart postgresql
sleep 5

# Verify PostgreSQL is running
if systemctl is-active --quiet postgresql; then
    echo -e "${GREEN}✓ PostgreSQL restarted successfully${NC}"
else
    echo -e "${RED}Error: PostgreSQL failed to restart${NC}"
    echo -e "${YELLOW}Check logs: journalctl -u postgresql${NC}"
    exit 1
fi

# Verify PITR configuration
echo -e "${YELLOW}Verifying PITR configuration...${NC}"
WAL_LEVEL=$(sudo -u postgres psql -t -c "SHOW wal_level;" | xargs)
ARCHIVE_MODE=$(sudo -u postgres psql -t -c "SHOW archive_mode;" | xargs)

if [ "$WAL_LEVEL" = "replica" ] && [ "$ARCHIVE_MODE" = "on" ]; then
    echo -e "${GREEN}✓ PITR configuration verified${NC}"
else
    echo -e "${RED}Error: PITR configuration verification failed${NC}"
    echo "wal_level: $WAL_LEVEL (expected: replica)"
    echo "archive_mode: $ARCHIVE_MODE (expected: on)"
    exit 1
fi

# Create initial base backup
echo -e "${YELLOW}Creating initial base backup...${NC}"
BACKUP_NAME="base_backup_$(date +%Y%m%d_%H%M%S)"
sudo -u postgres pg_basebackup -D ${BACKUP_DIR}/${BACKUP_NAME} -Ft -z -Xs -P

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Base backup created: ${BACKUP_DIR}/${BACKUP_NAME}${NC}"
else
    echo -e "${RED}Error: Base backup failed${NC}"
    exit 1
fi

# Create restore script
echo -e "${YELLOW}Creating restore script...${NC}"
cat > /usr/local/bin/messob_fleet_pitr_restore.sh << 'RESTORE_SCRIPT'
#!/bin/bash
# ---------------------------------------------------------------------------
# MESSOB Fleet Management - PITR Restore Script
# Usage: messob_fleet_pitr_restore.sh <backup_name> <restore_target_time>
# Example: messob_fleet_pitr_restore.sh base_backup_20260604_120000 "2026-06-04 14:30:00"
# ---------------------------------------------------------------------------

if [ $# -ne 2 ]; then
    echo "Usage: $0 <backup_name> <restore_target_time>"
    echo "Example: $0 base_backup_20260604_120000 \"2026-06-04 14:30:00\""
    exit 1
fi

BACKUP_NAME=$1
RESTORE_TIME=$2
PG_DATA_DIR="/var/lib/postgresql/16/main"
BACKUP_DIR="/var/lib/postgresql/backups"
WAL_ARCHIVE_DIR="/var/lib/postgresql/wal_archive"

echo "⚠️  WARNING: This will stop PostgreSQL and restore from backup"
echo "Backup: ${BACKUP_NAME}"
echo "Restore to: ${RESTORE_TIME}"
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

# Stop PostgreSQL
echo "Stopping PostgreSQL..."
systemctl stop postgresql

# Backup current data directory
echo "Backing up current data directory..."
mv ${PG_DATA_DIR} ${PG_DATA_DIR}.old.$(date +%Y%m%d_%H%M%S)

# Extract base backup
echo "Extracting base backup..."
mkdir -p ${PG_DATA_DIR}
tar -xzf ${BACKUP_DIR}/${BACKUP_NAME}/base.tar.gz -C ${PG_DATA_DIR}
tar -xzf ${BACKUP_DIR}/${BACKUP_NAME}/pg_wal.tar.gz -C ${PG_DATA_DIR}/pg_wal

# Create recovery.signal
touch ${PG_DATA_DIR}/recovery.signal

# Configure recovery
cat > ${PG_DATA_DIR}/postgresql.auto.conf << EOF
restore_command = 'cp ${WAL_ARCHIVE_DIR}/%f %p'
recovery_target_time = '${RESTORE_TIME}'
recovery_target_action = 'promote'
EOF

# Set ownership
chown -R postgres:postgres ${PG_DATA_DIR}
chmod 700 ${PG_DATA_DIR}

# Start PostgreSQL
echo "Starting PostgreSQL..."
systemctl start postgresql

echo "✓ Restore initiated. PostgreSQL is recovering to ${RESTORE_TIME}"
echo "Monitor recovery: tail -f /var/log/postgresql/postgresql-*.log"
RESTORE_SCRIPT

chmod +x /usr/local/bin/messob_fleet_pitr_restore.sh
echo -e "${GREEN}✓ Restore script created: /usr/local/bin/messob_fleet_pitr_restore.sh${NC}"

# Create monitoring script
cat > /usr/local/bin/messob_fleet_pitr_status.sh << 'STATUS_SCRIPT'
#!/bin/bash
# ---------------------------------------------------------------------------
# MESSOB Fleet Management - PITR Status Monitor
# ---------------------------------------------------------------------------

echo "═══════════════════════════════════════════════════════════"
echo "   MESSOB Fleet Management - PITR Status"
echo "═══════════════════════════════════════════════════════════"

# PostgreSQL status
echo "PostgreSQL Status:"
systemctl status postgresql --no-pager | grep "Active:"

# WAL archiving status
echo -e "\nWAL Archiving:"
sudo -u postgres psql -c "SELECT archived_count, failed_count, last_archived_time FROM pg_stat_archiver;"

# Archive directory
echo -e "\nWAL Archive Directory:"
echo "Location: /var/lib/postgresql/wal_archive"
WAL_COUNT=$(ls -1 /var/lib/postgresql/wal_archive | wc -l)
WAL_SIZE=$(du -sh /var/lib/postgresql/wal_archive | cut -f1)
echo "Files: ${WAL_COUNT}"
echo "Size: ${WAL_SIZE}"

# Base backups
echo -e "\nBase Backups:"
ls -lh /var/lib/postgresql/backups/ | tail -n +2

# Current WAL position
echo -e "\nCurrent WAL Position:"
sudo -u postgres psql -c "SELECT pg_current_wal_lsn();"

echo "═══════════════════════════════════════════════════════════"
STATUS_SCRIPT

chmod +x /usr/local/bin/messob_fleet_pitr_status.sh
echo -e "${GREEN}✓ Status script created: /usr/local/bin/messob_fleet_pitr_status.sh${NC}"

# Log setup completion
echo "$(date): PITR setup completed successfully" | tee -a ${LOG_FILE}

# Display summary
echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ PITR Setup Complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Configuration Summary:${NC}"
echo "  • WAL Level: replica"
echo "  • Archive Mode: on"
echo "  • Archive Directory: ${WAL_ARCHIVE_DIR}"
echo "  • Backup Directory: ${BACKUP_DIR}"
echo "  • Archive Interval: 5 minutes"
echo ""
echo -e "${GREEN}Available Commands:${NC}"
echo "  • Check status: messob_fleet_pitr_status.sh"
echo "  • Restore: messob_fleet_pitr_restore.sh <backup_name> <time>"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Verify PITR status: messob_fleet_pitr_status.sh"
echo "  2. Setup automated backups (see automated_backup_setup.sh)"
echo "  3. Test restore procedure in staging environment"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

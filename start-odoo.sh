#!/bin/bash
# Startup script for Odoo on Render

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 10

# Start Odoo with configuration from environment variables
exec odoo \
  --db_host=${HOST} \
  --db_port=${DB_PORT:-5432} \
  --db_user=${USER} \
  --db_password=${PASSWORD} \
  --http-port=${PORT:-8069} \
  --workers=2 \
  --max-cron-threads=1 \
  --addons-path=/mnt/extra-addons \
  --log-level=info \
  --logfile=-

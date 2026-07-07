#!/bin/bash
set -e

# Replace ${ADMIN_PASSWORD} placeholder in odoo.conf with actual value
if [ -n "$ADMIN_PASSWORD" ]; then
    sed -i "s/\${ADMIN_PASSWORD}/$ADMIN_PASSWORD/g" /etc/odoo/odoo.conf
fi

# Start Odoo with all provided configuration
exec odoo --config=/etc/odoo/odoo.conf \
    --db_host=${HOST:-localhost} \
    --db_port=${DB_PORT:-5432} \
    --db_user=${USER:-odoo} \
    --db_password=${PASSWORD:-odoo} \
    --http-port=${PORT:-8069}

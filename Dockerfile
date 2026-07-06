FROM odoo:18.0

USER root

# Install additional dependencies
RUN apt-get update && apt-get install -y \
    python3-pip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
# Using --break-system-packages because Odoo container is isolated
COPY requirements.txt /tmp/requirements.txt
RUN pip3 install --break-system-packages --no-cache-dir -r /tmp/requirements.txt

# Copy Odoo configuration file
COPY odoo.conf /etc/odoo/odoo.conf

# Copy custom addons
COPY ./addons /mnt/extra-addons

# Set permissions
RUN chown -R odoo:odoo /mnt/extra-addons && \
    chown odoo:odoo /etc/odoo/odoo.conf

USER odoo

# Expose Odoo port
EXPOSE 8069

# Start Odoo with config file and environment variable overrides
# Pass PGSSLMODE inline to ensure psycopg2 uses it
CMD sh -c "PGSSLMODE=allow odoo \
    --config=/etc/odoo/odoo.conf \
    --db_host=\${HOST:-localhost} \
    --db_port=\${DB_PORT:-5432} \
    --db_user=\${USER:-odoo} \
    --db_password=\${PASSWORD:-odoo} \
    --http-port=\${PORT:-8069}"

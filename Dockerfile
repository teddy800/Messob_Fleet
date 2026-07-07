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

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Copy custom addons
COPY ./addons /mnt/extra-addons

# Set permissions
RUN chown -R odoo:odoo /mnt/extra-addons && \
    chown odoo:odoo /etc/odoo/odoo.conf && \
    chown odoo:odoo /entrypoint.sh

USER odoo

# Set SSL mode as environment variable that psycopg2 will read
# Using 'require' enforces SSL without certificate verification
ENV PGSSLMODE=require

# Expose Odoo port
EXPOSE 8069

# Start Odoo via entrypoint script
# The entrypoint will substitute ADMIN_PASSWORD in odoo.conf and start Odoo
ENTRYPOINT ["/entrypoint.sh"]

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

# Copy custom addons
COPY ./addons /mnt/extra-addons

# Set permissions
RUN chown -R odoo:odoo /mnt/extra-addons

USER odoo

# Expose Odoo port
EXPOSE 8069

# Start Odoo with explicit database connection parameters
# Using shell form to allow environment variable substitution  
# Odoo will start and show database manager interface on first access
CMD odoo \
    --db_host=${HOST:-localhost} \
    --db_port=${DB_PORT:-5432} \
    --db_user=${USER:-odoo} \
    --db_password=${PASSWORD:-odoo} \
    --http-port=${PORT:-8069} \
    --addons-path=/mnt/extra-addons \
    --without-demo=all \
    --log-level=info \
    --db-template=template0 \
    --db_sslmode=require

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

# Environment variables will be read by Odoo automatically
# Start Odoo server
ENTRYPOINT ["/entrypoint.sh"]
CMD ["odoo"]

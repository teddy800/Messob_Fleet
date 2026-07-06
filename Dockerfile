FROM odoo:18.0

USER root

# Install additional dependencies
RUN apt-get update && apt-get install -y \
    python3-pip \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt /tmp/requirements.txt
RUN pip3 install --no-cache-dir -r /tmp/requirements.txt

# Copy custom addons
COPY ./addons /mnt/extra-addons

# Set permissions
RUN chown -R odoo:odoo /mnt/extra-addons

USER odoo

# Expose Odoo port
EXPOSE 8069

# Start Odoo - environment variables are read automatically
CMD ["odoo"]

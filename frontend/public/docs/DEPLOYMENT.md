# MESSOB Fleet Management System
## Deployment Guide

**Version:** 1.1.0  
**Last Updated:** June 2026  
**For:** System Administrators and DevOps Engineers

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Environment Setup](#development-environment-setup)
3. [Production Deployment](#production-deployment)
4. [Configuration](#configuration)
5. [Database Setup](#database-setup)
6. [SSL/TLS Setup](#ssltls-setup)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Backup and Recovery](#backup-and-recovery)
9. [Troubleshooting](#troubleshooting)

---

## 1. Prerequisites

### System Requirements

**Hardware:**
- CPU: 4 cores minimum (8 recommended)
- RAM: 8GB minimum (16GB recommended)
- Storage: 200GB minimum (500GB recommended, SSD preferred)
- Network: 100 Mbps connection

**Operating System:**
- Ubuntu 20.04 LTS or 22.04 LTS (recommended)
- Debian 11+
- CentOS 8+
- Windows Server 2019+ (for development only)

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| **Python** | 3.10+ | Backend runtime |
| **Node.js** | 18 LTS+ | Frontend build |
| **PostgreSQL** | 14+ | Database |
| **Nginx** | 1.18+ | Web server/reverse proxy |
| **Git** | 2.0+ | Version control |

---

## 2. Development Environment Setup

### Step 1: Install Dependencies

**Ubuntu/Debian:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python and dependencies
sudo apt install -y python3.10 python3-pip python3-dev python3-venv

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install Git
sudo apt install -y git

# Install additional dependencies for Odoo
sudo apt install -y libpq-dev libxml2-dev libxslt1-dev \
    libldap2-dev libsasl2-dev libjpeg-dev zlib1g-dev
```

### Step 2: Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/mesob_fleet_management.git
cd mesob_fleet_management
```

### Step 3: Setup Backend (Odoo)

```bash
# Create Python virtual environment
python3 -m venv odoo-venv
source odoo-venv/bin/activate

# Install Odoo (if not bundled)
pip install odoo==16.0

# Install additional Python dependencies
pip install -r requirements.txt
```

### Step 4: Setup Frontend (React)

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

**Example .env:**
```env
VITE_API_URL=http://localhost:8069
VITE_APP_NAME="MESSOB Fleet Management"
VITE_ENABLE_GPS=true
```

### Step 5: Setup Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE messob_fleet;
CREATE USER messob_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE messob_fleet TO messob_user;
\q
```

### Step 6: Configure Odoo

Create `odoo.conf`:
```ini
[options]
addons_path = /path/to/addons,/path/to/messob_fleet_management/addons
admin_passwd = admin_master_password
db_host = localhost
db_port = 5432
db_user = messob_user
db_password = your_secure_password
db_name = messob_fleet
http_port = 8069
logfile = /var/log/odoo/odoo.log
log_level = info
```

### Step 7: Initialize Database

```bash
# Run Odoo to initialize database
odoo -c odoo.conf -d messob_fleet -i messob_fleet --stop-after-init

# Start Odoo server
odoo -c odoo.conf
```

### Step 8: Run Frontend Development Server

```bash
cd frontend
npm run dev
```

Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8069

---

## 3. Production Deployment

### Option 1: Manual Deployment

#### Step 1: Build Frontend

```bash
cd frontend
npm run build

# Output will be in frontend/dist
```

#### Step 2: Configure Nginx

Create `/etc/nginx/sites-available/messob-fleet`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend (React)
    location / {
        root /var/www/messob-fleet/dist;
        try_files $uri /index.html;
    }

    # Backend API (Odoo)
    location /api {
        proxy_pass http://localhost:8069;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /websocket {
        proxy_pass http://localhost:8069;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Static files
    location /static {
        alias /var/www/messob-fleet/static;
        expires 30d;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/messob-fleet /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 3: Setup Systemd Service for Odoo

Create `/etc/systemd/system/odoo.service`:

```ini
[Unit]
Description=Odoo Fleet Management
After=network.target postgresql.service

[Service]
Type=simple
User=odoo
Group=odoo
ExecStart=/opt/odoo/odoo-venv/bin/python /opt/odoo/odoo-bin -c /etc/odoo/odoo.conf
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable odoo
sudo systemctl start odoo
sudo systemctl status odoo
```

### Option 2: Docker Deployment

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=messob_fleet
      - POSTGRES_USER=messob_user
      - POSTGRES_PASSWORD=your_secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - fleet_network

  odoo:
    image: odoo:16.0
    depends_on:
      - db
    ports:
      - "8069:8069"
    environment:
      - HOST=db
      - USER=messob_user
      - PASSWORD=your_secure_password
    volumes:
      - ./addons:/mnt/extra-addons
      - odoo_data:/var/lib/odoo
    networks:
      - fleet_network

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - odoo
    networks:
      - fleet_network

volumes:
  postgres_data:
  odoo_data:

networks:
  fleet_network:
```

Deploy:
```bash
docker-compose up -d
```

---

## 4. Configuration

### Environment Variables

**Frontend (.env):**
```env
VITE_API_URL=https://your-domain.com/api
VITE_WS_URL=wss://your-domain.com/websocket
VITE_MAPBOX_TOKEN=your_mapbox_token
VITE_GPS_UPDATE_INTERVAL=5000
```

**Backend (odoo.conf):**
```ini
[options]
addons_path = /opt/odoo/addons,/opt/odoo/custom-addons
admin_passwd = CHANGE_ME_STRONG_PASSWORD
db_host = localhost
db_port = 5432
db_user = messob_user
db_password = STRONG_DB_PASSWORD
db_maxconn = 64
workers = 4
max_cron_threads = 2
limit_memory_hard = 2684354560
limit_memory_soft = 2147483648
limit_request = 8192
limit_time_cpu = 600
limit_time_real = 1200
log_level = info
proxy_mode = True
```

### Database Configuration

**PostgreSQL tuning** (`/etc/postgresql/14/main/postgresql.conf`):

```ini
# Memory
shared_buffers = 4GB
effective_cache_size = 12GB
maintenance_work_mem = 1GB
work_mem = 64MB

# Connections
max_connections = 200

# Write-Ahead Logging
wal_buffers = 16MB
checkpoint_completion_target = 0.9

# Query Planning
random_page_cost = 1.1
effective_io_concurrency = 200
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

---

## 5. Database Setup

### Initial Setup

```bash
# Create database
createdb -U messob_user messob_fleet

# Load initial data
psql -U messob_user -d messob_fleet < initial_data.sql

# Run migrations (if using Alembic)
alembic upgrade head
```

### Database Optimization

```sql
-- Create indexes for performance
CREATE INDEX idx_trip_requests_status ON trip_requests(status);
CREATE INDEX idx_trip_requests_date ON trip_requests(start_date);
CREATE INDEX idx_gps_positions_timestamp ON gps_positions(timestamp DESC);
CREATE INDEX idx_gps_positions_vehicle ON gps_positions(vehicle_id, timestamp DESC);

-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Regular Maintenance

```bash
# Vacuum database (weekly)
vacuumdb -U messob_user -d messob_fleet -z -v

# Reindex (monthly)
reindexdb -U messob_user -d messob_fleet
```

---

## 6. SSL/TLS Setup

### Using Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal is configured by default
# Test renewal:
sudo certbot renew --dry-run
```

### Manual SSL Configuration

If using custom certificates, update Nginx:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/your-cert.crt;
    ssl_certificate_key /etc/ssl/private/your-key.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # ... rest of configuration
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 7. Monitoring and Logging

### Application Logging

**Odoo logs** (`/var/log/odoo/odoo.log`):
```bash
# View real-time logs
tail -f /var/log/odoo/odoo.log

# Search for errors
grep ERROR /var/log/odoo/odoo.log
```

**Nginx logs:**
```bash
# Access log
tail -f /var/log/nginx/access.log

# Error log
tail -f /var/log/nginx/error.log
```

### System Monitoring

**Install monitoring tools:**
```bash
# Install monitoring stack
sudo apt install prometheus grafana

# Configure Prometheus to scrape metrics
```

**Key Metrics to Monitor:**
- CPU usage
- Memory usage
- Disk I/O
- Database connections
- API response times
- Error rates

### Uptime Monitoring

Use external services:
- UptimeRobot
- Pingdom
- StatusCake

Configure alerts for:
- Website down
- API endpoint failures
- Database connection issues

---

## 8. Backup and Recovery

### Database Backup

**Automated daily backups:**

Create `/usr/local/bin/backup-db.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/backup/postgres"
DB_NAME="messob_fleet"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
pg_dump -U messob_user $DB_NAME | gzip > "$BACKUP_DIR/${DB_NAME}_${DATE}.sql.gz"

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: ${DB_NAME}_${DATE}.sql.gz"
```

Add to crontab:
```bash
# Daily backup at 2 AM
0 2 * * * /usr/local/bin/backup-db.sh
```

### File Backup

**Backup important directories:**
```bash
# Odoo filestore
tar -czf /backup/filestore_$(date +%Y%m%d).tar.gz /var/lib/odoo/filestore

# Application files
tar -czf /backup/app_$(date +%Y%m%d).tar.gz /opt/messob-fleet

# Configuration files
tar -czf /backup/config_$(date +%Y%m%d).tar.gz /etc/odoo /etc/nginx
```

### Recovery Procedure

**Database restore:**
```bash
# Stop application
sudo systemctl stop odoo

# Drop existing database
dropdb -U messob_user messob_fleet

# Create new database
createdb -U messob_user messob_fleet

# Restore from backup
gunzip < /backup/postgres/messob_fleet_20260608.sql.gz | psql -U messob_user messob_fleet

# Restart application
sudo systemctl start odoo
```

### Disaster Recovery Plan

1. **Off-site backups:** Store backups in different location/cloud
2. **Regular testing:** Test restore procedure monthly
3. **Documentation:** Keep recovery steps documented
4. **Recovery Time Objective (RTO):** < 4 hours
5. **Recovery Point Objective (RPO):** < 24 hours

---

## 9. Troubleshooting

### Common Issues

#### Issue: Odoo Won't Start

**Check logs:**
```bash
sudo journalctl -u odoo -n 50
```

**Common causes:**
- Database connection failure
- Port already in use
- Missing dependencies
- Configuration file errors

**Solution:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check if port 8069 is available
sudo netstat -tlnp | grep 8069

# Verify configuration
odoo -c /etc/odoo/odoo.conf --test-enable
```

#### Issue: Frontend Not Loading

**Check:**
1. Nginx configuration: `sudo nginx -t`
2. Nginx is running: `sudo systemctl status nginx`
3. Build files exist: `ls /var/www/messob-fleet/dist`
4. Browser console for errors

**Solution:**
```bash
# Rebuild frontend
cd /opt/messob-fleet/frontend
npm run build

# Copy to web root
sudo cp -r dist/* /var/www/messob-fleet/dist/

# Restart Nginx
sudo systemctl restart nginx
```

#### Issue: GPS Data Not Updating

**Check:**
1. WebSocket connection (browser DevTools → Network → WS)
2. GPS webhook endpoint accessible
3. GPS devices configured with correct endpoint

**Solution:**
```bash
# Test webhook endpoint
curl -X POST http://your-domain.com/api/gps/webhook \
  -H "Content-Type: application/json" \
  -d '{"device_id": "TEST", "lat": 9.03, "lng": 38.74, "speed": 0}'

# Check Odoo logs for webhook errors
grep "gps" /var/log/odoo/odoo.log
```

#### Issue: Slow Performance

**Diagnose:**
```bash
# Check CPU and memory
htop

# Check database performance
sudo -u postgres psql messob_fleet -c "
  SELECT query, calls, total_time, mean_time 
  FROM pg_stat_statements 
  ORDER BY total_time DESC 
  LIMIT 10;"

# Check slow queries
tail -f /var/log/postgresql/postgresql-14-main.log | grep "duration:"
```

**Optimize:**
```bash
# Increase workers in odoo.conf
workers = 8

# Add database indexes (see Database Optimization section)

# Enable Redis caching
```

### Performance Tuning

**Frontend:**
- Enable gzip compression in Nginx
- Use CDN for static assets
- Implement service worker for caching

**Backend:**
- Increase Odoo workers (1 worker per 6 concurrent users)
- Enable database connection pooling
- Optimize database queries

**Database:**
- Regular VACUUM and ANALYZE
- Proper indexing
- Increase shared_buffers

---

## Appendix

### Deployment Checklist

**Pre-Deployment:**
- [ ] Backup current production database
- [ ] Test in staging environment
- [ ] Review configuration changes
- [ ] Notify users of maintenance window

**Deployment:**
- [ ] Enable maintenance mode
- [ ] Pull latest code
- [ ] Run database migrations
- [ ] Build frontend assets
- [ ] Update configuration files
- [ ] Restart services
- [ ] Verify application starts

**Post-Deployment:**
- [ ] Run smoke tests
- [ ] Check logs for errors
- [ ] Test critical user flows
- [ ] Disable maintenance mode
- [ ] Monitor for 30 minutes
- [ ] Document any issues

### Maintenance Schedule

**Daily:**
- Monitor error logs
- Check disk space
- Verify backups completed

**Weekly:**
- Review performance metrics
- Vacuum database
- Update system packages

**Monthly:**
- Review security logs
- Test disaster recovery
- Update dependencies
- Performance optimization review

**Quarterly:**
- Security audit
- Capacity planning review
- Update SSL certificates (if needed)

---

**Document Version:** 1.1.0  
**Last Reviewed:** June 2026  
**Next Review:** December 2026  

© 2026 MESSOB Center. All rights reserved.

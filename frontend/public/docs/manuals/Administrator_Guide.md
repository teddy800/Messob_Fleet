# MESSOB Fleet Management System
## Administrator's Guide

**Version:** 1.1.0  
**Last Updated:** December 2024  
**Target Audience:** System Administrators & IT Staff

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Architecture](#2-system-architecture)
3. [Installation & Deployment](#3-installation--deployment)
4. [User Management](#4-user-management)
5. [Fleet Configuration](#5-fleet-configuration)
6. [Security Management](#6-security-management)
7. [Database Administration](#7-database-administration)
8. [Performance Monitoring](#8-performance-monitoring)
9. [Backup & Recovery](#9-backup--recovery)
10. [Integration Management](#10-integration-management)
11. [Troubleshooting](#11-troubleshooting)
12. [Maintenance Procedures](#12-maintenance-procedures)

---

## 1. Introduction

### 1.1 Purpose

This guide provides comprehensive technical documentation for administrators responsible for deploying, configuring, and maintaining the MESSOB Fleet Management System.

### 1.2 Administrator Responsibilities

- System installation and configuration
- User and role management
- Security policy enforcement
- Performance monitoring and optimization
- Backup and disaster recovery
- Integration with external systems
- Technical support and troubleshooting

### 1.3 Prerequisites

**Technical Skills Required:**
- Linux system administration
- Docker and containerization
- PostgreSQL database management
- Web server configuration (Nginx)
- Python and JavaScript basics
- Network and security concepts

**Access Required:**
- Server root/sudo access
- Database administrator privileges
- Application admin account
- SSL certificates (for production)

---

## 2. System Architecture

### 2.1 Component Overview

```
┌─────────────────────────────────────────────────┐
│             Load Balancer (Nginx)               │
└─────────────────┬───────────────────────────────┘
                  │
     ┌────────────┴────────────┐
     │                         │
┌────▼─────┐            ┌─────▼────┐
│  Odoo    │            │  React   │
│ Backend  │◄───────────┤ Frontend │
│ (Python) │            │  (Vite)  │
└────┬─────┘            └──────────┘
     │
     ├───► PostgreSQL 16 (Database)
     ├───► Redis (Cache)
     ├───► GPS Gateway (External)
     └───► SMS Provider (External)
```

### 2.2 Technology Stack

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Backend | Odoo | 18.0 | Business logic |
| Frontend | React | 19.0 | User interface |
| Database | PostgreSQL | 16.0 | Data storage |
| Cache | Redis | 7.x | Performance |
| Web Server | Nginx | 1.24+ | Reverse proxy |
| Container | Docker | 24.0+ | Deployment |

### 2.3 Port Configuration

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Odoo | 8018 | HTTP | Backend API |
| Frontend | 3000 | HTTP | Dev server |
| PostgreSQL | 5432 | TCP | Database |
| Redis | 6379 | TCP | Cache |
| Nginx | 80/443 | HTTP/HTTPS | Public access |

### 2.4 Directory Structure

```
mesob_fleet_management/
├── addons/messob_fleet/     # Backend module
│   ├── controllers/         # API endpoints
│   ├── models/              # Business logic
│   ├── security/            # Access control
│   ├── data/                # Master data
│   └── services/            # External integrations
├── frontend/                # React application
│   ├── src/
│   │   ├── features/        # Feature modules
│   │   ├── components/      # Reusable components
│   │   └── lib/             # Utilities
│   └── public/
├── docs/                    # Documentation
├── deploy/                  # Deployment configs
└── docker-compose.yml       # Container orchestration
```

---

## 3. Installation & Deployment

### 3.1 System Requirements

**Minimum (Development):**
- CPU: 2 cores
- RAM: 4 GB
- Storage: 20 GB
- OS: Ubuntu 20.04+, Windows 10+, macOS 11+

**Recommended (Production):**
- CPU: 4+ cores
- RAM: 8+ GB
- Storage: 100+ GB SSD
- OS: Ubuntu 22.04 LTS
- Network: 100 Mbps+

### 3.2 Quick Start Installation

```bash
# Clone repository
git clone https://github.com/teddy800/Messob_Fleet.git
cd Messob_Fleet

# Start services
docker-compose up -d db18 odoo18

# Initialize database
docker-compose exec odoo18 odoo -d fleet_management \
  -i messob_fleet --stop-after-init

# Restart Odoo
docker-compose restart odoo18

# Install frontend dependencies
cd frontend
npm install
npm run dev
```

### 3.3 Production Deployment

**Step 1: Prepare Server**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin
```

**Step 2: Configure Environment**
```bash
# Create production environment file
cp .env.example .env.production

# Edit configuration
nano .env.production
```

**Environment Variables:**
```bash
# Database
POSTGRES_USER=odoo
POSTGRES_PASSWORD=<strong_password>
POSTGRES_DB=fleet_management

# Odoo
ODOO_ADMIN_PASSWORD=<admin_password>
ODOO_DB_HOST=db18
ODOO_DB_PORT=5432

# Frontend
VITE_API_BASE_URL=https://fleet.messob.et
VITE_WS_URL=wss://fleet.messob.et/ws

# Security
JWT_SECRET=<generate_random_secret>
SESSION_SECRET=<generate_random_secret>

# SMS (Optional)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=<your_sid>
TWILIO_AUTH_TOKEN=<your_token>
TWILIO_FROM_NUMBER=+251XXXXXXXXX
```

**Step 3: SSL Configuration**
```bash
# Run SSL setup script
sudo chmod +x deploy/ssl_setup.sh
sudo ./deploy/ssl_setup.sh fleet.messob.et
```

**Step 4: Deploy Application**
```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f odoo18
```

### 3.4 Multi-Server Deployment

For high-availability setup:

**Database Server:**
```bash
# Dedicated PostgreSQL server
docker-compose -f deploy/db-only.yml up -d
```

**Application Servers (Multiple):**
```bash
# Server 1-4
docker-compose -f deploy/app-only.yml up -d
```

**Load Balancer:**
```bash
# Nginx load balancer
sudo cp deploy/config/nginx_load_balancer.conf \
  /etc/nginx/sites-available/fleet
sudo ln -s /etc/nginx/sites-available/fleet \
  /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 4. User Management

### 4.1 Role-Based Access Control

**Role Hierarchy:**
1. **Admin** - Full system access
2. **Dispatcher** - Fleet management
3. **Driver** - Assigned trips only
4. **Mechanic** - Maintenance management
5. **Staff** - Create requests only

### 4.2 Creating Users

**Via Admin Interface:**
1. Navigate to Dashboard → Admin → Users
2. Click "Create User"
3. Fill in details:
   - Full Name
   - Email (used for login)
   - Department
   - Phone number
4. Assign Role
5. Generate temporary password
6. Click "Create"

**Via Odoo Backend:**
1. Access Odoo at `http://localhost:8018`
2. Settings → Users & Companies → Users
3. Create → Set login, password, and groups
4. Assign to group: "MESSOB Fleet Management / [Role]"

**Via Command Line (Bulk Import):**
```python
# users_import.py
import csv
from odoo import api, SUPERUSER_ID

# Connect to database
with api.Environment.manage():
    env = api.Environment(cr, SUPERUSER_ID, {})
    
    # Read CSV
    with open('users.csv', 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Create user
            user = env['res.users'].create({
                'name': row['name'],
                'login': row['email'],
                'email': row['email'],
                'password': row['temp_password'],
            })
            
            # Assign group
            group = env.ref(f'messob_fleet.group_fms_{row["role"]}')
            user.groups_id = [(4, group.id)]
```

### 4.3 Password Policies

**Default Settings:**
- Minimum length: 8 characters
- Must contain: letters, numbers
- Expires: 90 days
- Cannot reuse last 5 passwords

**Configure via System Parameters:**
```python
# Settings → Technical → Parameters → System Parameters
auth_password_policy.minlength = 12
auth_password_policy.pattern = ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])
auth_password_policy.expiration_days = 90
```

### 4.4 Bulk User Operations

**Deactivate Multiple Users:**
```python
# Python console in Odoo
users = env['res.users'].search([('department_id.name', '=', 'Finance')])
users.write({'active': False})
```

**Reset Passwords:**
```bash
# Via command line
docker-compose exec odoo18 odoo shell -d fleet_management

>>> user = env['res.users'].search([('login', '=', 'user@example.com')])
>>> user.password = 'new_temp_password'
```

---

## 5. Fleet Configuration

### 5.1 Vehicle Management

**Adding Vehicles:**
1. Admin → Vehicles → Create
2. Required fields:
   - Plate Number (unique)
   - Model
   - Category (Sedan, SUV, etc.)
   - VIN
   - Acquisition Date
3. Optional:
   - Assign GPS Device
   - Set maintenance schedules
   - Upload documents

**Vehicle Categories:**
```python
# Extend categories if needed
# In models/trip_request.py
vehicle_category = fields.Selection([
    ('sedan', 'Sedan'),
    ('suv', 'SUV'),
    ('pickup', 'Pickup'),
    ('bus', 'Bus'),
    ('minibus', 'Mini-Bus'),
    ('van', 'Van'),  # Add new category
])
```

### 5.2 Driver Management

**Driver Records:**
- Full name
- License number and expiry
- Contact information
- Emergency contact
- Assigned vehicles
- Performance metrics

**Driver Assignment Rules:**
```python
# Configure via System Parameters
driver.max_daily_hours = 10
driver.rest_period_hours = 8
driver.max_consecutive_days = 6
```

### 5.3 Location Management

**Pre-configured Locations:**
- 35+ Ethiopian cities included
- GPS coordinates for each

**Adding Custom Locations:**
```xml
<!-- data/custom_locations.xml -->
<odoo>
  <record id="location_custom_1" model="messob.fms.location">
    <field name="name">Head Office</field>
    <field name="city">Addis Ababa</field>
    <field name="latitude">9.0320</field>
    <field name="longitude">38.7469</field>
  </record>
</odoo>
```

---

## 6. Security Management

### 6.1 Authentication

**JWT Configuration:**
```python
# controllers/jwt_auth.py
JWT_SECRET_KEY = env['JWT_SECRET']  # From environment
JWT_ALGORITHM = 'HS256'
JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
```

**Session Management:**
- Session timeout: 8 hours
- Idle timeout: 30 minutes
- Max concurrent sessions: 3 per user

### 6.2 Access Control

**Model-Level Security:**
```csv
# security/ir.model.access.csv
id,name,model_id:id,group_id:id,perm_read,perm_write,perm_create,perm_unlink
access_trip_user,Trip User,model_messob_fms_trip,group_fms_user,1,1,1,0
access_trip_dispatcher,Trip Dispatcher,model_messob_fms_trip,group_fms_dispatcher,1,1,1,1
```

**Record Rules:**
```xml
<!-- security/record_rules.xml -->
<record id="trip_user_rule" model="ir.rule">
  <field name="name">Users see own trips only</field>
  <field name="model_id" ref="model_messob_fms_trip"/>
  <field name="groups" eval="[(4, ref('group_fms_user'))]"/>
  <field name="domain_force">[('requester_id','=',user.partner_id.id)]</field>
</record>
```

### 6.3 Audit Logging

**Audit Configuration:**
- All critical actions logged automatically
- 7-year retention for critical logs
- Configurable cleanup via cron

**Review Audit Logs:**
```bash
# Admin → Audit Log
# Filter by:
- Date range
- User
- Action type
- Severity
- Resource
```

**Audit Log API:**
```python
# Query logs programmatically
logs = env['messob.fms.audit.log'].search([
    ('action', '=', 'LOGIN_FAILED'),
    ('create_date', '>=', '2024-12-01'),
])
```

### 6.4 Security Best Practices

**Checklist:**
- [ ] Change default admin password
- [ ] Enable HTTPS with valid SSL
- [ ] Configure firewall rules
- [ ] Regular security updates
- [ ] Monitor failed login attempts
- [ ] Review audit logs weekly
- [ ] Backup encryption enabled
- [ ] API keys rotated quarterly
- [ ] User access reviewed monthly

---

## 7. Database Administration

### 7.1 Database Access

**Connect to PostgreSQL:**
```bash
# Via Docker
docker-compose exec db18 psql -U odoo -d fleet_management

# Direct connection
psql -h localhost -p 5432 -U odoo -d fleet_management
```

### 7.2 Common Queries

**User Statistics:**
```sql
SELECT 
  COUNT(*) as total_users,
  SUM(CASE WHEN active THEN 1 ELSE 0 END) as active_users
FROM res_users 
WHERE id > 1;  -- Exclude admin
```

**Trip Summary:**
```sql
SELECT 
  state,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (end_dt - start_dt))/3600) as avg_duration_hours
FROM messob_fms_trip
GROUP BY state;
```

**Vehicle Utilization:**
```sql
SELECT 
  v.license_plate,
  COUNT(t.id) as trips_count,
  SUM(EXTRACT(EPOCH FROM (t.end_dt - t.start_dt))/3600) as total_hours
FROM fleet_vehicle v
LEFT JOIN messob_fms_trip t ON t.assigned_vehicle_id = v.id
WHERE t.create_date >= NOW() - INTERVAL '30 days'
GROUP BY v.id, v.license_plate
ORDER BY trips_count DESC;
```

### 7.3 Performance Optimization

**Index Management:**
```sql
-- Check missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public' AND tablename LIKE 'messob%'
ORDER BY abs(correlation) DESC;

-- Create index if needed
CREATE INDEX idx_trip_start_dt ON messob_fms_trip(start_dt);
CREATE INDEX idx_trip_requester ON messob_fms_trip(requester_id);
```

**Vacuum and Analyze:**
```sql
-- Regular maintenance
VACUUM ANALYZE messob_fms_trip;
VACUUM ANALYZE messob_fms_gps_position;

-- Full vacuum (requires downtime)
VACUUM FULL;
```

### 7.4 Database Backup

**Automated Backup Script:**
```bash
#!/bin/bash
# backup_database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/fleet"
DB_NAME="fleet_management"

# Create backup
docker-compose exec -T db18 pg_dump -U odoo $DB_NAME | \
  gzip > "$BACKUP_DIR/fleet_$DATE.sql.gz"

# Keep only last 30 days
find $BACKUP_DIR -name "fleet_*.sql.gz" -mtime +30 -delete

echo "Backup completed: fleet_$DATE.sql.gz"
```

**Add to Crontab:**
```bash
# Run daily at 2 AM
0 2 * * * /path/to/backup_database.sh
```

---

## 8. Performance Monitoring

### 8.1 System Monitoring

**Docker Stats:**
```bash
# Monitor container resources
docker stats odoo18 db18 redis

# Detailed stats
docker-compose exec odoo18 top
```

**Database Performance:**
```sql
-- Slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### 8.2 Application Monitoring

**API Performance:**
Admin → Analytics → API Performance

Metrics tracked:
- Response times (avg, min, max)
- Request count by endpoint
- Error rates
- Top slow endpoints

**Configure Monitoring:**
```python
# models/api_performance.py
PERFORMANCE_THRESHOLD_MS = 500  # Log if slower
PERFORMANCE_RETENTION_DAYS = 90  # Keep data for
```

### 8.3 Resource Optimization

**Odoo Workers:**
```ini
# odoo.conf
[options]
workers = 4  # 2 × CPU cores + 1
max_cron_threads = 2
limit_memory_hard = 2684354560  # 2.5GB
limit_memory_soft = 2147483648  # 2GB
limit_request = 8192
limit_time_cpu = 60
limit_time_real = 120
```

**Frontend Build Optimization:**
```bash
# Production build
cd frontend
npm run build

# Analyze bundle size
npm run build -- --mode production --report
```

---

## 9. Backup & Recovery

### 9.1 Backup Strategy

**3-2-1 Rule:**
- 3 copies of data
- 2 different media types
- 1 offsite backup

**Backup Schedule:**
- **Daily:** Database + filestore
- **Weekly:** Full system backup
- **Monthly:** Archived to cold storage

### 9.2 Backup Procedures

**Full System Backup:**
```bash
#!/bin/bash
# full_backup.sh

BACKUP_DIR="/backups/full"
DATE=$(date +%Y%m%d_%H%M%S)

# Stop services
docker-compose stop

# Backup Docker volumes
docker run --rm \
  -v mesob_fleet_management_db_data:/source \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/db_data_$DATE.tar.gz -C /source .

docker run --rm \
  -v mesob_fleet_management_odoo_data:/source \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/odoo_data_$DATE.tar.gz -C /source .

# Backup configuration
tar czf $BACKUP_DIR/config_$DATE.tar.gz \
  docker-compose.yml \
  .env \
  deploy/

# Restart services
docker-compose start
```

### 9.3 Recovery Procedures

**Database Restore:**
```bash
# Stop application
docker-compose stop odoo18

# Restore database
gunzip < fleet_20241210.sql.gz | \
  docker-compose exec -T db18 psql -U odoo fleet_management

# Restart
docker-compose start odoo18
```

**Full System Restore:**
```bash
# Extract backups
cd /restore
tar xzf db_data_20241210.tar.gz -C /var/lib/docker/volumes/db_data/_data
tar xzf odoo_data_20241210.tar.gz -C /var/lib/docker/volumes/odoo_data/_data

# Start services
docker-compose up -d
```

### 9.4 Disaster Recovery Plan

**Recovery Time Objective (RTO):** 4 hours  
**Recovery Point Objective (RPO):** 24 hours

**DR Checklist:**
1. [ ] Identify disaster type
2. [ ] Notify stakeholders
3. [ ] Assess data loss
4. [ ] Provision new infrastructure (if needed)
5. [ ] Restore from latest backup
6. [ ] Verify data integrity
7. [ ] Test critical functions
8. [ ] Resume operations
9. [ ] Document incident
10. [ ] Review and improve DR plan

---

## 10. Integration Management

### 10.1 GPS Gateway Integration

**Supported Platforms:**
- Traccar
- OsmAnd
- Custom webhooks

**Configuration:**
```python
# Settings → Technical → System Parameters
messob.gps.provider = 'traccar'
messob.gps.webhook_url = 'https://fleet.messob.et/api/gps/webhook/position'
messob.gps.api_key = '<secure_key>'
```

**Testing Integration:**
```bash
# Test GPS webhook
curl -X POST https://fleet.messob.et/api/gps/webhook/position \
  -H "X-API-Key: your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "GPS001",
    "latitude": 9.0320,
    "longitude": 38.7469,
    "speed": 45.5,
    "timestamp": "2024-12-10T10:30:00Z"
  }'
```

### 10.2 SMS Integration

**Twilio Setup:**
```python
messob.sms.provider = 'twilio'
messob.sms.twilio_account_sid = 'ACxxxx'
messob.sms.twilio_auth_token = 'xxxx'
messob.sms.twilio_from_number = '+251912345678'
```

**AWS SNS Setup:**
```python
messob.sms.provider = 'aws_sns'
messob.sms.aws_access_key_id = 'AKIAxxxx'
messob.sms.aws_secret_access_key = 'xxxx'
messob.sms.aws_region = 'us-east-1'
```

### 10.3 Email Configuration

**SMTP Settings:**
```python
# Settings → Technical → Outgoing Mail Servers
smtp_host = 'smtp.gmail.com'
smtp_port = 587
smtp_user = 'fleet@messob.et'
smtp_pass = '<app_password>'
smtp_encryption = 'starttls'
```

**Test Email:**
```python
# Python shell
env['mail.mail'].create({
    'email_to': 'test@example.com',
    'subject': 'Test Email',
    'body_html': '<p>This is a test</p>',
}).send()
```

---

## 11. Troubleshooting

### 11.1 Common Issues

**Issue: Odoo Won't Start**
```bash
# Check logs
docker-compose logs odoo18

# Common causes:
# 1. Database not ready
docker-compose ps db18

# 2. Port conflict
sudo lsof -i :8018

# 3. Permission issues
sudo chown -R 101:101 /var/lib/docker/volumes/odoo_data
```

**Issue: Database Connection Error**
```bash
# Test connection
docker-compose exec odoo18 pg_isready -h db18 -U odoo

# Reset connection
docker-compose restart db18 odoo18
```

**Issue: GPS Tracking Not Updating**
```sql
-- Check recent positions
SELECT * FROM messob_fms_gps_position
ORDER BY timestamp DESC
LIMIT 10;

-- Check device status
SELECT * FROM messob_fms_gps_device
WHERE connection_status != 'online';
```

### 11.2 Log Analysis

**Odoo Logs:**
```bash
# View logs
docker-compose logs -f --tail=100 odoo18

# Search for errors
docker-compose logs odoo18 | grep ERROR

# Filter by date
docker-compose logs --since 2024-12-10 odoo18
```

**PostgreSQL Logs:**
```bash
# Location in container
docker-compose exec db18 cat /var/log/postgresql/postgresql-*.log
```

### 11.3 Performance Issues

**Slow Queries:**
```sql
-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- 1 second
SELECT pg_reload_conf();

-- View slow queries
SELECT * FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC;
```

**High Memory Usage:**
```bash
# Check memory
free -h
docker stats odoo18

# Restart to clear cache
docker-compose restart odoo18
```

---

## 12. Maintenance Procedures

### 12.1 Scheduled Maintenance

**Weekly Tasks:**
- Review audit logs
- Check disk space
- Monitor error rates
- Review slow queries
- Verify backups

**Monthly Tasks:**
- Update system packages
- Rotate SSL certificates
- Review user accounts
- Clean old logs
- Performance analysis

**Quarterly Tasks:**
- Security audit
- Disaster recovery test
- Capacity planning review
- Documentation updates

### 12.2 Update Procedures

**Minor Updates:**
```bash
# Pull latest code
git pull origin main

# Update dependencies
cd frontend && npm install

# Restart services
docker-compose restart
```

**Major Updates:**
```bash
# Backup first
./scripts/backup.sh

# Update containers
docker-compose pull
docker-compose up -d

# Run migrations
docker-compose exec odoo18 odoo -d fleet_management -u messob_fleet
```

### 12.3 Maintenance Mode

**Enable Maintenance:**
```bash
# Create maintenance page
cat > /var/www/html/maintenance.html << EOF
<html>
<head><title>Under Maintenance</title></head>
<body>
<h1>System Maintenance</h1>
<p>MESSOB Fleet Management is currently undergoing scheduled maintenance.</p>
<p>Expected completion: [TIME]</p>
</body>
</html>
EOF

# Redirect all traffic
sudo nano /etc/nginx/sites-available/fleet
# Add: return 503;

sudo nginx -t && sudo systemctl reload nginx
```

**Disable Maintenance:**
```bash
# Remove redirect
sudo nano /etc/nginx/sites-available/fleet
# Remove: return 503;

sudo nginx -t && sudo systemctl reload nginx
```

---

## Appendix A: System Parameters Reference

| Parameter | Default | Description |
|-----------|---------|-------------|
| `messob.gps.update_interval` | 10 | GPS update interval (seconds) |
| `messob.fuel.efficiency_threshold` | 8.0 | Low efficiency alert (km/L) |
| `messob.maintenance.alert_days` | 30 | Days before maintenance due |
| `messob.trip.approval_timeout` | 24 | Hours before request expires |
| `messob.audit.retention_days` | 2555 | Audit log retention (7 years) |

## Appendix B: API Endpoints

Full API documentation: `/docs/API_DOCS.md`

**Key Endpoints:**
- `POST /api/auth/jwt/login` - Authentication
- `GET /api/trips` - List trips
- `POST /api/trips` - Create trip
- `PUT /api/trips/{id}/approve` - Approve trip
- `GET /api/gps/vehicles/{id}/position` - Get GPS position
- `POST /api/gps/webhook/position` - GPS webhook

## Appendix C: Troubleshooting Checklist

**System Won't Start:**
1. [ ] Check Docker service status
2. [ ] Verify database is running
3. [ ] Check port availability
4. [ ] Review error logs
5. [ ] Verify disk space

**Performance Issues:**
1. [ ] Check CPU/memory usage
2. [ ] Analyze slow queries
3. [ ] Review worker configuration
4. [ ] Check network latency
5. [ ] Optimize database indexes

**GPS Not Working:**
1. [ ] Verify GPS device online
2. [ ] Check webhook configuration
3. [ ] Test API connectivity
4. [ ] Review GPS logs
5. [ ] Validate coordinates

---

## Support & Resources

**Technical Support:**
- Email: admin@messob.et
- Phone: +251 11 123 4567 (24/7 for critical)
- Mobile: +251 91 234 5678
- Slack: #fleet-support
- Location: MESSOB Technology Solutions, Addis Ababa, Ethiopia

**Documentation:**
- API Docs: `/docs/API_DOCS.md`
- Deployment: `/docs/DEPLOYMENT.md`
- Security: `/docs/SECURITY.md`

**Community:**
- GitHub: https://github.com/teddy800/Messob_Fleet
- Issues: https://github.com/teddy800/Messob_Fleet/issues

---

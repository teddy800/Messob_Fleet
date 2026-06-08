# MESSOB Fleet Management System
## Troubleshooting Guide

**Version:** 1.1.0  
**Last Updated:** June 2026  
**For:** System Administrators and Technical Support

---

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Authentication Issues](#authentication-issues)
3. [Frontend Problems](#frontend-problems)
4. [Backend/API Issues](#backendapi-issues)
5. [Database Problems](#database-problems)
6. [GPS Tracking Issues](#gps-tracking-issues)
7. [Performance Problems](#performance-problems)
8. [Common Error Messages](#common-error-messages)
9. [Maintenance Tasks](#maintenance-tasks)
10. [Getting Help](#getting-help)

---

## 1. Quick Diagnostics

### System Health Check

Run this quick check to identify common issues:

```bash
#!/bin/bash
# System Health Check Script

echo "=== MESSOB Fleet System Health Check ==="
echo

# Check if services are running
echo "1. Service Status:"
systemctl is-active odoo && echo "✅ Odoo: Running" || echo "❌ Odoo: Stopped"
systemctl is-active postgresql && echo "✅ PostgreSQL: Running" || echo "❌ PostgreSQL: Stopped"
systemctl is-active nginx && echo "✅ Nginx: Running" || echo "❌ Nginx: Stopped"
echo

# Check disk space
echo "2. Disk Space:"
df -h | grep -E 'Filesystem|/$'
echo

# Check memory usage
echo "3. Memory Usage:"
free -h
echo

# Check CPU load
echo "4. CPU Load:"
uptime
echo

# Check database connections
echo "5. Database Connections:"
sudo -u postgres psql -d messob_fleet -c "SELECT count(*) as connections FROM pg_stat_activity;"
echo

# Check recent errors in logs
echo "6. Recent Errors (last 10):"
sudo tail -20 /var/log/odoo/odoo.log | grep ERROR | tail -10
echo

# Check if frontend is accessible
echo "7. Frontend Accessibility:"
curl -s -o /dev/null -w "%{http_code}" http://localhost | grep 200 && echo "✅ Frontend: Accessible" || echo "❌ Frontend: Not accessible"
echo

# Check if API is responding
echo "8. API Health:"
curl -s -o /dev/null -w "%{http_code}" http://localhost:8069/web/health | grep 200 && echo "✅ API: Healthy" || echo "❌ API: Unhealthy"

echo
echo "=== Health Check Complete ==="
```

---

## 2. Authentication Issues

### Problem: Cannot Login

**Symptoms:**
- "Invalid credentials" error
- Login button does nothing
- Redirected back to login page

**Solutions:**

**1. Verify credentials:**
```bash
# Check if user exists in database
sudo -u postgres psql messob_fleet -c "SELECT id, email, active FROM res_users WHERE email='user@messob.et';"
```

**2. Check if account is locked:**
```python
# In Odoo shell
user = env['res.users'].search([('email', '=', 'user@messob.et')])
print(f"Active: {user.active}")
print(f"Login date: {user.login_date}")
```

**3. Reset password (as admin):**
```bash
# Using Odoo shell
odoo shell -d messob_fleet -c /etc/odoo/odoo.conf

# In shell:
user = env['res.users'].search([('email', '=', 'user@messob.et')])
user.write({'password': 'NewSecurePassword123!'})
env.cr.commit()
```

**4. Check browser console for errors:**
- Open Developer Tools (F12)
- Look for error messages in Console tab
- Check Network tab for failed API calls

### Problem: "Token Expired" Error

**Cause:** JWT token has expired

**Solution:**
```javascript
// User should log out and log in again
// Or frontend should automatically refresh token

// Check token expiration
const token = localStorage.getItem('token');
const decoded = jwtDecode(token);
console.log('Token expires:', new Date(decoded.exp * 1000));
```

### Problem: Login Slow or Times Out

**Check:**
```bash
# Check Odoo logs
tail -f /var/log/odoo/odoo.log | grep "login"

# Check database query performance
sudo -u postgres psql messob_fleet -c "
SELECT query, calls, mean_exec_time 
FROM pg_stat_statements 
WHERE query LIKE '%res_users%' 
ORDER BY mean_exec_time DESC 
LIMIT 5;"
```

---

## 3. Frontend Problems

### Problem: White Screen / Blank Page

**Causes:**
- JavaScript error
- Build issue
- Missing files

**Solutions:**

**1. Check browser console:**
```
F12 → Console tab
Look for error messages
```

**2. Check if build files exist:**
```bash
ls -la /var/www/messob-fleet/dist/
# Should see index.html, assets folder, etc.
```

**3. Rebuild frontend:**
```bash
cd /opt/messob-fleet/frontend
npm install
npm run build
sudo cp -r dist/* /var/www/messob-fleet/dist/
```

**4. Check Nginx configuration:**
```bash
sudo nginx -t
# If errors, fix and reload:
sudo systemctl reload nginx
```

### Problem: Page Loads But Shows Errors

**Common errors:**

**"Failed to fetch":**
- API is not running or unreachable
- CORS issue
- Network problem

**Check:**
```bash
# Is Odoo running?
systemctl status odoo

# Can frontend reach API?
curl http://localhost:8069/api/auth/test

# Check Nginx proxy configuration
sudo nano /etc/nginx/sites-available/messob-fleet
# Verify proxy_pass is correct
```

**"Cannot read property of undefined":**
- Data structure mismatch
- API returned unexpected format

**Fix:**
```javascript
// Add defensive checks in code
const tripData = response?.data?.trips || [];

// Check API response in Network tab (F12)
```

### Problem: Styles Not Loading / Looks Broken

**Cause:** CSS files not loaded

**Check:**
```bash
# View browser Network tab (F12)
# Look for 404 errors on CSS files

# Check file paths in dist/index.html
cat /var/www/messob-fleet/dist/index.html | grep "css"
```

**Fix:**
```bash
# Rebuild with correct base path
cd frontend
# Edit vite.config.js
# Set base: '/' or base: '/fleet/'
npm run build
```

---

## 4. Backend/API Issues

### Problem: API Not Responding (502 Bad Gateway)

**Cause:** Odoo service is down

**Fix:**
```bash
# Check Odoo status
sudo systemctl status odoo

# If stopped, start it
sudo systemctl start odoo

# Check logs for why it stopped
sudo journalctl -u odoo -n 50

# Common causes:
# - Configuration error
# - Database connection failed
# - Port already in use
# - Out of memory
```

### Problem: API Returns 500 Internal Server Error

**Check logs:**
```bash
# Odoo application log
sudo tail -50 /var/log/odoo/odoo.log

# Look for Python traceback
sudo grep -A 20 "Traceback" /var/log/odoo/odoo.log | tail -30
```

**Common causes:**
- Database query error
- Missing module dependency
- Code error (exception not caught)
- Database connection issue

### Problem: Slow API Responses

**Diagnose:**
```bash
# Check response time
time curl http://localhost:8069/api/requests

# Check Odoo processes
top -u odoo

# Check database queries
sudo -u postgres psql messob_fleet -c "
SELECT pid, now() - query_start as duration, query 
FROM pg_stat_activity 
WHERE state = 'active' 
ORDER BY duration DESC;"
```

**Solutions:**
1. **Add database indexes** (see Database section)
2. **Increase Odoo workers** (edit odoo.conf)
3. **Enable caching**
4. **Optimize queries**

### Problem: GPS Data Not Saving

**Check webhook endpoint:**
```bash
# Test manually
curl -X POST http://your-domain.com/api/gps/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "TEST123",
    "latitude": 9.03,
    "longitude": 38.74,
    "speed": 45.5,
    "timestamp": "2026-06-08T14:30:00Z"
  }'

# Check logs
sudo tail -f /var/log/odoo/odoo.log | grep gps
```

**Common issues:**
- Webhook URL incorrect on GPS device
- Authentication failure
- Data format mismatch
- Database insert error

---

## 5. Database Problems

### Problem: Cannot Connect to Database

**Error:** `FATAL: password authentication failed for user "messob_user"`

**Fix:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Verify credentials in odoo.conf
sudo nano /etc/odoo/odoo.conf
# Check db_user and db_password

# Test connection manually
psql -U messob_user -d messob_fleet -h localhost
```

### Problem: Database is Slow

**Check slow queries:**
```sql
-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries >1 second
SELECT pg_reload_conf();

-- View slow queries
SELECT query, calls, total_exec_time, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Optimize:**
```sql
-- Vacuum database
VACUUM ANALYZE;

-- Rebuild indexes
REINDEX DATABASE messob_fleet;

-- Add missing indexes
CREATE INDEX idx_trip_requests_status ON trip_requests(status);
CREATE INDEX idx_gps_positions_vehicle_time ON gps_positions(vehicle_id, timestamp DESC);
```

### Problem: Database is Full

```bash
# Check database size
sudo -u postgres psql -c "
SELECT pg_database.datname,
       pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
ORDER BY pg_database_size(pg_database.datname) DESC;"

# Check table sizes
sudo -u postgres psql messob_fleet -c "
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;"
```

**Clean up:**
```sql
-- Delete old GPS positions (keep last 90 days)
DELETE FROM gps_positions WHERE timestamp < NOW() - INTERVAL '90 days';

-- Vacuum to reclaim space
VACUUM FULL gps_positions;
```

---

## 6. GPS Tracking Issues

### Problem: Vehicle Not Showing on Map

**Checklist:**
1. ✅ Vehicle has GPS device assigned?
2. ✅ GPS device is powered on?
3. ✅ GPS device has cellular/network connection?
4. ✅ Device is sending data to correct webhook URL?
5. ✅ Recent GPS positions in database?

**Check:**
```sql
-- Check latest GPS position for vehicle
SELECT * FROM gps_positions 
WHERE vehicle_id = 123 
ORDER BY timestamp DESC 
LIMIT 1;

-- If NULL or old, device is not sending data
```

**Verify webhook is receiving data:**
```bash
# Check Odoo logs for webhook calls
sudo tail -f /var/log/odoo/odoo.log | grep webhook

# Check if firewall is blocking
sudo ufw status
# Port 8069 (or 80/443) should be allowed
```

### Problem: GPS Position Not Updating

**Cause:** WebSocket connection lost

**Check:**
```javascript
// In browser console (F12)
// Look for WebSocket connection in Network tab → WS

// Check WebSocket status
console.log('WebSocket state:', websocket.readyState);
// 0 = CONNECTING, 1 = OPEN, 2 = CLOSING, 3 = CLOSED
```

**Fix:**
```javascript
// Reconnect WebSocket
websocket.close();
websocket = new WebSocket('wss://your-domain.com/websocket');
```

### Problem: GPS Shows Wrong Location

**Causes:**
- Device GPS not locked (weak signal)
- Coordinates swapped (lat/lng reversed)
- Wrong coordinate format

**Verify data:**
```sql
SELECT latitude, longitude, speed, timestamp 
FROM gps_positions 
WHERE vehicle_id = 123 
ORDER BY timestamp DESC 
LIMIT 5;

-- Lat should be -90 to 90
-- Lng should be -180 to 180
-- If outside range, coordinates are invalid
```

---

## 7. Performance Problems

### Problem: System is Slow

**Quick Fixes:**

**1. Restart Services:**
```bash
sudo systemctl restart odoo
sudo systemctl restart postgresql
sudo systemctl restart nginx
```

**2. Check Resources:**
```bash
# CPU usage
top

# Memory usage
free -h

# Disk I/O
iostat -x 1 5

# If high, may need to:
# - Add more RAM
# - Use faster storage (SSD)
# - Add more CPU cores
```

**3. Clear Old Data:**
```sql
-- Delete completed trips older than 2 years
DELETE FROM trip_requests 
WHERE status = 'completed' 
AND end_date < NOW() - INTERVAL '2 years';

-- Vacuum to reclaim space
VACUUM ANALYZE trip_requests;
```

### Problem: High Database Load

**Check:**
```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Long-running queries
SELECT pid, now() - query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;

-- Kill a stuck query (if needed)
SELECT pg_terminate_backend(12345); -- Replace with actual PID
```

**Tune PostgreSQL:**
```bash
sudo nano /etc/postgresql/14/main/postgresql.conf

# Increase these values based on available RAM
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 64MB

sudo systemctl restart postgresql
```

---

## 8. Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| **"Network Error"** | API unreachable | Check Odoo status, check network |
| **"401 Unauthorized"** | Invalid or expired token | Log out and log in again |
| **"403 Forbidden"** | Insufficient permissions | Check user role |
| **"404 Not Found"** | Resource doesn't exist | Verify ID, check database |
| **"500 Internal Server Error"** | Server-side error | Check Odoo logs |
| **"502 Bad Gateway"** | Odoo is down | Start Odoo service |
| **"503 Service Unavailable"** | Server overloaded | Check resources, restart services |
| **"Database connection failed"** | PostgreSQL issue | Check PostgreSQL status |
| **"Permission denied"** | File permissions wrong | Check ownership: `chown odoo:odoo` |

---

## 9. Maintenance Tasks

### Daily Maintenance

```bash
# Check for errors
sudo tail -100 /var/log/odoo/odoo.log | grep ERROR

# Check disk space
df -h

# Check backup status
ls -lh /backup/postgres/ | tail -5
```

### Weekly Maintenance

```bash
# Vacuum database
sudo -u postgres vacuumdb -d messob_fleet -z -v

# Analyze query performance
sudo -u postgres psql messob_fleet -c "
SELECT schemaname, tablename, n_live_tup, n_dead_tup
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;"

# Update system packages
sudo apt update && sudo apt upgrade -y
```

### Monthly Maintenance

```bash
# Reindex database
sudo -u postgres reindexdb -d messob_fleet

# Clean old logs (keep 90 days)
find /var/log/odoo/ -name "*.log" -mtime +90 -delete

# Review audit logs for suspicious activity
sudo tail -1000 /var/log/odoo/audit.log | grep "failed\|error" | wc -l
```

---

## 10. Getting Help

### Before Requesting Support

**Gather this information:**

1. **Error message** (exact text)
2. **Steps to reproduce**
3. **When did it start?**
4. **Has anything changed recently?**
5. **Relevant log entries**

### Log Files to Check

```bash
# Odoo application log
/var/log/odoo/odoo.log

# Nginx access log
/var/log/nginx/access.log

# Nginx error log
/var/log/nginx/error.log

# PostgreSQL log
/var/log/postgresql/postgresql-14-main.log

# System log
/var/log/syslog
```

### How to Collect Logs

```bash
# Create support bundle
tar -czf support-bundle-$(date +%Y%m%d).tar.gz \
    /var/log/odoo/odoo.log \
    /var/log/nginx/error.log \
    /etc/odoo/odoo.conf \
    /etc/nginx/sites-available/messob-fleet

# Send to support team
```

### Contact Information

**Technical Support:**
- Email: support@messob.et
- Phone: +251 11 XXX XXXX
- Hours: Monday-Friday, 9:00-17:00 EAT

**Emergency (24/7):**
- Phone: +251 91 XXX YYYY
- For: System down, security incidents

**Documentation:**
- User Manuals: https://docs.messob.et/manuals/
- API Docs: https://docs.messob.et/api/
- FAQ: https://docs.messob.et/faq/

---

## Appendix

### Useful Commands

```bash
# Check service status
systemctl status odoo postgresql nginx

# View real-time logs
tail -f /var/log/odoo/odoo.log

# Check process memory usage
ps aux | grep odoo

# Check open files
lsof -p $(pgrep -f odoo)

# Test database connection
psql -U messob_user -d messob_fleet -h localhost -c "SELECT version();"

# Check listening ports
netstat -tlnp | grep -E '8069|5432|80|443'

# Disk usage by directory
du -sh /var/lib/odoo/* | sort -h
```

### Quick Reference: Service Management

```bash
# Start service
sudo systemctl start odoo

# Stop service
sudo systemctl stop odoo

# Restart service
sudo systemctl restart odoo

# Reload configuration
sudo systemctl reload odoo

# Enable at boot
sudo systemctl enable odoo

# Disable at boot
sudo systemctl disable odoo

# View service logs
sudo journalctl -u odoo -f
```

---

**Document Version:** 1.1.0  
**Last Reviewed:** June 2026  
**Next Review:** September 2026  

**When in doubt, check the logs first!**

© 2026 MESSOB Center. All rights reserved.

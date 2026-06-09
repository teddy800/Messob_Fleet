# MESSOB Fleet Management System
## Security Best Practices

**Version:** 1.1.0  
**Last Updated:** June 2026  
**For:** System Administrators and Security Team

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication Security](#authentication-security)
3. [Authorization & Access Control](#authorization--access-control)
4. [Data Protection](#data-protection)
5. [Network Security](#network-security)
6. [Application Security](#application-security)
7. [Database Security](#database-security)
8. [Audit & Compliance](#audit--compliance)
9. [Incident Response](#incident-response)
10. [Security Checklist](#security-checklist)

---

## 1. Overview

This document outlines security best practices for deploying and maintaining the MESSOB Fleet Management System. Security is implemented through multiple layers of defense.

### Security Principles

1. **Least Privilege:** Users have minimum necessary permissions
2. **Defense in Depth:** Multiple layers of security controls
3. **Fail Secure:** Systems fail to a secure state
4. **Separation of Duties:** Critical operations require multiple approvals
5. **Auditability:** All actions are logged and traceable

---

## 2. Authentication Security

### Password Policy

**Enforce strong passwords:**
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- No dictionary words
- No personal information
- Password history (last 5 passwords cannot be reused)

**Implementation:**
```python
# In Odoo user model
def _check_password_strength(self, password):
    if len(password) < 12:
        raise ValidationError("Password must be at least 12 characters")
    if not re.search(r'[A-Z]', password):
        raise ValidationError("Password must contain uppercase letter")
    if not re.search(r'[a-z]', password):
        raise ValidationError("Password must contain lowercase letter")
    if not re.search(r'[0-9]', password):
        raise ValidationError("Password must contain number")
    if not re.search(r'[!@#$%^&*]', password):
        raise ValidationError("Password must contain special character")
```

### Multi-Factor Authentication (MFA)

**Enable for sensitive roles:**
- All Admin users (mandatory)
- Dispatcher users (recommended)
- Access to production systems (mandatory)

**MFA Methods:**
1. TOTP (Time-based One-Time Password) - Google Authenticator, Authy
2. SMS verification (backup method)
3. Email verification (backup method)

### JWT Token Security

**Token Configuration:**
```javascript
// Token expiration
ACCESS_TOKEN_LIFETIME = 1 hour
REFRESH_TOKEN_LIFETIME = 7 days

// Token storage
// Store in httpOnly cookies (not localStorage for production)
document.cookie = `token=${jwt}; Secure; HttpOnly; SameSite=Strict`;
```

**Token Rotation:**
- Refresh access tokens before expiration
- Invalidate refresh tokens after use
- Blacklist compromised tokens

### Session Management

**Security Measures:**
- Automatic logout after 30 minutes of inactivity
- Force logout on password change
- Single session per user (optional - configurable)
- Terminate all sessions on security incident

---

## 3. Authorization & Access Control

### Role-Based Access Control (RBAC)

**Principle of Least Privilege:**

| Role | Access Level |
|------|--------------|
| **Staff** | Read own data, Create trip requests |
| **Dispatcher** | Read all trips, Assign vehicles/drivers |
| **Driver** | Read assigned trips, Update trip status |
| **Maintainer** | Read maintenance data, Update vehicle status |
| **Admin** | Full system access |

### Permission Matrix

| Action | Staff | Dispatcher | Driver | Maintainer | Admin |
|--------|-------|------------|--------|------------|-------|
| View All Trips | ❌ | ✅ | ❌ | ❌ | ✅ |
| Create Trip Request | ✅ | ✅ | ❌ | ❌ | ✅ |
| Approve Trip | ❌ | ✅ | ❌ | ❌ | ✅ |
| Assign Vehicle | ❌ | ✅ | ❌ | ❌ | ✅ |
| View GPS Data | Own | All | Own | ❌ | All |
| Manage Users | ❌ | ❌ | ❌ | ❌ | ✅ |
| View Audit Logs | ❌ | ❌ | ❌ | ❌ | ✅ |

### API Endpoint Protection

**Every endpoint must:**
1. Verify JWT token
2. Check user role
3. Validate resource ownership
4. Rate limit requests

**Example:**
```python
@http.route('/api/requests/<int:request_id>', auth='public', methods=['GET'])
@require_jwt_token
@require_role(['Staff', 'Dispatcher', 'Admin'])
def get_request(self, request_id):
    # Additional check: Staff can only see own requests
    if request.env.user.role == 'Staff':
        if request_record.requester_id != request.env.user.id:
            return {'error': 'Unauthorized'}, 403
    return request_record.to_json()
```

---

## 4. Data Protection

### Encryption at Rest

**Database Encryption:**
```bash
# Enable PostgreSQL Transparent Data Encryption (TDE)
# Or encrypt at filesystem level
sudo cryptsetup luksFormat /dev/sdb
sudo cryptsetup luksOpen /dev/sdb postgres_encrypted
```

**Sensitive Fields:**
- Passwords: bcrypt (cost=12)
- Personal data: AES-256 encryption
- API keys: Encrypted in database

### Encryption in Transit

**HTTPS/TLS:**
- TLS 1.2 minimum (TLS 1.3 recommended)
- Strong cipher suites only
- Perfect Forward Secrecy (PFS)
- HSTS (HTTP Strict Transport Security)

**Nginx Configuration:**
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
ssl_prefer_server_ciphers on;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### Data Minimization

**Collect only necessary data:**
- Don't store credit card numbers (use payment gateway)
- Delete old GPS positions (keep 90 days)
- Anonymize user data after account deletion

**Data Retention Policy:**
| Data Type | Retention Period |
|-----------|------------------|
| Active user data | While account active |
| Deleted user data | 30 days (recovery period) |
| Trip history | 7 years (compliance) |
| GPS positions | 90 days |
| Audit logs | 3 years |
| Backup data | 90 days |

---

## 5. Network Security

### Firewall Rules

**Allow only necessary ports:**
```bash
# UFW firewall rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp     # SSH (restrict to specific IPs in production)
sudo ufw allow 80/tcp     # HTTP (will redirect to HTTPS)
sudo ufw allow 443/tcp    # HTTPS
sudo ufw enable
```

**Production: Restrict SSH access**
```bash
# Allow SSH only from admin IPs
sudo ufw delete allow 22/tcp
sudo ufw allow from 203.0.113.0/24 to any port 22 proto tcp
```

### DDoS Protection

**Rate Limiting (Nginx):**
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

location /api {
    limit_req zone=api burst=20 nodelay;
    # ... rest of config
}

location /api/auth/login {
    limit_req zone=login burst=3 nodelay;
    # ... rest of config
}
```

**Cloudflare / AWS WAF:**
- Enable DDoS protection
- Configure bot detection
- Implement rate limiting

### VPN Access

**For administrative access:**
- Require VPN for production server access
- Use WireGuard or OpenVPN
- Two-factor authentication for VPN

---

## 6. Application Security

### Input Validation

**Validate all user inputs:**
```python
# Example: Trip request validation
def validate_trip_request(data):
    # Validate dates
    if data['start_date'] < datetime.now():
        raise ValidationError("Start date must be in the future")
    
    # Validate passenger count
    if not (1 <= data['passengers'] <= 50):
        raise ValidationError("Passenger count must be 1-50")
    
    # Sanitize strings
    data['purpose'] = bleach.clean(data['purpose'])
    
    # Validate coordinates
    if not (-90 <= data['lat'] <= 90):
        raise ValidationError("Invalid latitude")
```

### SQL Injection Prevention

**Use ORM (Odoo ORM):**
```python
# ✅ Good - uses ORM
requests = self.env['trip.request'].search([
    ('requester_id', '=', user.id),
    ('status', '=', 'pending')
])

# ❌ Bad - raw SQL vulnerable to injection
self.env.cr.execute(f"SELECT * FROM trip_request WHERE requester_id = {user_id}")
```

### XSS Prevention

**React handles most XSS automatically, but:**
```javascript
// ✅ Safe - React escapes by default
<p>{userInput}</p>

// ⚠️ Dangerous - using dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{__html: userInput}} /> // NEVER use with user input

// ✅ If you must use HTML, sanitize first
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(userInput)}} />
```

### CSRF Protection

**Token-based protection:**
```python
# Include CSRF token in forms
@http.route('/api/requests', methods=['POST'], csrf=True)
def create_request(self):
    # Odoo automatically validates CSRF token
    pass
```

### Security Headers

**Nginx configuration:**
```nginx
# Prevent clickjacking
add_header X-Frame-Options "SAMEORIGIN" always;

# Prevent MIME sniffing
add_header X-Content-Type-Options "nosniff" always;

# XSS Protection (for older browsers)
add_header X-XSS-Protection "1; mode=block" always;

# Content Security Policy
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;

# Referrer Policy
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

---

## 7. Database Security

### PostgreSQL Hardening

**Configuration (`postgresql.conf`):**
```ini
# Require SSL connections
ssl = on
ssl_cert_file = '/etc/ssl/certs/server.crt'
ssl_key_file = '/etc/ssl/private/server.key'

# Listen only on localhost (if app on same server)
listen_addresses = 'localhost'

# Or specific IP if app on different server
listen_addresses = '10.0.1.5'
```

**Authentication (`pg_hba.conf`):**
```
# Require password authentication
host    messob_fleet    messob_user    localhost    scram-sha-256

# Deny access from other IPs
host    all             all            0.0.0.0/0    reject
```

### Database User Permissions

**Principle of Least Privilege:**
```sql
-- Application user should NOT have superuser
CREATE USER messob_user WITH PASSWORD 'strong_password';

-- Grant only necessary privileges
GRANT CONNECT ON DATABASE messob_fleet TO messob_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO messob_user;

-- Do NOT grant:
-- - DROP TABLE
-- - CREATE DATABASE
-- - SUPERUSER
```

### Backup Security

**Encrypt backups:**
```bash
# Encrypt database backup
pg_dump messob_fleet | gpg --encrypt --recipient admin@messob.et > backup_encrypted.sql.gpg

# Decrypt for restore
gpg --decrypt backup_encrypted.sql.gpg | psql messob_fleet
```

**Secure backup storage:**
- Store offsite (cloud storage with encryption)
- Access controls (only backup admin can access)
- Regular integrity checks

---

## 8. Audit & Compliance

### Audit Logging

**Log security-relevant events:**
- User authentication (login, logout, failed attempts)
- Authorization failures (access denied events)
- Data modifications (CRUD operations on sensitive data)
- Configuration changes
- Administrative actions

**What to log:**
```python
{
    "timestamp": "2026-06-08T14:30:00Z",
    "event_type": "trip_approval",
    "user_id": 123,
    "user_email": "dispatcher@messob.et",
    "ip_address": "203.0.113.45",
    "action": "approved",
    "resource_type": "trip_request",
    "resource_id": 456,
    "changes": {
        "status": {"old": "pending", "new": "approved"},
        "vehicle_id": {"old": null, "new": 789}
    },
    "result": "success"
}
```

### Log Protection

**Ensure logs cannot be tampered:**
- Write logs to separate server (syslog)
- Use append-only log files
- Regular log backups
- Restrict log file access (chmod 600)

### Compliance

**GDPR Compliance (if applicable):**
- Right to access: Users can export their data
- Right to erasure: Users can delete their account
- Data portability: Provide data in machine-readable format
- Privacy by design: Implement data minimization

---

## 9. Incident Response

### Incident Response Plan

**Phases:**

1. **Preparation:**
   - Incident response team identified
   - Contact information documented
   - Response procedures documented

2. **Detection:**
   - Monitor logs for suspicious activity
   - Automated alerts for security events
   - User reports

3. **Containment:**
   - Isolate affected systems
   - Block malicious IPs
   - Disable compromised accounts

4. **Eradication:**
   - Remove malware/backdoors
   - Patch vulnerabilities
   - Change all credentials

5. **Recovery:**
   - Restore from clean backups
   - Verify system integrity
   - Monitor for reinfection

6. **Lessons Learned:**
   - Document incident
   - Update procedures
   - Implement additional controls

### Security Incident Examples

**Suspected Account Compromise:**
```bash
# Immediately lock account
sudo -u postgres psql messob_fleet -c "UPDATE res_users SET active=false WHERE email='compromised@example.com';"

# Check audit logs for malicious activity
grep "compromised@example.com" /var/log/odoo/audit.log

# Force password reset
# Investigate access logs
# Check for data exfiltration
```

**DDoS Attack:**
```bash
# Enable aggressive rate limiting
# Block attacking IPs at firewall level
sudo ufw deny from 203.0.113.0/24

# Enable Cloudflare "Under Attack" mode
# Monitor and document attack
```

---

## 10. Security Checklist

### Pre-Deployment

- [ ] Strong passwords enforced
- [ ] MFA enabled for admins
- [ ] SSL/TLS configured (A+ rating on SSL Labs)
- [ ] Security headers configured
- [ ] Firewall rules configured
- [ ] Database encrypted
- [ ] Backups encrypted
- [ ] Audit logging enabled
- [ ] Rate limiting configured
- [ ] Default credentials changed
- [ ] Unnecessary services disabled

### Regular Maintenance

**Daily:**
- [ ] Monitor failed login attempts
- [ ] Check for unusual activity in logs
- [ ] Verify backups completed

**Weekly:**
- [ ] Review audit logs
- [ ] Update system packages
- [ ] Check for security advisories

**Monthly:**
- [ ] Review user access (disable inactive accounts)
- [ ] Test incident response procedures
- [ ] Vulnerability scan
- [ ] Review firewall rules

**Quarterly:**
- [ ] Penetration testing
- [ ] Security training for staff
- [ ] Review and update security policies
- [ ] Test backup restoration

---

## Appendix

### Security Tools

**Vulnerability Scanning:**
- OpenVAS
- Nessus
- Qualys

**Web Application Firewall:**
- ModSecurity
- Cloudflare WAF
- AWS WAF

**Log Analysis:**
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Splunk
- Graylog

### Security Resources

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- CWE Top 25: https://cwe.mitre.org/top25/
- NIST Cybersecurity Framework: https://www.nist.gov/cyberframework

### Contact Information

**Security Team:**
- Email: security@messob.et
- Emergency: +251 91 XXX YYYY (24/7)

**Report Security Vulnerability:**
- Email: security-report@messob.et
- PGP Key: [Public key fingerprint]

---

**Document Version:** 1.1.0  
**Last Reviewed:** June 2026  
**Next Review:** September 2026 (Quarterly)  

**Security is everyone's responsibility.**

© 2026 MESSOB Center. All rights reserved.

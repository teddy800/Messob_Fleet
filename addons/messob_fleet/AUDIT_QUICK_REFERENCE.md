# Audit Logging - Quick Reference Guide

## 🚀 Quick Start

### Add Audit Logging to Any Model

```python
class MyModel(models.Model):
    _name = 'my.model'
    _inherit = ['base.model.audit.mixin']  # ← Add this line
    
    # Your fields here...
```

**That's it!** All create, update, and delete operations are now automatically logged.

---

## 📝 Manual Logging Examples

### Log a Business Action

```python
# Approval
self.env['messob.fms.audit.log'].log_business_action(
    action='APPROVE',
    model='messob.fms.trip',
    record_id=trip.id,
    description=f"Approved trip {trip.name}",
    severity='high'
)

# Rejection
self.env['messob.fms.audit.log'].log_business_action(
    action='REJECT',
    model='messob.fms.trip',
    record_id=trip.id,
    description=f"Rejected trip {trip.name}",
    severity='medium'
)

# Assignment
self.env['messob.fms.audit.log'].log_business_action(
    action='ASSIGN',
    model='messob.fms.trip',
    record_id=trip.id,
    description=f"Assigned vehicle {vehicle.license_plate}",
    severity='medium'
)
```

### Log Data Changes

```python
# With old and new values
self.env['messob.fms.audit.log'].log_data_change(
    action='UPDATE',
    model='messob.fms.trip',
    record_id=trip.id,
    old_vals={'state': 'pending', 'assigned_vehicle_id': False},
    new_vals={'state': 'approved', 'assigned_vehicle_id': 5},
    description="Trip approved and vehicle assigned"
)

# Simple create log
self.env['messob.fms.audit.log'].log_data_change(
    action='CREATE',
    model='messob.fms.trip',
    record_id=trip.id,
    new_vals=vals,
    description=f"Created trip {trip.name}"
)

# Delete log
self.env['messob.fms.audit.log'].log_data_change(
    action='DELETE',
    model='messob.fms.trip',
    record_id=trip.id,
    old_vals=trip_data_snapshot,
    description=f"Deleted trip {trip.name}"
)
```

### Log Authentication Events

```python
# Successful login
self.env['messob.fms.audit.log'].log_login(
    user_id=user.id,
    success=True,
    ip_address='192.168.1.100',
    user_agent='Mozilla/5.0...'
)

# Failed login
self.env['messob.fms.audit.log'].log_login(
    user_id=None,
    success=False,
    ip_address='192.168.1.100',
    user_agent='Mozilla/5.0...',
    error_message='Invalid credentials'
)

# Logout
self.env['messob.fms.audit.log'].log_logout(
    user_id=user.id,
    ip_address='192.168.1.100'
)
```

### Generic Logging

```python
self.env['messob.fms.audit.log'].log_action(
    action='EXPORT',
    resource_model='messob.fms.trip',
    resource_id=None,  # Optional
    description='Exported 100 trip records to Excel',
    severity='low',
    success=True,
    user_id=self.env.uid,
    ip_address='192.168.1.100'
)
```

---

## 🎯 Action Types

### Authentication
- `LOGIN` - Successful login
- `LOGOUT` - User logout
- `LOGIN_FAILED` - Failed login attempt

### CRUD Operations
- `CREATE` - Record creation
- `UPDATE` - Record modification
- `DELETE` - Record deletion
- `READ` - Record access (optional)

### Business Actions
- `APPROVE` - Approval action
- `REJECT` - Rejection action
- `ASSIGN` - Resource assignment
- `UNASSIGN` - Resource unassignment
- `SUBMIT` - Submission action
- `CANCEL` - Cancellation action
- `COMPLETE` - Completion action

### System Actions
- `EXPORT` - Data export
- `IMPORT` - Data import
- `BACKUP` - System backup
- `RESTORE` - System restore

### Security Actions
- `PERMISSION_CHANGE` - Permission modification
- `ROLE_CHANGE` - Role assignment change
- `PASSWORD_CHANGE` - Password update
- `ACCESS_DENIED` - Access denial

---

## 📊 Severity Levels

| Level | Use For | Retention |
|-------|---------|-----------|
| `low` | Minor changes, reads, cancellations | 6 months |
| `medium` | Normal operations, creates, updates, assignments | 1 year |
| `high` | Approvals, rejections, deletions | 3 years |
| `critical` | Security events, permission changes | 7 years |

---

## 🔍 Querying Audit Logs

### Search for Specific Actions

```python
# Find all approvals by a user
logs = self.env['messob.fms.audit.log'].search([
    ('action', '=', 'APPROVE'),
    ('user_id', '=', user.id)
])

# Find all failed actions today
from datetime import datetime, timedelta
today = datetime.now().replace(hour=0, minute=0, second=0)
logs = self.env['messob.fms.audit.log'].search([
    ('success', '=', False),
    ('timestamp', '>=', today)
])

# Find all changes to a specific record
logs = self.env['messob.fms.audit.log'].search([
    ('resource_model', '=', 'messob.fms.trip'),
    ('resource_id', '=', trip.id)
], order='timestamp desc')
```

### Get Statistics

```python
# Get audit statistics for last 30 days
stats = self.env['messob.fms.audit.log'].get_audit_statistics(days=30)

# Returns:
# {
#     'total_actions': 1234,
#     'failed_actions': 12,
#     'by_action': {'Approve': 45, 'Create': 123, ...},
#     'by_user': {'John Doe': 234, 'Jane Smith': 189, ...},
#     'by_severity': {'high': 45, 'medium': 890, ...},
#     'by_category': {'business_process': 234, ...}
# }
```

---

## 🛠️ Common Patterns

### Pattern 1: Log Before Action

```python
def action_approve(self):
    # Validate first
    self._check_can_approve()
    
    # Perform action
    self.write({'state': 'approved'})
    
    # Log after success
    self.env['messob.fms.audit.log'].log_business_action(
        action='APPROVE',
        model=self._name,
        record_id=self.id,
        description=f"Approved {self.name}",
        severity='high'
    )
```

### Pattern 2: Log with Try-Catch

```python
def risky_operation(self):
    try:
        # Perform operation
        result = self._do_something_risky()
        
        # Log success
        self.env['messob.fms.audit.log'].log_action(
            action='EXPORT',
            description='Export completed successfully',
            severity='low',
            success=True
        )
        
        return result
        
    except Exception as e:
        # Log failure
        self.env['messob.fms.audit.log'].log_action(
            action='EXPORT',
            description='Export failed',
            severity='high',
            success=False,
            error_message=str(e)
        )
        raise
```

### Pattern 3: Track Assignment Changes

```python
def write(self, vals):
    # Track before change
    for rec in self:
        if 'assigned_vehicle_id' in vals:
            old_vehicle = rec.assigned_vehicle_id.license_plate or 'None'
            new_vehicle_obj = self.env['fleet.vehicle'].browse(vals['assigned_vehicle_id'])
            new_vehicle = new_vehicle_obj.license_plate or 'None'
            
            # Log the change
            self.env['messob.fms.audit.log'].log_business_action(
                action='ASSIGN',
                model=self._name,
                record_id=rec.id,
                description=f"Vehicle changed: {old_vehicle} → {new_vehicle}",
                severity='medium'
            )
    
    # Perform the write
    return super().write(vals)
```

---

## 🎨 UI Access

### Admin View
1. Navigate to: **Admin Panel** → **Audit Logs**
2. Default filter: Last 30 days
3. Switch views: List / Form / Pivot / Graph

### Filters
- **Time:** Today, This Week, This Month
- **Status:** Failed Actions, Critical, High Severity
- **Category:** Authentication, Business Process, Data Management, Security, System Admin

### Search
- By user name
- By action type
- By resource
- By IP address
- By description

---

## ⚙️ Configuration

### Retention Periods

Edit `models/audit_log.py`:

```python
retention_periods = {
    'critical': timedelta(days=7*365),  # 7 years
    'high': timedelta(days=3*365),      # 3 years
    'medium': timedelta(days=365),      # 1 year
    'low': timedelta(days=180),         # 6 months
}
```

### Cron Schedule

Edit `data/audit_log_cron.xml`:

```xml
<field name="interval_number">1</field>
<field name="interval_type">days</field>
<field name="nextcall" eval="(DateTime.now() + timedelta(days=1)).replace(hour=2, minute=0, second=0)"/>
```

---

## 🚫 What NOT to Do

### ❌ Don't Modify Audit Logs

```python
# This will raise an error
log.write({'description': 'Changed'})  # UserError!
```

### ❌ Don't Delete Audit Logs Manually

```python
# This will raise an error
log.unlink()  # UserError!

# Only this works (in cron context)
log.with_context(audit_cleanup=True).unlink()  # OK
```

### ❌ Don't Log Everything

```python
# Bad: Logging trivial reads
self.env['messob.fms.audit.log'].log_action(
    action='READ',
    description='User viewed dashboard'  # Too noisy!
)

# Good: Log important actions only
self.env['messob.fms.audit.log'].log_business_action(
    action='APPROVE',
    description='Approved critical request'  # Important!
)
```

---

## 🐛 Troubleshooting

### Logs Not Being Created?

1. Check model inherits `base.model.audit.mixin`
2. Check `sudo()` is used if permission issues
3. Check for exceptions in logs: `grep "Failed to create audit log" odoo.log`

### Login Logs Not Working?

1. Check `controllers/auth_hooks.py` is loaded
2. Check `controllers/__init__.py` imports auth_hooks
3. Restart Odoo server
4. Check for errors in logs

### Cron Not Running?

1. Go to: Settings → Technical → Scheduled Actions
2. Find "Audit Log Retention Policy Cleanup"
3. Check "Active" is enabled
4. Click "Run Manually" to test

### Viewer Not Showing?

1. Check user has Admin role
2. Check security rules in `security/ir.model.access.csv`
3. Upgrade module: `odoo-bin -u messob_fleet`

---

## 📚 More Information

- **Full Documentation:** See `AUDIT_LOGGING.md`
- **Implementation Summary:** See `FR-5.3_IMPLEMENTATION_SUMMARY.md`
- **Source Code:** `models/audit_log.py`
- **Views:** `views/admin_views.xml`

---

**Quick Reference Version:** 1.0  
**Last Updated:** May 21, 2026

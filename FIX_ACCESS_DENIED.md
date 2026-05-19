# Fix "Access Denied" Error - Step by Step Guide

## Problem
When logging into the frontend (http://localhost:3000), you see "Access Denied" error.

## Root Cause
The user account doesn't have MESSOB Fleet Management security groups assigned.

## Solution

### Method 1: Assign Groups via Odoo UI (RECOMMENDED)

1. **Login to Odoo Backend**
   - Go to: http://localhost:8018
   - Login with: `admin@fleetmanagement.com` / `Admin@123`

2. **Enable Developer Mode** (if not already enabled)
   - Click **Settings** in the left sidebar
   - Scroll down and click **"Activate the developer mode"**

3. **Go to Users Management**
   - Click **Settings** → **Users & Companies** → **Users**
   - Find and click on your admin user (admin@fleetmanagement.com)

4. **Assign Fleet Management Groups**
   - Scroll down to the **"Access Rights"** tab
   - Look for **"MESSOB Fleet Management"** section
   - Check one or more of these groups:
     - ✅ **Administrator** (for full access - RECOMMENDED)
     - ✅ **Dispatcher** (for dispatch management)
     - ✅ **Staff (User)** (for creating trip requests)
     - ✅ **Driver** (for driver functions)
     - ✅ **Mechanic** (for maintenance functions)

5. **Save the User**
   - Click **"Save"** button at the top

6. **Test Frontend Login**
   - Go to: http://localhost:3000
   - Login with the same credentials
   - You should now be able to access the system

---

### Method 2: Create Demo Users with Groups

If you want to test different roles, create separate users:

#### Admin User
- **Name**: Fleet Admin
- **Email**: admin@mesob.et
- **Password**: Admin@123
- **Groups**: MESSOB Fleet Management / Administrator

#### Staff User
- **Name**: Test Staff
- **Email**: staff@mesob.et
- **Password**: Staff@123
- **Groups**: MESSOB Fleet Management / Staff (User)

#### Dispatcher User
- **Name**: Test Dispatcher
- **Email**: dispatcher@mesob.et
- **Password**: Dispatcher@123
- **Groups**: MESSOB Fleet Management / Dispatcher

#### Driver User
- **Name**: Test Driver
- **Email**: driver@mesob.et
- **Password**: Driver@123
- **Groups**: MESSOB Fleet Management / Driver

---

### Method 3: Quick Fix via SQL (ADVANCED)

If you have direct database access, you can assign groups via SQL:

```sql
-- Get the admin user ID
SELECT id, login FROM res_users WHERE login = 'admin@fleetmanagement.com';

-- Get the FMS Admin group ID
SELECT id, name FROM res_groups WHERE name = 'Administrator' AND category_id IN (
    SELECT id FROM ir_module_category WHERE name = 'MESSOB Fleet Management'
);

-- Assign the group to the user (replace USER_ID and GROUP_ID with actual values)
INSERT INTO res_groups_users_rel (gid, uid) VALUES (GROUP_ID, USER_ID);
```

---

## Verification Steps

After assigning groups:

1. **Logout from Odoo** (if logged in)
2. **Go to Frontend**: http://localhost:3000
3. **Login** with your credentials
4. **Expected Result**: You should see the dashboard based on your role:
   - **Admin**: Full dashboard with all menus
   - **Staff**: Request trip wizard and "My Requests"
   - **Dispatcher**: Approval queue and dispatch management
   - **Driver**: Assigned trips and fuel logs
   - **Mechanic**: Maintenance queue and repair logs

---

## Troubleshooting

### Still Getting "Access Denied"?

1. **Clear Browser Cache**
   - Press Ctrl + Shift + Delete
   - Clear cookies and cache
   - Try again

2. **Check if Module is Installed**
   - Go to Odoo → Apps
   - Search for "MESSOB Fleet"
   - Make sure it's installed (not just "Available")

3. **Verify Groups Exist**
   - Go to Settings → Users & Companies → Groups
   - Search for "MESSOB"
   - You should see:
     - MESSOB Fleet Management / Administrator
     - MESSOB Fleet Management / Dispatcher
     - MESSOB Fleet Management / Staff (User)
     - MESSOB Fleet Management / Driver
     - MESSOB Fleet Management / Mechanic

4. **Check User Groups**
   - Go to Settings → Users & Companies → Users
   - Click on your user
   - Scroll to "Access Rights" tab
   - Verify MESSOB Fleet Management groups are checked

5. **Restart Odoo** (if groups were just created)
   ```bash
   docker-compose restart odoo18
   ```

---

## Understanding the Error

The "Access Denied" error appears when:
- User successfully authenticates with Odoo ✅
- But has NO MESSOB Fleet Management groups assigned ❌
- Frontend checks for FMS groups and finds none
- Result: Access Denied

**Solution**: Assign at least ONE MESSOB Fleet Management group to the user.

---

## Quick Test

After fixing, test with this user:
- **Email**: admin@fleetmanagement.com
- **Password**: Admin@123
- **Expected Role**: Admin (if Administrator group is assigned)
- **Expected View**: Full dashboard with all fleet management features

---

**Need Help?**
- Check Odoo logs: `docker-compose logs odoo18`
- Check browser console: Press F12 → Console tab
- Verify module installation: Odoo → Apps → Search "MESSOB"

# MESSOB FMS — Quick Start & Setup Guide
**Version 1.1 | Odoo 18 | Docker Setup**

---

## Overview

Two separate user roles exist in the system:

| Role | Login | Sees |
|------|-------|------|
| **Staff** | staff user | New Request, My Requests |
| **Dispatcher** | dispatcher user | Current Requests, Pending Queue, All Requests |

Roles are **independent** — a dispatcher does NOT automatically get staff menus and vice versa.

---

## Step 1: Upgrade the Module

After any code change, run this command to apply it:

```bash
docker exec mesob-fleet-management-ssystem-odoo18-1 odoo -u messob_fleet \
  --stop-after-init -d odoo --db_host=db18 --db_user=odoo --db_password=odoo

docker restart mesob-fleet-management-ssystem-odoo18-1
```

---

## Step 2: Create a Dispatcher User

1. Log in as admin → **Settings** → **Users & Companies** → **Users**
2. Click **New**
3. Fill in:
   - Name: `Dispatcher User`
   - Email/Login: `dispatcher@messob.org`
4. Click the **Access Rights** tab
5. Under **MESSOB Fleet Management** section → check **Dispatcher** only
6. Under **Fleet** section → check **Officer: Manage all vehicles** (required to access vehicle dropdown)
7. Make sure **Internal User** is set under the main user type
8. Click **Save**
9. Set password: **Action** → **Change Password** → enter password → confirm

> **Important:** Do NOT check Staff (User) for a dispatcher. The two roles are separate.

---

## Step 3: Create a Staff User

1. Settings → Users → **New**
2. Fill in:
   - Name: `Staff User`
   - Email/Login: `staff@messob.org`
3. Access Rights tab → **MESSOB Fleet Management** → check **Staff (User)** only
4. Save → set password

---

## Step 4: Fix — If Dispatcher User Was Created via Demo Data

The `demo_users.xml` file previously auto-created `dispatcher@messob.org` but without the Fleet group. If you used that user, add the Fleet group manually via SQL:

```bash
# Find the Fleet Officer group ID
docker exec mesob-fleet-management-ssystem-db18-1 psql -U odoo -d odoo \
  -c "SELECT id, name->>'en_US' FROM res_groups WHERE name->>'en_US' ILIKE '%vehicle%';"

# Add Internal User group (gid=1) if missing
docker exec mesob-fleet-management-ssystem-db18-1 psql -U odoo -d odoo \
  -c "INSERT INTO res_groups_users_rel (gid, uid) VALUES (1, 16) ON CONFLICT DO NOTHING;"

# Add Fleet Officer group (gid=114) to dispatcher user (uid=16)
docker exec mesob-fleet-management-ssystem-db18-1 psql -U odoo -d odoo \
  -c "INSERT INTO res_groups_users_rel (gid, uid) VALUES (114, 16) ON CONFLICT DO NOTHING;"

docker restart mesob-fleet-management-ssystem-odoo18-1
```

---

## Step 5: Test the Dispatcher

1. Log out from admin
2. Go to `http://localhost:8018`
3. Login: `dispatcher@messob.org` / your password
4. You should see: **MESSOB FMS → Current Requests → Pending Queue**
5. Open a pending request
6. In the **Resource Assignment** panel (right side):
   - Select a vehicle from the dropdown
   - Select a driver from the dropdown
   - Set fuel status
7. Click **Approve** → request status changes to Approved

---

## Step 6: Test the Staff User

1. Log out → log in as `staff@messob.org`
2. You should see: **MESSOB FMS → New Request** and **My Requests**
3. Click **New Request** → 4-step wizard opens
4. Fill in all steps → Submit
5. Request appears in **My Requests** with status **Pending**
6. Log in as dispatcher → it appears in **Pending Queue**

---

## Troubleshooting

### MESSOB FMS menu not visible after login
The user is missing the FMS group. Go to Settings → Users → open the user → assign the correct group → Save → log out and back in.

### "Access Error" on fleet.vehicle when selecting a vehicle
The dispatcher user is missing the Fleet Officer group. Add it in Settings → Users → Access Rights → Fleet → Officer: Manage all vehicles.

### Staff group auto-checked when saving Dispatcher
This was caused by `implied_ids` in the old groups.xml. It is now fixed — Dispatcher no longer implies Staff. If it still happens, run the upgrade command in Step 1.

### Asset bundle 500 error on browser
Stale asset cache. Run:
```bash
docker exec mesob-fleet-management-ssystem-db18-1 psql -U odoo -d odoo \
  -c "DELETE FROM ir_attachment WHERE url LIKE '/web/assets/%';"
docker restart mesob-fleet-management-ssystem-odoo18-1
```

---

## User Summary

| User | Login | Password | Groups |
|------|-------|----------|--------|
| Admin | admin | (your admin password) | Odoo Administrator |
| Dispatcher | dispatcher@messob.org | 12345 | Dispatcher + Fleet Officer + Internal User |
| Staff | staff@messob.org | (set by you) | Staff (User) + Internal User |

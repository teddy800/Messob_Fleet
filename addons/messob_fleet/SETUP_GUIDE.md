# MESSOB Fleet Management System — Setup Guide

## How to Create Different User Roles in Odoo

This guide explains how to create Staff users and Dispatcher users with different permissions and menu access.

---

## Step 1: Install the Module

1. Open Odoo and log in as **Administrator**
2. Go to **Apps** menu
3. Click **Update Apps List** (if you just added the module)
4. Search for "MESSOB Fleet"
5. Click **Install**

---

## Step 2: Understand the Security Groups

The module defines 5 security groups (see `security/groups.xml`):

| Group Name          | XML ID                          | What They Can Do                                    |
|---------------------|---------------------------------|-----------------------------------------------------|
| **FMS User (Staff)**| `messob_fleet.group_fms_user`   | Create requests, view own requests only             |
| **FMS Dispatcher**  | `messob_fleet.group_fms_dispatcher` | View all requests, approve/reject, assign resources |
| **FMS Driver**      | `messob_fleet.group_fms_driver` | (Phase 2) View assigned trips, update status        |
| **FMS Mechanic**    | `messob_fleet.group_fms_mechanic` | (Phase 3) Log fuel and maintenance                  |
| **FMS Admin**       | `messob_fleet.group_fms_admin`  | Full system access, user management                 |

**Important:** Dispatcher group automatically includes User permissions (it's "implied").

---

## Step 3: Create a Staff User

1. Go to **Settings** → **Users & Companies** → **Users**
2. Click **Create**
3. Fill in the form:
   - **Name:** `John Doe` (example staff member)
   - **Email Address:** `john.doe@messob.org`
   - **Access Rights tab:**
     - Find **MESSOB FMS** section
     - Check **only** `FMS User (Staff)`
4. Click **Save**
5. Click **Send Password Reset Instructions** (or set password manually)

**What John sees:**
- Menu: **MESSOB FMS** → **New Request** | **My Requests**
- Can only see his own trip requests
- Cannot see dispatcher menus

---

## Step 4: Create a Dispatcher User

1. Go to **Settings** → **Users & Companies** → **Users**
2. Click **Create**
3. Fill in the form:
   - **Name:** `Sarah Ahmed` (example dispatcher)
   - **Email Address:** `sarah.ahmed@messob.org`
   - **Access Rights tab:**
     - Find **MESSOB FMS** section
     - Check **only** `FMS Dispatcher`
     - (This automatically gives User rights too)
4. Click **Save**
5. Click **Send Password Reset Instructions**

**What Sarah sees:**
- Menu: **MESSOB FMS** → **New Request** | **My Requests** | **Current Requests** → **Pending Queue** | **All Requests**
- Can see ALL trip requests from all staff
- Can approve/reject and assign vehicles + drivers
- Has access to dispatcher form with resource assignment panel

---

## Step 5: Create an Admin User

1. Go to **Settings** → **Users & Companies** → **Users**
2. Click **Create**
3. Fill in the form:
   - **Name:** `Admin User`
   - **Email Address:** `admin.fms@messob.org`
   - **Access Rights tab:**
     - Check `FMS Admin`
     - Also check **Settings** → **Administration** (for full Odoo access)
4. Click **Save**

**What Admin sees:**
- Everything Dispatcher sees
- (Phase 2+) Configuration menus for vehicles, drivers, system settings

---

## Step 6: Test Different User Views

### Test as Staff User (John):
1. Log out from Admin
2. Log in as `john.doe@messob.org`
3. You should see:
   - **MESSOB FMS** menu in the top bar
   - **New Request** — opens 4-step wizard
   - **My Requests** — shows only John's requests
4. Create a new request using the wizard
5. Submit it (status changes to "Pending")

### Test as Dispatcher (Sarah):
1. Log out from John
2. Log in as `sarah.ahmed@messob.org`
3. You should see:
   - **MESSOB FMS** → **Current Requests** → **Pending Queue**
   - Click **Pending Queue**
   - You'll see John's pending request in the table
4. Click on the request to open the form
5. You'll see:
   - **LEFT panel:** Request details (read-only)
   - **RIGHT panel:** Resource Assignment (editable)
     - Select Vehicle dropdown
     - Select Driver dropdown
     - Fuel Status dropdown
6. Select a vehicle and driver
7. Click **Approve** button
8. The request status changes to "Approved"

### Test as Staff Again (John):
1. Log out from Sarah
2. Log in as `john.doe@messob.org`
3. Go to **My Requests**
4. Open the request you created
5. You'll now see:
   - Status: **Approved** (green badge)
   - **Dispatcher Assignment** section showing:
     - Assigned Vehicle
     - Assigned Driver
     - Fuel Status

---

## Step 7: Menu Visibility Rules

The menus are controlled by `groups` attribute in `views/menus.xml`:

```xml
<!-- Staff sees this -->
<menuitem id="menu_fms_new_request"
          name="New Request"
          groups="messob_fleet.group_fms_user"/>

<!-- Only Dispatcher sees this -->
<menuitem id="menu_fms_pending_queue"
          name="Pending Queue"
          groups="messob_fleet.group_fms_dispatcher"/>
```

---

## Step 8: Data Access Rules (Record Rules)

Currently, Staff can only see their own requests because of the domain filter in the action:

```xml
<field name="domain">[('requester_id.user_ids', 'in', [uid])]</field>
```

This means: "Show only records where requester_id is the current logged-in user."

Dispatchers see ALL records because their action has no domain filter.

---

## Quick Reference: User Roles

| User Type  | Login Email              | Can See                          | Can Do                                    |
|------------|--------------------------|----------------------------------|-------------------------------------------|
| **Staff**  | john.doe@messob.org      | Own requests only                | Create, submit, cancel own pending requests |
| **Dispatcher** | sarah.ahmed@messob.org | All requests from all staff      | Approve, reject, assign vehicle + driver  |
| **Admin**  | admin.fms@messob.org     | Everything                       | Full system configuration                 |

---

## Troubleshooting

### Problem: User doesn't see MESSOB FMS menu
**Solution:** Check that the user has at least `FMS User (Staff)` group assigned.

### Problem: Staff user sees dispatcher menus
**Solution:** Remove `FMS Dispatcher` group from that user. They should only have `FMS User (Staff)`.

### Problem: Dispatcher can't approve requests
**Solution:** 
1. Check user has `FMS Dispatcher` group
2. Check that vehicle and driver are assigned before clicking Approve
3. Check for time conflicts (vehicle/driver already assigned to another trip)

### Problem: "Access Denied" error
**Solution:** Check `security/ir.model.access.csv` — the user's group must have read/write permissions on the model.

---

## Next Steps (Phase 2)

- Create **Driver** users with `FMS Driver` group
- Create **Mechanic** users with `FMS Mechanic` group
- Add vehicle and driver master data in Fleet module
- Configure GPS tracking integration

---

**Need Help?** Contact the MESSOB Development Team.

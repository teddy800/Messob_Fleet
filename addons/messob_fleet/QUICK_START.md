# MESSOB FMS — Quick Start Guide

## You are here: Module is installed, you created a staff request, now you need to see it as a dispatcher.

---

## Step 1: Upgrade the Module (to apply the new security groups)

1. In Odoo, click the **grid icon** (top-left) → **Apps**
2. Remove the "Apps" filter (click the ❌ on the search bar)
3. Search for **"MESSOB Fleet"**
4. Click the **⋮** (three dots) on the module card
5. Click **Upgrade**
6. Wait for it to finish

---

## Step 2: Create a Dispatcher User

### 2.1 Open Users Menu
1. Click **Settings** (gear icon in top menu)
2. In the left sidebar, click **Users & Companies** → **Users**

### 2.2 Create New User
1. Click the **Create** button (top-left)
2. Fill in the form:
   - **Name:** `Dispatcher User` (or any name you want)
   - **Email Address:** `dispatcher@messob.org` (or any email)

### 2.3 Assign Dispatcher Role
1. Click the **Access Rights** tab
2. Scroll down until you see **"MESSOB Fleet Management"** section
3. You'll see radio buttons:
   - ○ Staff (User)
   - ○ Dispatcher  ← **SELECT THIS ONE**
   - ○ Driver
   - ○ Mechanic
   - ○ Administrator
4. Click the **Dispatcher** radio button

### 2.4 Save and Set Password
1. Click **Save** (top-left)
2. Click **Action** → **Change Password**
3. Set a password like `dispatcher123`
4. Click **Change Password**

---

## Step 3: Log Out and Log In as Dispatcher

### 3.1 Log Out
1. Click your **profile picture** (top-right corner)
2. Click **Log out**

### 3.2 Log In as Dispatcher
1. Enter email: `dispatcher@messob.org`
2. Enter password: `dispatcher123`
3. Click **Log in**

---

## Step 4: View the Staff Request as Dispatcher

### 4.1 Open Pending Queue
1. You should now see **MESSOB FMS** in the top menu bar
2. Click **MESSOB FMS** → **Current Requests** → **Pending Queue**
3. You'll see a table with the staff request you created earlier

### 4.2 Open the Request Form
1. Click on the request row in the table
2. The form opens with **TWO PANELS:**
   - **LEFT (wider):** "Approve Trip Request" — shows requester, description, dates, places (all read-only)
   - **RIGHT (narrower):** "Resource Assignment" — shows dropdowns for vehicle, driver, fuel status (editable)

### 4.3 Assign Vehicle and Driver
1. In the **RIGHT panel**, click the **"Select Vehicle"** dropdown
   - If empty, you need to create vehicles first (see Step 5 below)
2. Click the **"Select Driver"** dropdown
   - If empty, you need to create drivers first (see Step 5 below)
3. Select **Fuel Status** (e.g., "Full")

### 4.4 Approve the Request
1. Click the **Approve** button (orange, at the top)
2. Confirm the dialog
3. The status changes to **"Approved"** (green badge)

---

## Step 5: Create Vehicles and Drivers (if dropdowns are empty)

### 5.1 Create a Vehicle
1. Click the **grid icon** (top-left) → **Fleet**
2. Click **Fleet** → **Vehicles**
3. Click **Create**
4. Fill in:
   - **Model:** `Toyota Land Cruiser` (example)
   - **License Plate:** `AA-12345`
   - **Vehicle Category:** Select or create "SUV"
5. Click **Save**

### 5.2 Create a Driver (as a Contact)
1. Click the **grid icon** → **Contacts**
2. Click **Create**
3. Fill in:
   - **Name:** `Ahmed Ali` (example driver)
   - **Email:** `ahmed.ali@messob.org`
   - Check **"Is a Company"** = NO (it's an individual)
4. Click **Save**

### 5.3 Go Back to Dispatcher View
1. Click **MESSOB FMS** → **Current Requests** → **Pending Queue**
2. Open the pending request again
3. Now the **"Select Vehicle"** and **"Select Driver"** dropdowns will have options
4. Select them and click **Approve**

---

## Step 6: Verify as Staff User

### 6.1 Log Out and Log Back In as Staff
1. Log out from dispatcher account
2. Log in with your original staff user account

### 6.2 Check Your Request
1. Click **MESSOB FMS** → **My Requests**
2. Open your request
3. You'll now see:
   - Status: **Approved** (green)
   - **Dispatcher Assignment** section showing:
     - Assigned Vehicle: `Toyota Land Cruiser (AA-12345)`
     - Assigned Driver: `Ahmed Ali`
     - Fuel Status: `Full`

---

## Summary: What Each User Sees

| User Type       | Menu Items                                      | What They Can Do                          |
|-----------------|-------------------------------------------------|-------------------------------------------|
| **Staff**       | New Request, My Requests                        | Create requests, view own requests only   |
| **Dispatcher**  | New Request, My Requests, Pending Queue, All Requests | View all requests, approve/reject, assign |

---

## Troubleshooting

### Problem: "MESSOB Fleet Management" section doesn't appear in Users form
**Solution:** 
1. Go to Apps → search "MESSOB Fleet" → click ⋮ → Upgrade
2. Refresh your browser (Ctrl+F5)

### Problem: Dispatcher sees same menus as Staff
**Solution:** 
1. Go to Settings → Users → open the dispatcher user
2. Access Rights tab → make sure **Dispatcher** radio button is selected (not Staff)
3. Save

### Problem: Vehicle/Driver dropdowns are empty
**Solution:** 
1. Create vehicles in Fleet → Vehicles
2. Create drivers as Contacts (res.partner)
3. Refresh the dispatcher form

### Problem: "Access Denied" when clicking Approve
**Solution:** 
1. Make sure you assigned both vehicle AND driver before clicking Approve
2. Check that the dispatcher user has the Dispatcher role (not just Staff)

---

**You're all set!** The system is now working with proper role separation.

# MESSOB Fleet Management - Installation & Verification Guide

## 🎯 Current Status

### ✅ What's Working
- ✅ Docker containers running (Odoo 18 + PostgreSQL 16)
- ✅ Frontend running on http://localhost:3000
- ✅ Backend running on http://localhost:8018
- ✅ Database "fleet_management" created
- ✅ Vite proxy configured correctly
- ✅ Module files properly structured

### ⏳ What Needs to Be Done
- ⏳ Install base Odoo modules (Fleet, Employees, Contacts)
- ⏳ Install MESSOB Fleet Management module
- ⏳ Create test users with proper roles
- ⏳ Test frontend-backend integration

---

## 📋 Step-by-Step Installation

### Step 1: Test System Connection

Open this URL in your browser:
```
http://localhost:3000/test-connection.html
```

This will run automated tests to verify:
- Frontend server status
- Backend server status
- Database connection
- API proxy configuration
- Module installation status

### Step 2: Install Base Modules in Odoo

1. Go to http://localhost:8018
2. Login with your admin credentials
3. Click **Settings** → **Activate the developer mode**
4. Go to **Apps** menu
5. Click **Update Apps List** button
6. Install these modules in order:

   **Required Modules:**
   - ✅ **Fleet** - Base fleet management
   - ✅ **Employees** - HR module for staff management
   - ✅ **Contacts** - Contact management
   - ✅ **Discuss** - Internal messaging

### Step 3: Install MESSOB Fleet Management Module

1. In **Apps** menu, remove the "Apps" filter
2. Search for: **"messob"** or **"MESSOB Fleet"**
3. You should see: **"MESSOB Fleet Management"**
4. Click **Activate** or **Install**
5. Wait for installation to complete (may take 1-2 minutes)

### Step 4: Verify Menu Items Appear

After installation, you should see these new menu items in the left sidebar:

**For Admin Users:**
- 🚗 **Fleet Management**
  - Trip Requests
  - Dispatches
  - Drivers
  - Vehicles
  - Fuel Logs
  - Maintenance Logs
  - Locations
  - Reports

**For Staff Users:**
- 📝 Request Trip
- 📊 My Requests

**For Dispatcher Users:**
- 📋 Approval Queue
- 🚚 Active Trips

**For Driver Users:**
- 🚗 My Trips
- ⛽ Fuel Logs

**For Mechanic Users:**
- 🔧 Maintenance Queue
- 📝 Repair Logs

### Step 5: Create Test Users

1. Go to **Settings** → **Users & Companies** → **Users**
2. Create users for each role:

   **Staff User:**
   - Name: Test Staff
   - Email: staff@mesob.et
   - Groups: MESSOB Fleet Management / Staff

   **Dispatcher User:**
   - Name: Test Dispatcher
   - Email: dispatcher@mesob.et
   - Groups: MESSOB Fleet Management / Dispatcher

   **Driver User:**
   - Name: Test Driver
   - Email: driver@mesob.et
   - Groups: MESSOB Fleet Management / Driver

   **Mechanic User:**
   - Name: Test Mechanic
   - Email: mechanic@mesob.et
   - Groups: MESSOB Fleet Management / Maintainer

### Step 6: Test Frontend Login

1. Go to http://localhost:3000
2. You should see the **MESSOB-FMS Login Page**
3. Login with any of the test users created above
4. Verify you're redirected to the appropriate dashboard

---

## 🧪 Testing Checklist

### Backend Tests (Odoo)

- [ ] Can access Odoo at http://localhost:8018
- [ ] Developer mode is enabled
- [ ] Base modules installed (Fleet, Employees, Contacts)
- [ ] MESSOB Fleet Management module installed
- [ ] Menu items appear in left sidebar
- [ ] Can create a trip request in Odoo
- [ ] Can view drivers list
- [ ] Can view vehicles list

### Frontend Tests

- [ ] Can access frontend at http://localhost:3000
- [ ] Login page displays correctly with MESSOB logo
- [ ] Can login with admin credentials
- [ ] Dashboard loads after login
- [ ] Can navigate between pages
- [ ] Can create a new trip request
- [ ] Can view trip request status
- [ ] Logout works correctly

### Integration Tests

- [ ] Frontend can connect to backend API
- [ ] Login from frontend authenticates with Odoo
- [ ] Trip requests created in frontend appear in Odoo
- [ ] Changes in Odoo reflect in frontend
- [ ] Role-based access control works
- [ ] Proxy routes work correctly (/odoo/*)

---

## 🔧 Troubleshooting

### Issue: Module not appearing in Apps list

**Solution:**
```bash
# Restart Odoo container
docker-compose restart odoo18

# Then in Odoo:
# Apps → Update Apps List
```

### Issue: Frontend shows blank page

**Solution:**
1. Open browser console (F12)
2. Check for errors
3. Hard refresh: Ctrl + Shift + R
4. Try incognito/private window

### Issue: Login fails with "database not found"

**Solution:**
- Verify database name in `frontend/src/lib/odooApi.js` is "fleet_management"
- Check database exists in Odoo database manager

### Issue: "Cannot connect to backend"

**Solution:**
```bash
# Check if containers are running
docker ps

# Check Odoo logs
docker-compose logs odoo18

# Restart if needed
docker-compose restart odoo18
```

---

## 📊 System Architecture

```
┌─────────────────────────────────────────┐
│  Browser                                │
│  http://localhost:3000                  │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  Frontend (React + Vite)                │
│  Port: 3000                             │
│  - Login Page                           │
│  - Dashboards (Staff, Dispatcher, etc)  │
│  - Trip Request Wizard                  │
│  - Status Tracking                      │
└──────────────┬──────────────────────────┘
               │ Vite Proxy: /odoo → :8018
               ↓
┌─────────────────────────────────────────┐
│  Backend (Odoo 18)                      │
│  Port: 8018 (mapped from 8069)          │
│  - REST API                             │
│  - Business Logic                       │
│  - Module: messob_fleet                 │
│  - Authentication                       │
└──────────────┬──────────────────────────┘
               │ PostgreSQL Protocol
               ↓
┌─────────────────────────────────────────┐
│  Database (PostgreSQL 16)               │
│  Port: 5432                             │
│  - Database: fleet_management           │
│  - User: odoo                           │
│  - Password: odoo                       │
└─────────────────────────────────────────┘
```

---

## 🚀 Quick Start Commands

```bash
# Start everything
cd c:\Users\HP\odoo-addons\mesob_fleet_management
docker-compose up -d odoo18 db18
cd frontend
npm run dev

# View logs
docker-compose logs -f odoo18

# Restart Odoo (after code changes)
docker-compose restart odoo18

# Stop everything
docker-compose down
# Stop frontend: Ctrl+C in terminal
```

---

## ✅ Success Criteria

Your system is fully working when:

1. ✅ Test connection page shows all tests passing
2. ✅ MESSOB Fleet Management menu appears in Odoo
3. ✅ Frontend login page displays correctly
4. ✅ Can login from frontend with Odoo credentials
5. ✅ Can create trip requests from frontend
6. ✅ Trip requests appear in both frontend and backend
7. ✅ Role-based dashboards work correctly

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Docker logs: `docker-compose logs odoo18`
3. Check browser console for frontend errors (F12)
4. Verify all containers are running: `docker ps`

---

**Last Updated:** May 19, 2026
**Version:** 1.1.0

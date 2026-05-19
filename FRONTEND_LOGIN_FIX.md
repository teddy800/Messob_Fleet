# Frontend Login "Access Denied" - Complete Fix Guide

## 🔍 Problem Analysis

The "Access Denied" error occurs because:
1. ❌ The user `admin@fleetmanagement.com` doesn't exist in your Odoo database
2. ❌ OR the user exists but doesn't have MESSOB Fleet Management groups assigned

## ✅ SOLUTION: Use the Correct Credentials

### Step 1: Find Your Actual Admin Email

1. **In Odoo** (http://localhost:8018), you're logged in as **"Mitchell Admin"**
2. Click on your name (top right corner) → **My Profile**
3. Note the **Email Address** shown there
4. This is the email you should use in the frontend

### Step 2: Login to Frontend with Correct Credentials

1. Go to http://localhost:3000
2. **Open Browser Console** (Press F12 → Console tab)
3. Enter:
   - **Email**: The email from Step 1 (Mitchell Admin's email)
   - **Password**: The password you use to login to Odoo
4. Click **Login**
5. **Check the console** for debug messages (🔐 ✅ 👥 🎭)

---

## 🔧 Alternative Fix: Create the User in Odoo

If you want to use `admin@fleetmanagement.com`:

### Method 1: Via Odoo UI

1. **Go to Odoo**: http://localhost:8018
2. **Settings** → **Users & Companies** → **Users**
3. Click **Create**
4. Fill in:
   - **Name**: Fleet Admin
   - **Email**: admin@fleetmanagement.com
5. Click **Save**
6. Click **Action** → **Change Password**
7. Set password to: **Admin@123**
8. **Scroll to Access Rights tab**
9. Check: **MESSOB Fleet Management / Dispatcher** (or Administrator if available)
10. Click **Save**

### Method 2: Use Existing Admin User

**Easier Option**: Just use your existing Odoo admin credentials in the frontend!

1. In Odoo, go to **Settings** → **Users & Companies** → **Users**
2. Find **Mitchell Admin** (or your admin user)
3. Note the email address
4. Make sure **MESSOB Fleet Management / Dispatcher** is checked
5. Use this email and password in the frontend

---

## 🧪 Debug Steps

### Check Browser Console

1. Open frontend: http://localhost:3000
2. Press **F12** → **Console** tab
3. Try to login
4. Look for these messages:

```
🔐 Attempting login with: [email]
📡 RPC Call: /web/session/authenticate
📥 RPC Response: {...}
✅ Odoo session created: {...}
👥 User groups fetched: [...]
🎭 Resolved role: [role]
🚀 Navigating to: [path]
```

### If You See Error Messages:

**Error: "Invalid email or password"**
- ✅ The user doesn't exist or password is wrong
- **Fix**: Use correct Odoo admin credentials

**Error: "Access Denied"**
- ✅ This is coming from Odoo backend
- **Fix**: Check user has proper access rights in Odoo

**Error: "No MESSOB Fleet Management groups assigned"**
- ✅ User exists but has no FMS groups
- **Fix**: Assign Dispatcher or Administrator group in Odoo

---

## 📋 Quick Checklist

Before trying to login to frontend:

- [ ] Odoo backend is running (http://localhost:8018)
- [ ] Frontend is running (http://localhost:3000)
- [ ] MESSOB Fleet module is installed in Odoo
- [ ] User exists in Odoo with correct email
- [ ] User has MESSOB Fleet Management group assigned
- [ ] You're using the SAME email and password as in Odoo

---

## 🎯 Recommended Solution (EASIEST)

**Use your current Odoo admin credentials:**

1. In Odoo, click your name (top right) → **Preferences**
2. Note your **Email** (e.g., `admin@example.com` or `mitchell@mesob.et`)
3. Go to frontend: http://localhost:3000
4. Enter:
   - **Email**: [Your Odoo email from step 2]
   - **Password**: [Your Odoo password]
5. Click Login

**This should work immediately!**

---

## 🔍 Still Not Working?

### Check Console Logs

Open browser console (F12) and share these logs:

1. The 🔐 login attempt message
2. The 📡 RPC call details
3. The 📥 RPC response
4. Any ❌ error messages

### Check Odoo User

1. Settings → Users & Companies → Users
2. Find your user
3. Verify:
   - ✅ Email is correct
   - ✅ User is active (not archived)
   - ✅ Has "MESSOB Fleet Management" group checked
   - ✅ Password is correct (try resetting it)

### Check Module Installation

1. Apps → Search "messob"
2. Verify "MESSOB Fleet Management" shows "Installed" (not just available)
3. If not installed, click **Install**
4. Wait for installation to complete
5. Go back to Users and assign groups

---

## 💡 Pro Tip

**Create a dedicated test user:**

1. In Odoo: Settings → Users → Create
2. Name: Test Staff
3. Email: staff@mesob.et
4. Password: Staff@123
5. Groups: MESSOB Fleet Management / Dispatcher
6. Save
7. Use these credentials in frontend

This way you have a clean test user separate from your admin account!

---

## 📞 Need More Help?

If still not working, provide:
1. Screenshot of browser console (F12)
2. Screenshot of user's Access Rights tab in Odoo
3. The exact email you're trying to use
4. Any error messages from console

---

**The most common issue is using wrong email address. Make sure you're using the EXACT email from your Odoo user account!**

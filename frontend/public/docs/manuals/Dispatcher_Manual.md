# MESSOB Fleet Management System
## Dispatcher Operations Manual

**Version:** 1.1.0  
**Last Updated:** June 2026  
**For:** Dispatcher Role Users

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Dashboard Overview](#dashboard-overview)
4. [Managing Trip Requests](#managing-trip-requests)
5. [Fleet Calendar](#fleet-calendar)
6. [Vehicle Assignment](#vehicle-assignment)
7. [Driver Assignment](#driver-assignment)
8. [Real-Time Monitoring](#real-time-monitoring)
9. [Reports and Analytics](#reports-and-analytics)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## 1. Introduction

Welcome to the MESSOB Fleet Management System Dispatcher Operations Manual. As a Dispatcher, you are the central coordinator of the fleet operations, responsible for:

- **Reviewing and approving trip requests** from staff members
- **Assigning vehicles** to approved trips based on availability and requirements
- **Assigning drivers** to transport passengers safely
- **Monitoring real-time fleet operations** and GPS tracking
- **Managing the fleet calendar** for optimal resource utilization
- **Generating reports** on fleet performance and utilization

This manual will guide you through all dispatcher functions and help you manage fleet operations efficiently.

---

## 2. Getting Started

### Logging In

1. Navigate to the MESSOB Fleet Management System login page
2. Enter your dispatcher credentials:
   - **Email:** Your assigned dispatcher email
   - **Password:** Your secure password
3. Click **"Sign In"**

### Dispatcher Dashboard

After login, you'll see the Dispatcher Dashboard with:

- **Pending Requests:** Number of trip requests awaiting approval
- **Active Trips:** Currently in-progress trips
- **Available Vehicles:** Vehicles ready for assignment
- **Available Drivers:** Drivers on duty and available
- **Today's Schedule:** Overview of today's trips
- **Quick Actions:** Shortcuts to common tasks

---

## 3. Dashboard Overview

### Key Metrics

The dashboard displays real-time metrics:

| Metric | Description |
|--------|-------------|
| **Pending Approvals** | Trip requests waiting for your review |
| **Active Trips** | Trips currently in progress |
| **Completed Today** | Trips completed in the last 24 hours |
| **Fleet Utilization** | Percentage of vehicles currently in use |
| **Driver Availability** | Number of drivers on duty |

### Quick Navigation

- **Approval Queue:** Review pending trip requests
- **Fleet Calendar:** Visual schedule of all trips
- **Real-Time Dashboard:** Monitor active trips with GPS
- **Reports:** Generate fleet performance reports

---

## 4. Managing Trip Requests

### Accessing the Approval Queue

1. From the dashboard, click **"Approval Queue"** or navigate to **Dispatch > Approvals**
2. You'll see a list of all pending trip requests sorted by **Priority Score**

### Understanding Priority Scores

Trip requests are automatically ranked based on:

- **Urgency Level:** Emergency, Urgent, Normal, or Low
- **Trip Start Time:** Requests for sooner trips rank higher
- **Wait Time:** How long the request has been pending
- **Requester History:** Past trip behavior and reliability

**Priority Levels:**
- 🔴 **Critical (80-100):** Immediate attention required
- 🟠 **High (60-79):** Process within 2 hours
- 🟡 **Medium (40-59):** Process within 4 hours
- 🟢 **Low (0-39):** Process within 24 hours

### Reviewing a Trip Request

Click on any trip request to view detailed information:

#### Trip Details
- **Requester:** Staff member's name and department
- **Purpose:** Reason for the trip (minimum 10 characters)
- **Vehicle Category:** Requested type (Sedan, SUV, Pickup, Bus, etc.)
- **Passengers:** Number of passengers (used for vehicle selection)
- **Trip Dates:** Start and end date/time
- **Locations:** Pickup and destination addresses
- **Distance:** Estimated trip distance
- **Urgency:** Emergency, Urgent, Normal, or Low

#### Decision Making

Consider these factors when reviewing:

1. **Is the trip justification valid?**
   - Does it align with organizational needs?
   - Is it for official business?

2. **Is the timing feasible?**
   - Sufficient lead time for preparation?
   - No conflicts with existing trips?

3. **Are resources available?**
   - Vehicle matching requested category?
   - Driver available for the time slot?

### Approving a Trip Request

**Steps to Approve:**

1. Click **"Approve Request"** button
2. **Assign a Vehicle:**
   - System shows available vehicles matching the category
   - Filter by: Type, Capacity, Status, Location
   - Select the most suitable vehicle
3. **Assign a Driver:**
   - System shows available drivers for the time slot
   - Check driver qualifications and license status
   - Select a qualified driver
4. Add any **special instructions** for the driver (optional)
5. Click **"Confirm Approval"**

**What Happens Next:**
- ✅ Requester receives email/SMS notification
- ✅ Driver receives trip assignment notification
- ✅ Trip appears on the fleet calendar
- ✅ Vehicle is marked as "Assigned" for that time period

### Rejecting a Trip Request

If a request cannot be approved:

1. Click **"Reject Request"** button
2. **Select a rejection reason:**
   - No vehicles available
   - No drivers available
   - Insufficient justification
   - Outside service hours
   - Duplicate request
   - Other (specify)
3. Add **detailed explanation** (required - helps requester understand)
4. Optionally **suggest alternative dates/times**
5. Click **"Confirm Rejection"**

**Best Practice:** Always provide a clear, helpful rejection reason. If possible, suggest alternatives.

---

## 5. Fleet Calendar

### Accessing the Calendar

Navigate to **Dispatch > Fleet Calendar** to see a visual overview of all trips and vehicle assignments.

### Calendar Views

**Week View (Default):**
- Shows 7-day schedule
- Each vehicle has its own row
- Trips displayed as colored blocks

**Month View:**
- 30-day overview
- Useful for long-term planning
- Click any day to see details

**Day View:**
- Detailed hour-by-hour schedule
- Best for managing current day operations

### Understanding Calendar Colors

| Color | Status | Action Required |
|-------|--------|-----------------|
| 🟡 **Yellow** | Pending Approval | Review and assign |
| 🟢 **Green** | Approved & Assigned | Monitoring only |
| 🔵 **Blue** | In Progress | Active trip |
| ⚫ **Gray** | Completed | Archived |
| 🔴 **Red** | Cancelled/Rejected | No action |

### Calendar Features

**Drag and Drop Rescheduling:**
- Click and hold a trip block
- Drag to new time slot or vehicle
- System checks availability automatically
- Confirm the change

**Click for Details:**
- Click any trip to view full information
- Edit trip details (date, time, vehicle, driver)
- Add notes or special instructions
- Cancel or complete trip

**Filters:**
- Filter by vehicle type
- Filter by driver
- Filter by department
- Filter by status

---

## 6. Vehicle Assignment

### Vehicle Selection Criteria

When assigning vehicles, consider:

1. **Category Match:**
   - Requester's preference
   - Passenger count requirements
   - Cargo/equipment needs

2. **Availability:**
   - Not assigned to another trip
   - Not under maintenance
   - Sufficient fuel level
   - No pending alerts

3. **Location:**
   - Current location vs pickup location
   - Transit time to pickup point

4. **Condition:**
   - Recent maintenance status
   - Odometer reading
   - Fuel efficiency

### Vehicle Categories

| Category | Capacity | Best For |
|----------|----------|----------|
| **Sedan** | 4 passengers | Individual staff, short trips |
| **SUV** | 6 passengers | Small groups, rough terrain |
| **Minibus** | 12 passengers | Medium groups, field work |
| **Bus** | 25+ passengers | Large groups, training sessions |
| **Pickup** | 2 passengers + cargo | Equipment transport, construction |

### Checking Vehicle Availability

The system automatically shows available vehicles based on:
- ✅ Trip date and time
- ✅ Maintenance schedule
- ✅ Fuel level (must be >20%)
- ✅ No critical alerts

**Manual Check:**
1. Go to **Fleet > Vehicle Management**
2. View vehicle status in real-time
3. Check upcoming maintenance alerts
4. Review trip history

---

## 7. Driver Assignment

### Driver Selection Criteria

When assigning drivers, ensure:

1. **Availability:**
   - Not assigned to another trip at that time
   - Within duty hours (check shift schedule)
   - Not on leave or vacation

2. **Qualifications:**
   - Valid driver's license
   - License category matches vehicle type
   - Medical certificate up to date
   - No recent incidents

3. **Experience:**
   - Familiar with route/destination
   - Experienced with vehicle type
   - Good safety record

### Driver License Categories

| License Type | Allowed Vehicles |
|--------------|------------------|
| **B** | Sedan, SUV, Pickup |
| **C** | Minibus, Medium Trucks |
| **D** | Large Bus |

⚠️ **Important:** Never assign a driver to a vehicle they're not licensed for.

### Driver Rotation

Best practices for fair driver assignment:

- Rotate drivers across different routes
- Balance workload (hours driven per week)
- Consider driver preferences when possible
- Account for rest periods between long trips

---

## 8. Real-Time Monitoring

### Real-Time Dashboard

Access **Dispatch > Real-Time Dashboard** to monitor active trips:

**Live Information:**
- 🗺️ GPS location of all active vehicles
- 🚗 Current speed and heading
- ⏱️ Estimated time of arrival (ETA)
- 📍 Route progress (% complete)
- ⛽ Fuel level
- 🔔 Alerts and notifications

### GPS Tracking Features

**Map View:**
- See all active vehicles on a single map
- Click vehicle icon for details
- View planned route vs actual route
- Geofence alerts (if vehicle leaves expected area)

**Vehicle Details Panel:**
- Driver name and contact
- Current location address
- Speed (current and average)
- Ignition status (On/Off)
- Last update timestamp

### Monitoring Best Practices

1. **Check dashboard every 30 minutes** during peak hours
2. **Respond to alerts immediately** (see Alert section below)
3. **Contact drivers** if significant delays occur
4. **Update requesters** if trip is delayed >15 minutes
5. **Document incidents** in the system

### Alerts and Notifications

You'll receive automatic alerts for:

| Alert Type | Description | Action Required |
|------------|-------------|-----------------|
| 🚨 **Speeding** | Vehicle exceeding speed limit | Contact driver, log incident |
| ⛽ **Low Fuel** | Fuel level < 20% | Instruct driver to refuel |
| 🔧 **Maintenance** | Check engine light or warning | Assess severity, may need roadside assistance |
| 📍 **Geofence** | Vehicle outside expected area | Contact driver, verify route |
| ⏰ **Delay** | Trip running >30 min late | Notify requester, assess cause |
| 🛑 **Stopped** | Vehicle stationary >20 min | Check with driver, possible breakdown |

---

## 9. Reports and Analytics

### Available Reports

Navigate to **Dispatch > Reports** to generate:

1. **Trip Summary Report**
   - Total trips by period (day/week/month)
   - Trips by status (completed, cancelled, pending)
   - Trips by department
   - Average trip duration and distance

2. **Vehicle Utilization Report**
   - Hours in use vs. available
   - Utilization rate by vehicle
   - Most/least used vehicles
   - Idle time analysis

3. **Driver Performance Report**
   - Trips completed by driver
   - Average safety score
   - Fuel efficiency per driver
   - Incident history

4. **Fuel Consumption Report**
   - Fuel used by vehicle
   - Cost per kilometer
   - Fuel efficiency trends
   - Refueling locations

5. **Maintenance Report**
   - Upcoming maintenance schedule
   - Maintenance costs by vehicle
   - Downtime due to repairs
   - Parts replacement history

### Generating a Report

1. Select report type from dropdown
2. Choose date range (Today, This Week, This Month, Custom)
3. Apply filters (by department, vehicle, driver, etc.)
4. Click **"Generate Report"**
5. View on screen or **Download** as PDF/Excel

### Report Scheduling

Set up automatic report delivery:

1. Go to **Reports > Scheduled Reports**
2. Click **"New Schedule"**
3. Select report type and parameters
4. Choose frequency (Daily, Weekly, Monthly)
5. Add email recipients
6. Click **"Save Schedule"**

---

## 10. Best Practices

### Efficiency Tips

**Morning Routine (Start of Day):**
1. ✅ Review today's approved trips
2. ✅ Verify all vehicles are available (no breakdowns overnight)
3. ✅ Check driver attendance and availability
4. ✅ Review weather forecast for potential delays
5. ✅ Process any urgent/emergency requests first

**Throughout the Day:**
1. ✅ Check approval queue every 2 hours
2. ✅ Monitor real-time dashboard for active trips
3. ✅ Respond to alerts within 5 minutes
4. ✅ Keep requesters informed of any changes
5. ✅ Document all incidents immediately

**End of Day:**
1. ✅ Verify all trips completed or accounted for
2. ✅ Review tomorrow's schedule
3. ✅ Process any last-minute requests for next day
4. ✅ Check vehicle maintenance alerts
5. ✅ Generate daily summary report

### Communication Best Practices

**With Requesters:**
- Respond to all requests within 4 hours (or sooner for urgent)
- Provide clear reasons for rejections with alternatives
- Notify immediately if approved trip needs changes
- Be professional and courteous

**With Drivers:**
- Provide complete trip information before departure
- Share any special instructions or requirements
- Maintain open communication channel during trips
- Acknowledge safe trip completions

**With Maintenance Team:**
- Report vehicle issues immediately
- Share driver feedback on vehicle performance
- Coordinate maintenance schedules to minimize downtime
- Verify repairs before putting vehicle back in service

### Priority Management

When multiple requests arrive simultaneously:

1. **Emergency trips** always take priority
2. **Time-sensitive trips** (meetings, airport) next
3. **Trips with longer travel time** (need earlier start)
4. **First-come-first-served** for equal priority

### Resource Optimization

**Maximizing Vehicle Utilization:**
- Group trips to same destination when possible
- Schedule back-to-back trips for same vehicle
- Minimize idle time between trips
- Use smaller vehicles for smaller groups (fuel efficiency)

**Balancing Driver Workload:**
- Track hours driven per day (max 8-10 hours)
- Allow rest breaks between long trips
- Rotate weekend/holiday assignments
- Consider driver home location for late trips

---

## 11. Troubleshooting

### Common Issues and Solutions

**Issue: No Vehicles Available**
- **Check:** Are vehicles genuinely booked or under maintenance?
- **Solution 1:** Look for shorter trips that can use smaller vehicles
- **Solution 2:** Check if any trips can be rescheduled
- **Solution 3:** Contact requester to adjust time or use personal transport with reimbursement

**Issue: No Drivers Available**
- **Check:** Are drivers at max hours or on authorized leave?
- **Solution 1:** Check if any trip can be moved by 1-2 hours
- **Solution 2:** Contact off-duty drivers for overtime (if authorized)
- **Solution 3:** Reject request with explanation and alternative dates

**Issue: GPS Not Updating**
- **Check:** Driver's device connectivity
- **Solution 1:** Contact driver to restart GPS device
- **Solution 2:** Verify driver has enabled location services
- **Solution 3:** Log issue for technical support

**Issue: Duplicate Requests**
- **Check:** Same requester, same dates, similar purpose
- **Solution:** Reject duplicate, note the original request ID

**Issue: Trip Running Late**
- **Check:** GPS for current location and traffic
- **Solution 1:** Contact driver for status update
- **Solution 2:** Notify requester with new ETA
- **Solution 3:** If significant delay, offer alternative arrangements

### Emergency Procedures

**Vehicle Breakdown:**
1. Contact driver immediately for status
2. Assess passenger safety
3. Arrange alternative transport if needed
4. Notify maintenance team
5. Update trip status and log incident
6. Inform requester

**Accident/Incident:**
1. Ensure driver and passengers are safe
2. Instruct driver to contact police if needed
3. Document all details in system
4. Notify management immediately
5. Arrange alternative transport for passengers
6. Complete incident report

**Driver No-Show:**
1. Attempt to contact driver (3 attempts)
2. Check if driver called in sick or emergency
3. Find replacement driver immediately
4. If not possible, notify requester ASAP
5. Log incident for HR follow-up

---

## Appendix

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + A` | Go to Approval Queue |
| `Ctrl + C` | Open Fleet Calendar |
| `Ctrl + R` | Open Real-Time Dashboard |
| `Ctrl + F` | Search trips |
| `Ctrl + N` | New manual trip (admin override) |

### Contact Information

**Technical Support:**
- Email: support@messob.et
- Phone: +251 11 123 4567
- Hours: Monday-Friday, 8:00-18:00 EAT

**Fleet Manager:**
- Email: fleetmanager@messob.et
- Phone: +251 11 456 7890
- For: Policy questions, escalations

**Emergency Hotline:**
- Phone: +251 91 234 5678
- Available: 24/7
- For: Accidents, breakdowns, security issues

---

# MESSOB Fleet Management System
## Mechanic Service Guide

**Version:** 1.1.0  
**Last Updated:** June 2026  
**For:** Maintainer/Mechanic Role Users

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Dashboard Overview](#dashboard-overview)
4. [Maintenance Alerts](#maintenance-alerts)
5. [Logging Repairs](#logging-repairs)
6. [Preventive Maintenance](#preventive-maintenance)
7. [Vehicle Inspections](#vehicle-inspections)
8. [Parts and Inventory](#parts-and-inventory)
9. [Work Orders](#work-orders)
10. [Reporting](#reporting)
11. [Best Practices](#best-practices)
12. [Troubleshooting Guide](#troubleshooting-guide)

---

## 1. Introduction

Welcome to the MESSOB Fleet Management System Mechanic Service Guide. As a mechanic/maintainer, you are responsible for:

- **Maintaining fleet vehicles** in safe operating condition
- **Responding to maintenance alerts** and addressing issues promptly
- **Performing preventive maintenance** according to schedules
- **Logging all repairs and services** accurately in the system
- **Managing parts inventory** and ordering supplies
- **Conducting safety inspections** before vehicles return to service
- **Recommending vehicle retirement** when cost-ineffective to repair

This guide will help you use the system effectively to maintain fleet reliability and safety.

---

## 2. Getting Started

### Logging In

1. Navigate to the MESSOB Fleet Management System
2. Enter your mechanic credentials:
   - **Email:** Your assigned mechanic email
   - **Password:** Your secure password
3. Click **"Sign In"**

### Mechanic Dashboard

After login, you'll access the **Maintenance Dashboard** showing:

- **Pending Alerts:** Vehicles requiring immediate attention
- **Scheduled Maintenance:** Upcoming preventive maintenance tasks
- **Active Work Orders:** Repairs currently in progress
- **Completed Today:** Services finished in last 24 hours
- **Parts Inventory:** Low-stock warnings

---

## 3. Dashboard Overview

### Key Metrics

Your dashboard displays:

| Metric | Description |
|--------|-------------|
| **Critical Alerts** | Vehicles with safety issues (cannot operate) |
| **Warning Alerts** | Vehicles needing attention soon |
| **Scheduled This Week** | Preventive maintenance due in next 7 days |
| **Vehicles in Garage** | Currently under repair |
| **Parts Orders Pending** | Awaiting delivery |
| **Avg Repair Time** | Average hours to complete work orders |

### Status Indicators

| Color | Status | Meaning |
|-------|--------|---------|
| 🔴 **Red** | Critical | Immediate attention required, vehicle unsafe |
| 🟠 **Orange** | Warning | Attention needed within 48 hours |
| 🟡 **Yellow** | Scheduled | Preventive maintenance due soon |
| 🟢 **Green** | Completed | Service finished, vehicle ready |
| ⚫ **Gray** | Pending Parts | Waiting for parts delivery |

---

## 4. Maintenance Alerts

### Types of Alerts

The system generates automatic alerts based on:

1. **Mileage-Based:**
   - Oil change due (every 5,000 km)
   - Tire rotation (every 10,000 km)
   - Major service (every 20,000 km)

2. **Time-Based:**
   - Annual safety inspection
   - Battery replacement (every 3 years)
   - Brake fluid change (every 2 years)

3. **Sensor-Based:**
   - Check engine light
   - Low tire pressure
   - Low oil pressure
   - High engine temperature
   - Brake wear indicators

4. **Driver-Reported:**
   - Unusual noises
   - Performance issues
   - Warning lights
   - Fluid leaks

### Viewing Alerts

**To see all maintenance alerts:**

1. Navigate to **Maintenance > Alerts**
2. View list sorted by priority (Critical → Warning → Scheduled)
3. Filter by:
   - Vehicle
   - Alert type
   - Date range
   - Status

### Responding to Alerts

**For each alert:**

1. Click on the alert to view details:
   - **Vehicle:** Make, model, plate number
   - **Alert Type:** What triggered the alert
   - **Description:** Specific issue or service due
   - **Reported By:** System, driver, or dispatcher
   - **Date Created:** When alert was generated
   - **Priority:** Critical, Warning, or Scheduled

2. **Assess Priority:**
   - 🔴 **Critical:** Address within 4 hours
   - 🟠 **Warning:** Address within 48 hours
   - 🟡 **Scheduled:** Plan within 1 week

3. **Create Work Order** (see Work Orders section)

### Marking Alerts as Complete

After repairing the issue:

1. Open the alert
2. Click **"Mark Complete"**
3. Enter details:
   - **Services performed**
   - **Parts used**
   - **Labor hours**
   - **Cost** (parts + labor)
4. Upload photos of:
   - Before repair (showing issue)
   - After repair (showing resolution)
5. Click **"Submit"**

Alert moves to "Completed" status and vehicle is marked as available.

---

## 5. Logging Repairs

### Creating a Repair Log Entry

**Step-by-Step:**

1. Navigate to **Maintenance > Repair Log**
2. Click **"New Repair Entry"**
3. Select **Vehicle** (search by plate or name)
4. Enter **Odometer Reading** (current)
5. Select **Repair Category:**
   - Engine
   - Transmission
   - Brakes
   - Suspension
   - Electrical
   - Body/Paint
   - Tires
   - Fluids
   - Other

6. Enter **Detailed Description:**
   - What was the problem?
   - What caused it?
   - What was done to fix it?
   - Example: "Replaced front brake pads due to excessive wear (2mm remaining). Also resurfaced rotors which had minor grooves."

7. **Parts Used:**
   - Click "Add Part"
   - Search and select part from inventory
   - Enter quantity
   - System auto-fills cost
   - Repeat for all parts

8. **Labor Information:**
   - Start time (when work began)
   - End time (when work completed)
   - System calculates hours
   - Labor rate (auto-filled based on job type)

9. **Total Cost:**
   - System auto-calculates: Parts + Labor
   - Add any additional costs (towing, outsourced work, etc.)

10. **Photos/Documents:**
    - Upload photos (before, during, after)
    - Attach receipts or invoices
    - Add diagnostic reports

11. **Next Service Recommendation:**
    - When should next related service be performed?
    - Example: "Next brake inspection at 85,000 km"

12. **Technician Notes:**
    - Any observations
    - Recommendations
    - Future concerns

13. Click **"Save Repair Log"**

### Repair Log Best Practices

**Be Specific:**
- ❌ Bad: "Fixed brakes"
- ✅ Good: "Replaced front brake pads (both sides) and resurfaced rotors. Brake fluid flushed and replaced. Test drive confirmed proper operation."

**Include Measurements:**
- Tire tread depth (mm)
- Brake pad thickness (mm)
- Fluid levels (ml or %)
- Torque specifications (Nm)

**Document Everything:**
- Take photos before starting work
- Photo of damaged parts removed
- Photo of new parts installed
- Photo of final result

---

## 6. Preventive Maintenance

### Maintenance Schedules

The system tracks multiple maintenance schedules per vehicle:

**Oil & Filters:**
- Oil change: Every 5,000 km or 6 months
- Oil filter: With each oil change
- Air filter: Every 15,000 km or yearly
- Cabin filter: Every 20,000 km or yearly

**Fluids:**
- Coolant: Every 40,000 km or 2 years
- Brake fluid: Every 2 years
- Transmission fluid: Every 60,000 km
- Power steering fluid: Check monthly, change as needed

**Tires:**
- Tire rotation: Every 10,000 km
- Tire replacement: Based on tread depth (<3mm)
- Wheel alignment: Every 20,000 km or if pulling
- Balance: With each rotation

**Brakes:**
- Inspection: Every 10,000 km
- Pad replacement: When <3mm thickness
- Rotor resurfacing/replacement: As needed
- Brake fluid: Every 2 years

**Battery:**
- Test: Every 6 months
- Clean terminals: Every service
- Replacement: Every 3-4 years or when failing tests

**Belts & Hoses:**
- Serpentine belt: Inspect every service, replace every 60,000 km
- Timing belt: Per manufacturer spec (often 100,000 km)
- Hoses: Inspect for cracks/leaks every service

### Performing Preventive Maintenance

**Workflow:**

1. **Review Schedule:**
   - Navigate to **Maintenance > Scheduled**
   - View vehicles due for service this week
   - Prioritize by:
     - How overdue (days past due date)
     - Vehicle usage (high-use vehicles first)
     - Upcoming trips assigned

2. **Check Parts Availability:**
   - Verify you have required parts in stock
   - Order missing parts (see Parts section)
   - Wait for delivery if necessary

3. **Coordinate with Dispatcher:**
   - Inform when vehicle will be unavailable
   - Estimated completion time
   - They'll adjust trip assignments

4. **Perform Service:**
   - Follow manufacturer's service procedures
   - Use proper tools and equipment
   - Test all systems after service
   - Clean vehicle (basic wash)

5. **Log Service:**
   - Record all work performed
   - Update next service due dates
   - System auto-calculates based on mileage/time
   - Mark as complete

6. **Return to Service:**
   - Final inspection
   - Test drive if needed
   - Notify dispatcher vehicle is ready
   - Update vehicle status to "Available"

### Service Checklists

**Basic Service (5,000 km):**
- ✅ Change engine oil
- ✅ Replace oil filter
- ✅ Check/top off all fluids
- ✅ Inspect brakes (visual)
- ✅ Check tire pressure and condition
- ✅ Inspect lights (all functioning)
- ✅ Test horn
- ✅ Check wipers
- ✅ Inspect belts and hoses
- ✅ Reset service reminder

**Major Service (20,000 km):**
- Everything in Basic Service PLUS:
- ✅ Replace air filter
- ✅ Replace cabin filter
- ✅ Rotate tires
- ✅ Inspect suspension components
- ✅ Check battery (load test)
- ✅ Inspect exhaust system
- ✅ Lubricate door hinges and locks
- ✅ Check alignment
- ✅ Inspect brake pads/rotors (measure)
- ✅ Road test

---

## 7. Vehicle Inspections

### Pre-Trip Inspection Review

Although drivers perform daily inspections, you should review driver-reported issues:

1. Navigate to **Maintenance > Inspection Reports**
2. Filter by: "Requires Attention"
3. Review each issue reported by drivers:
   - Minor issues: Log for next scheduled service
   - Moderate issues: Schedule repair within week
   - Major issues: Take vehicle offline immediately

### Annual Safety Inspection

**Required Once Per Year for All Vehicles:**

**Comprehensive Inspection Includes:**

**1. Lighting System:**
- Headlights (low/high beam)
- Turn signals (front/rear)
- Brake lights
- Reverse lights
- Hazard flashers
- License plate lights
- Interior lights

**2. Braking System:**
- Brake pedal feel and travel
- Parking brake hold
- Brake pad thickness (all wheels)
- Rotor condition
- Brake lines (no leaks or corrosion)
- Brake fluid level and condition
- ABS functionality (if equipped)

**3. Steering & Suspension:**
- Steering wheel play (max 2 inches)
- Power steering fluid level
- Ball joints and tie rods
- Shock absorbers/struts
- Springs
- Control arms and bushings

**4. Tires & Wheels:**
- Tread depth (minimum 3mm)
- Sidewall condition (no cracks, bulges)
- Tire pressure (manufacturer spec)
- Wheel bearings (no play)
- Lug nuts torque

**5. Engine & Drivetrain:**
- Engine starts easily
- Idles smoothly
- No unusual noises
- No fluid leaks
- Transmission shifts properly
- Clutch operation (manual)
- Exhaust system (no holes, leaks)

**6. Electrical:**
- Battery voltage (12.6V or higher)
- Alternator output (13.5-14.5V running)
- All gauges functioning
- Warning lights work at startup
- Horn operation

**7. Body & Structure:**
- Doors open/close properly
- Hood and trunk latches work
- Mirrors secure and adjustable
- Windows operate smoothly
- Seat belts (all positions)
- Windshield (no cracks in driver view)
- Wipers effective

**8. Safety Equipment:**
- First aid kit present and stocked
- Fire extinguisher (charged, not expired)
- Warning triangle
- Spare tire (proper pressure)
- Jack and tools

### Documenting Inspections

After completing inspection:

1. In the system, navigate to **Maintenance > Inspections**
2. Click **"New Inspection"**
3. Select **Inspection Type** (Annual Safety, Pre-Trip Review, etc.)
4. Select **Vehicle**
5. Go through each inspection item:
   - Mark as "Pass" or "Fail"
   - Add notes for any failures
   - Upload photos of issues
6. **Overall Result:**
   - ✅ **Pass:** Vehicle safe for operation
   - ❌ **Fail:** Vehicle unsafe, needs repairs before operation
   - ⚠️ **Pass with Advisories:** Safe now, but issues need attention soon
7. Enter **Next Inspection Due Date**
8. Print and attach physical inspection certificate to vehicle
9. Click **"Submit Inspection"**

**For Failed Inspections:**
- Vehicle automatically marked as "Out of Service"
- Dispatcher notified
- Work order created for required repairs
- Re-inspection required after repairs

---

## 8. Parts and Inventory

### Viewing Inventory

Navigate to **Maintenance > Parts Inventory** to see:

- **All parts** in stock
- **Quantity on hand**
- **Reorder level** (system alerts when below this)
- **Location** (shelf/bin number)
- **Cost per unit**
- **Total value**

### Adding Parts to Inventory

**When receiving new parts:**

1. Click **"Receive Parts"**
2. Enter:
   - Part name/description
   - Part number (manufacturer)
   - Category (Engine, Brake, Electrical, etc.)
   - Quantity received
   - Unit cost
   - Supplier
   - Purchase order number
3. Assign **Storage Location**
4. Set **Reorder Level** (when to order more)
5. Set **Reorder Quantity** (how many to order)
6. Click **"Add to Inventory"**

### Ordering Parts

**When parts reach reorder level:**

1. System generates alert: "Low Stock: [Part Name]"
2. Navigate to **Maintenance > Order Parts**
3. Review parts flagged for reorder
4. Select parts to order
5. Choose **Supplier** (dropdown of approved vendors)
6. Enter **Quantity**
7. System shows **Estimated Cost**
8. Add **Notes** (urgency, special instructions)
9. Click **"Submit Order"**
10. System generates **Purchase Order** (PO)
11. PO sent to procurement/admin for approval and processing

### Using Parts

**When using parts during repairs:**

1. While logging repair (see Repair Log section)
2. Click **"Add Part"**
3. Search inventory for part
4. Select part
5. Enter **Quantity Used**
6. System automatically:
   - Deducts from inventory
   - Adds cost to repair total
   - Tracks part usage by vehicle

**If part not in inventory:**
- You can add "one-time" part with manual cost entry
- System suggests adding to permanent inventory

---

## 9. Work Orders

### Creating a Work Order

Work orders formalize repair jobs:

1. Navigate to **Maintenance > Work Orders**
2. Click **"New Work Order"**
3. Enter details:
   - **Vehicle**
   - **Odometer Reading**
   - **Priority:** Critical, High, Medium, Low
   - **Category:** Repair, Preventive Maintenance, Inspection
   - **Requested By:** Driver name, Dispatcher, System Alert
   - **Problem Description:** What needs to be done?
   - **Estimated Duration:** Hours
   - **Estimated Cost:** Parts + Labor

4. **Assign Mechanic** (yourself or colleague)
5. **Schedule:**
   - Start date/time
   - Due date/time
6. Click **"Create Work Order"**

### Working on a Work Order

**To start work:**

1. Open the work order
2. Click **"Start Work"**
3. System records start time
4. Perform repairs
5. Log parts used
6. Log labor hours

**While working:**
- Update **Status:**
  - Waiting for Parts
  - In Progress
  - Testing
  - Complete
- Add **Notes** as you work
- Upload **Photos**
- If you discover additional issues:
  - Add to work order
  - Update estimated cost
  - Notify dispatcher if vehicle will be delayed

**Upon completion:**

1. Click **"Complete Work Order"**
2. Enter **Final Details:**
   - Total parts cost
   - Total labor hours
   - Final odometer reading
3. Add **Completion Notes:**
   - Summary of work performed
   - Test results
   - Any concerns or recommendations
4. Upload final photos
5. Click **"Submit"**

Work order moves to "Completed" and vehicle returns to "Available" status.

### Work Order Reports

Generate reports on:

- Work orders completed (by date range)
- Average time to complete
- Cost per vehicle
- Most common repairs
- Vehicle downtime

Navigate to **Maintenance > Reports > Work Order Summary**

---

## 10. Reporting

### Available Reports

**1. Maintenance Cost Report**
- Total maintenance costs by vehicle
- Cost per kilometer
- Parts vs labor breakdown
- Trend over time (increasing costs = aging vehicle)

**2. Vehicle Downtime Report**
- Days vehicle unavailable due to maintenance
- Percentage of time in service vs. repair
- Vehicles with excessive downtime (candidates for retirement)

**3. Parts Usage Report**
- Most frequently used parts
- Cost of parts over time
- Parts with frequent failures (quality issues?)

**4. Mechanic Performance Report**
- Work orders completed per mechanic
- Average completion time
- Quality metrics (re-work rate)

**5. Preventive Maintenance Compliance**
- Services completed on time vs. overdue
- Vehicles with skipped services
- Compliance percentage

### Generating Reports

1. Navigate to **Maintenance > Reports**
2. Select report type
3. Choose date range
4. Apply filters (vehicle, mechanic, category)
5. Click **"Generate Report"**
6. View on screen or download PDF/Excel

---

## 11. Best Practices

### Daily Routine

**Start of Day:**
- ✅ Check critical alerts (red items)
- ✅ Review scheduled maintenance due this week
- ✅ Verify parts inventory for today's work
- ✅ Coordinate with dispatcher on vehicle availability

**Throughout Day:**
- ✅ Log all work as you complete it (don't wait until end of day)
- ✅ Update work order status regularly
- ✅ Take photos (before, during, after)
- ✅ Communicate delays immediately

**End of Day:**
- ✅ Complete any pending logs
- ✅ Clean work area
- ✅ Update tomorrow's schedule
- ✅ Order any parts needed for tomorrow
- ✅ Review alerts one more time

### Documentation Tips

**Be Detailed:**
- Record exact measurements
- Note part numbers
- Include torque specifications
- Describe symptoms before and after

**Use Photos:**
- Damaged parts before removal
- New parts before installation
- Final result
- Proof of proper work

**Think Ahead:**
- Note when next related service should be done
- Flag potential future issues
- Recommend preventive actions

### Safety First

**Personal Safety:**
- ✅ Wear safety glasses when grinding, drilling
- ✅ Use jack stands (never just hydraulic jack)
- ✅ Wear gloves when handling chemicals
- ✅ Use proper lifting techniques
- ✅ Keep work area clean (no tripping hazards)

**Vehicle Safety:**
- ✅ Test drive after any brake or steering work
- ✅ Double-check all fasteners torqued properly
- ✅ Verify no tools left in engine bay
- ✅ Clear all warning lights before returning to service
- ✅ If in doubt, ask for second opinion

---

## 12. Troubleshooting Guide

### Common Issues and Solutions

**Issue: Check Engine Light On**

1. **Connect diagnostic scanner**
2. **Read trouble codes**
3. **Common codes:**
   - P0420: Catalytic converter efficiency low
   - P0171/P0174: Fuel system lean
   - P0300-P0306: Cylinder misfire
   - P0440: EVAP system leak
4. **Research code** (use online database or manual)
5. **Diagnose root cause** (don't just clear code!)
6. **Repair issue**
7. **Clear code and test drive**
8. **Verify code doesn't return**

**Issue: Vehicle Won't Start**

**Check:**
1. Battery voltage (should be 12.4V or higher)
2. Battery terminals (clean and tight?)
3. Turn key - what happens?
   - Nothing: Battery, starter, or ignition switch
   - Click: Starter solenoid or bad connection
   - Cranks but won't fire: Fuel or spark issue

**Issue: Overheating**

**Check:**
1. Coolant level (low?)
2. Coolant leaks (look under vehicle, check hoses)
3. Radiator fan (running when hot?)
4. Thermostat stuck closed (feel upper/lower radiator hoses)
5. Water pump (listen for noise, check for leaks)
6. Head gasket (white smoke from exhaust? coolant in oil?)

**Issue: Brake Problems**

**Symptoms and Causes:**
- Squealing: Brake wear indicators, worn pads
- Grinding: Pads completely worn, metal-to-metal
- Pulsing pedal: Warped rotors
- Soft pedal: Air in brake lines, leak, worn master cylinder
- Hard pedal: Vacuum leak, bad brake booster
- Pulling to one side: Stuck caliper, contaminated pad, air in line

**Issue: Electrical Problems**

**If multiple electrical issues:**
1. Check battery voltage and connections
2. Check alternator output (should be 13.5-14.5V running)
3. Check main fuses
4. Check ground connections

**Issue: Suspension Noise**

**Common sources:**
- Clunking: Worn ball joints, bad bushings, loose control arm
- Squeaking: Dry/worn bushings, bad strut mounts
- Rattling: Worn sway bar links, loose exhaust

**Test:** Drive over speed bump slowly - when does noise occur?
- On compression: Struts/shocks
- On rebound: Springs, mounts
- Turning: CV joints, ball joints

---

## Appendix

### Torque Specifications (Common)

| Component | Torque (Nm) |
|-----------|-------------|
| Wheel lug nuts | 100-120 |
| Oil drain plug | 30-35 |
| Spark plugs | 20-25 |
| Caliper bolts | 80-100 |

⚠️ **Always consult vehicle-specific service manual for exact specifications.**

### Fluid Capacities (Typical Sedan)

| Fluid | Capacity |
|-------|----------|
| Engine oil | 4-5 liters |
| Coolant | 8-10 liters |
| Transmission | 4-6 liters |
| Brake fluid | 0.5-1 liter |
| Power steering | 1 liter |

### Measurement Conversions

| From | To | Multiply by |
|------|----|----|
| Inches | mm | 25.4 |
| PSI | kPa | 6.895 |
| ft-lb | Nm | 1.356 |
| Miles | km | 1.609 |
| Gallons | Liters | 3.785 |

### Contact Information

**Technical Support:**
- Email: support@messob.et
- Phone: +251 11 123 4567
- Mobile: +251 91 234 5678

**Parts Supplier:**
- Email: parts@supplier.et
- Phone: +251 11 456 7890

**Fleet Manager:**
- Email: fleetmanager@messob.et
- Phone: +251 11 789 0123
- Location: MESSOB Center, Addis Ababa

---

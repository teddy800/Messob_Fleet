# MESSOB Fleet Management System
## System Architecture Documentation

**Version:** 1.1.0  
**Last Updated:** June 2026  
**For:** System Administrators and Technical Team

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Component Architecture](#component-architecture)
5. [Database Schema](#database-schema)
6. [API Architecture](#api-architecture)
7. [Authentication & Authorization](#authentication--authorization)
8. [Real-Time Features](#real-time-features)
9. [Integration Points](#integration-points)
10. [Scalability Considerations](#scalability-considerations)
11. [Security Architecture](#security-architecture)

---

## 1. Overview

The MESSOB Fleet Management System is a full-stack web application built to manage organizational vehicle fleets efficiently. The system follows a modern three-tier architecture:

- **Frontend:** React-based SPA (Single Page Application)
- **Backend:** Odoo Framework with Python
- **Database:** PostgreSQL

### Key Features

- Trip request management with approval workflows
- Real-time GPS tracking of vehicles
- Maintenance scheduling and alerting
- Fuel consumption monitoring
- Driver assignment and performance tracking
- Role-based access control
- Mobile-responsive design

---

## 2. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Web App    │  │  Driver App  │  │  Admin Panel │     │
│  │   (React)    │  │   (React)    │  │   (React)    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Odoo Framework (Python)                  │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐       │  │
│  │  │ Controllers│ │  Business  │ │    Models   │       │  │
│  │  │  (Routes)  │ │   Logic    │ │   (ORM)     │       │  │
│  │  └────────────┘ └────────────┘ └────────────┘       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                       DATA LAYER                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            PostgreSQL Database                        │  │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │  │
│  │  │  Users  │ │ Vehicles │ │  Trips   │ │  GPS    │ │  │
│  │  └─────────┘ └──────────┘ └──────────┘ └─────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Architecture

```
                        ┌─────────────┐
                        │   Nginx     │
                        │ (Reverse    │
                        │  Proxy)     │
                        └──────┬──────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
         ┌──────▼──────┐              ┌──────▼──────┐
         │    React    │              │    Odoo     │
         │   Frontend  │              │   Backend   │
         │   (Static)  │              │  (Python)   │
         └─────────────┘              └──────┬──────┘
                                             │
                                      ┌──────▼──────┐
                                      │  PostgreSQL │
                                      │   Database  │
                                      └─────────────┘
```

---

## 3. Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.2+ | UI framework |
| **Vite** | 4.0+ | Build tool |
| **React Router** | 6.0+ | Client-side routing |
| **Zustand** | 4.0+ | State management |
| **TailwindCSS** | 3.0+ | Styling |
| **Shadcn/UI** | Latest | Component library |
| **Leaflet** | 1.9+ | Map rendering |
| **React Leaflet** | 4.0+ | React bindings for Leaflet |
| **Axios** | 1.0+ | HTTP client |
| **Date-fns** | 2.0+ | Date manipulation |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Odoo** | 16.0 | Application framework |
| **Python** | 3.10+ | Programming language |
| **PostgreSQL** | 14+ | Database |
| **XML-RPC** | Built-in | API protocol |
| **JSON-RPC** | Built-in | API protocol |
| **WebSocket** | Via library | Real-time communication |

### Infrastructure

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Web Server** | Nginx | Reverse proxy, static files |
| **App Server** | Gunicorn/Gevent | WSGI server |
| **Database** | PostgreSQL | Data persistence |
| **Cache** | Redis (optional) | Session caching |
| **File Storage** | Local/S3 | Document storage |

---

## 4. Component Architecture

### Frontend Components

```
src/
├── components/
│   ├── layouts/          # Page layouts
│   │   └── DashboardLayout.jsx
│   └── shared/           # Reusable components
│       ├── Sidebar.jsx
│       ├── HelpSystem.jsx
│       └── UserAvatar.jsx
├── features/             # Feature modules
│   ├── auth/            # Authentication
│   ├── requests/        # Trip requests
│   ├── dispatch/        # Dispatcher functions
│   ├── tracking/        # GPS tracking
│   ├── driver/          # Driver functions
│   ├── mechanic/        # Maintenance
│   └── admin/           # Administration
├── store/               # State management
│   ├── useUserStore.js
│   └── useTripStore.js
├── utils/               # Utilities
│   ├── odooApi.js
│   └── helpers.js
└── App.jsx              # Root component
```

### Backend Components

```
addons/messob_fleet/
├── models/              # Data models (ORM)
│   ├── trip_request.py
│   ├── fms_driver.py
│   ├── gps_position.py
│   ├── fuel_log.py
│   └── maintenance_alert.py
├── controllers/         # API endpoints
│   ├── jwt_auth.py
│   ├── gps_webhook.py
│   ├── route_tracking.py
│   └── analytics_api.py
├── services/            # Business logic
│   ├── geocoding_service.py
│   ├── routing_service.py
│   └── sms_service.py
├── data/                # Initial data & cron jobs
│   ├── sequences.xml
│   └── gps_cron.xml
├── security/            # Access control
│   ├── groups.xml
│   └── ir.model.access.csv
└── __manifest__.py      # Module definition
```

---

## 5. Database Schema

### Core Tables

#### users
- id (Primary Key)
- email (Unique)
- password_hash
- role (Staff, Dispatcher, Driver, Maintainer, Admin)
- department_id (Foreign Key)
- created_at

#### trip_requests
- id (Primary Key)
- requester_id (Foreign Key → users)
- purpose (Text)
- vehicle_category (Enum)
- passenger_count (Integer)
- start_date (DateTime)
- end_date (DateTime)
- pickup_location (Text)
- destination (Text)
- status (Enum: pending, approved, in_progress, completed, cancelled)
- vehicle_id (Foreign Key → vehicles)
- driver_id (Foreign Key → drivers)
- priority_score (Float)
- created_at

#### vehicles
- id (Primary Key)
- name (String)
- license_plate (Unique)
- vehicle_type (Enum)
- capacity (Integer)
- status (Enum: available, assigned, maintenance, retired)
- odometer (Integer km)
- fuel_level (Float %)
- last_service_date
- next_service_due

#### gps_positions
- id (Primary Key)
- device_id (Foreign Key → gps_devices)
- vehicle_id (Foreign Key → vehicles)
- trip_id (Foreign Key → trip_requests)
- latitude (Float)
- longitude (Float)
- speed (Float km/h)
- heading (Float degrees)
- altitude (Float meters)
- timestamp (DateTime)
- ignition_status (Boolean)

#### fuel_logs
- id (Primary Key)
- vehicle_id (Foreign Key)
- driver_id (Foreign Key)
- date (DateTime)
- odometer_reading (Integer)
- fuel_amount (Float liters)
- cost (Float)
- fuel_station (String)
- receipt_image_url

#### maintenance_alerts
- id (Primary Key)
- vehicle_id (Foreign Key)
- alert_type (Enum)
- priority (critical, warning, scheduled)
- description (Text)
- created_at
- resolved_at
- resolved_by (Foreign Key → users)

### Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────┐       ┌────────────┐
│    Users    │──────<│Trip Requests │>──────│  Vehicles  │
└─────────────┘       └──────────────┘       └────────────┘
      │                       │                      │
      │                       │                      │
      │                       ▼                      ▼
      │              ┌────────────────┐    ┌─────────────────┐
      │              │ GPS Positions  │    │ Maintenance     │
      │              └────────────────┘    │ Alerts          │
      │                                     └─────────────────┘
      ▼
┌─────────────┐
│  Fuel Logs  │
└─────────────┘
```

---

## 6. API Architecture

### Authentication Flow

```
1. User Login
   POST /api/auth/login
   { email, password }
   →
2. Server validates credentials
   →
3. Generate JWT token
   →
4. Return token to client
   { token, user }
   →
5. Client stores token (localStorage)
   →
6. Subsequent requests include token
   Authorization: Bearer <token>
```

### API Endpoints Structure

**Base URL:** `/api/v1/`

#### Authentication
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/refresh` - Refresh JWT token
- `GET /auth/me` - Get current user info

#### Trip Requests
- `GET /requests` - List trip requests (filtered by role)
- `POST /requests` - Create new trip request
- `GET /requests/{id}` - Get request details
- `PUT /requests/{id}` - Update request
- `DELETE /requests/{id}` - Cancel request
- `POST /requests/{id}/approve` - Approve (dispatcher only)
- `POST /requests/{id}/reject` - Reject (dispatcher only)

#### GPS Tracking
- `GET /gps/positions` - Get recent positions
- `POST /gps/webhook` - Receive GPS data (from devices)
- `GET /gps/trip/{trip_id}` - Get positions for a trip
- `GET /gps/vehicle/{vehicle_id}` - Get vehicle's current location

#### Vehicles
- `GET /vehicles` - List all vehicles
- `GET /vehicles/available` - List available vehicles
- `GET /vehicles/{id}` - Get vehicle details
- `PUT /vehicles/{id}` - Update vehicle info

#### Maintenance
- `GET /maintenance/alerts` - List maintenance alerts
- `POST /maintenance/alerts/{id}/complete` - Mark alert complete
- `POST /maintenance/repair-log` - Log a repair
- `GET /maintenance/schedule` - Get maintenance schedule

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... }
  }
}
```

---

## 7. Authentication & Authorization

### JWT Token Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "user_id": 123,
    "email": "user@messob.et",
    "role": "Staff",
    "department": "HR",
    "exp": 1698765432,
    "iat": 1698679032
  },
  "signature": "..."
}
```

### Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| **Staff** | Create trip requests, view own requests, track own trips |
| **Dispatcher** | View all requests, approve/reject requests, assign vehicles/drivers, view fleet calendar, real-time monitoring |
| **Driver** | View assigned trips, start/complete trips, log fuel, report issues |
| **Maintainer** | View maintenance alerts, log repairs, manage parts inventory, conduct inspections |
| **Admin** | Full system access, user management, system configuration, view all reports |

### Permission Checks

**Frontend:**
```javascript
// Component-level
<RoleGuard allowedRoles={["Dispatcher", "Admin"]}>
  <ApprovalQueue />
</RoleGuard>

// Hook-level
const canApprove = usePermission('approve_requests');
```

**Backend:**
```python
# Decorator-based
@require_role(['Dispatcher', 'Admin'])
def approve_request(self, request_id):
    # Logic here
    pass
```

---

## 8. Real-Time Features

### WebSocket Architecture

```
┌─────────────┐                    ┌─────────────┐
│   Client    │<──── WebSocket ────>│   Server    │
└─────────────┘                    └─────────────┘
       │                                   │
       │  1. Connect & authenticate        │
       │──────────────────────────────────>│
       │                                   │
       │  2. Subscribe to channels         │
       │──────────────────────────────────>│
       │     (trips, vehicles, alerts)     │
       │                                   │
       │  3. Receive real-time updates     │
       │<──────────────────────────────────│
       │     (GPS positions, status        │
       │      changes, notifications)      │
```

### Real-Time Events

**GPS Updates:**
- Frequency: Every 5 seconds
- Data: Position, speed, heading, ignition status
- Channels: `gps:vehicle:{id}`, `gps:trip:{id}`

**Trip Status Updates:**
- Trigger: Status change (approved, started, completed)
- Channels: `trip:{id}`, `user:{id}:trips`

**Maintenance Alerts:**
- Trigger: New alert generated
- Channels: `maintenance:alerts`, `vehicle:{id}:alerts`

---

## 9. Integration Points

### External Services

#### Geocoding Service (Nominatim/Google Maps)
- **Purpose:** Convert addresses to coordinates
- **Integration:** HTTP REST API
- **Caching:** Results cached in database

#### SMS Service
- **Purpose:** Send notifications to drivers/staff
- **Integration:** SMS gateway API
- **Triggers:** Trip assignments, approvals, alerts

#### GPS Device API
- **Purpose:** Receive location data from GPS devices
- **Integration:** Webhook endpoint
- **Protocol:** HTTP POST with JSON payload

### Integration Flow Example (GPS Data)

```
1. GPS Device collects position data
   ↓
2. Device sends HTTP POST to webhook
   POST /api/gps/webhook
   { device_id, lat, lng, speed, ... }
   ↓
3. Server validates device_id
   ↓
4. Server stores position in database
   ↓
5. Server broadcasts to WebSocket clients
   ↓
6. Frontend updates map in real-time
```

---

## 10. Scalability Considerations

### Horizontal Scaling

**Application Tier:**
- Multiple Odoo instances behind load balancer
- Stateless design (JWT tokens, no sessions)
- Shared file storage (NFS or S3)

**Database Tier:**
- Read replicas for reporting queries
- Connection pooling (PgBouncer)
- Regular vacuum and indexing

### Caching Strategy

**Redis Cache:**
- User sessions (optional)
- Frequently accessed data (vehicle lists, driver lists)
- Geocoding results (addresses → coordinates)
- TTL: 5-60 minutes depending on data type

### Performance Optimization

**Frontend:**
- Code splitting by route
- Lazy loading of components
- Image optimization
- Service worker for offline capability

**Backend:**
- Database query optimization (proper indexes)
- Batch processing for GPS data
- Asynchronous tasks (Celery) for heavy operations
- API response caching

### Load Handling

**Expected Load:**
- 200 concurrent users
- 50 active GPS devices (5-second intervals)
- 1,000 trip requests per day

**Capacity Planning:**
- App Server: 4 CPU, 8GB RAM (per instance)
- Database: 8 CPU, 16GB RAM
- Storage: 500GB initial, scalable

---

## 11. Security Architecture

### Data Protection

**In Transit:**
- TLS 1.2+ for all HTTPS connections
- WSS (WebSocket Secure) for real-time data
- API key authentication for GPS devices

**At Rest:**
- Database encryption (PostgreSQL TDE)
- Password hashing (bcrypt, cost=12)
- Sensitive fields encrypted (e.g., personal data)

### Security Best Practices

1. **Input Validation:**
   - All user inputs sanitized
   - SQL injection prevention (ORM)
   - XSS prevention (React escaping)

2. **Authentication:**
   - JWT tokens with expiration
   - Secure password requirements
   - Account lockout after failed attempts

3. **Authorization:**
   - Role-based access control
   - Resource-level permissions
   - Audit logging

4. **API Security:**
   - Rate limiting (100 requests/minute)
   - CORS configuration
   - Request size limits

### Audit Logging

All sensitive operations logged:
- User login/logout
- Trip request approvals/rejections
- Vehicle assignments
- Data modifications (who, what, when)

---

## Appendix

### Technology Decisions

| Decision | Reason |
|----------|--------|
| **React** | Modern, component-based, large ecosystem |
| **Odoo** | Built-in fleet management features, mature framework |
| **PostgreSQL** | Robust, geospatial support (PostGIS), proven |
| **JWT** | Stateless authentication, mobile-friendly |
| **Leaflet** | Open-source, lightweight, customizable maps |

### System Requirements

**Minimum:**
- CPU: 2 cores
- RAM: 4GB
- Storage: 100GB
- Network: 10 Mbps

**Recommended:**
- CPU: 4-8 cores
- RAM: 16GB
- Storage: 500GB SSD
- Network: 100 Mbps

---

**Document Version:** 1.1.0  
**Last Reviewed:** June 2026  
**Next Review:** December 2026  

© 2026 MESSOB Center. All rights reserved.

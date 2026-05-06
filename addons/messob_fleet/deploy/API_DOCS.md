# MESSOB FMS — REST API Documentation
**Base URL:** `https://your-domain.com/api/fms/v1`

---

## Authentication

### Login
```
POST /api/fms/v1/auth/login
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "call",
  "params": {
    "login": "staff@messob.org",
    "password": "yourpassword"
  }
}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "uid": 5,
    "name": "John Doe",
    "email": "staff@messob.org",
    "role": "staff",
    "session_id": "abc123..."
  }
}
```
Save the `session_id` and send it as a cookie in all future requests.

---

## Trip Requests (Staff)

### Get my trips
```
GET /api/fms/v1/trips
GET /api/fms/v1/trips?state=pending
GET /api/fms/v1/trips?state=approved
```

### Get single trip
```
GET /api/fms/v1/trips/42
```

### Create new trip
```
POST /api/fms/v1/trips
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "call",
  "params": {
    "purpose": "Official meeting at Bole branch",
    "vehicle_category": "sedan",
    "start_dt": "2026-05-10 08:00:00",
    "end_dt": "2026-05-10 12:00:00",
    "pickup": "MESSOB HQ",
    "destination": "Addis Ababa / Bole / Bole-Bulbula"
  }
}
```

### Cancel a trip
```
POST /api/fms/v1/trips/42/cancel
```

### Trip state values
| Value | Meaning |
|-------|---------|
| `draft` | Not submitted |
| `pending` | Waiting for dispatcher |
| `approved` | Approved, vehicle assigned |
| `rejected` | Rejected by dispatcher |
| `in_progress` | Trip underway |
| `completed` | Trip done |

### Vehicle category values
`sedan` `suv` `pickup` `bus` `minibus`

---

## Dispatcher Endpoints

### Get pending requests
```
GET /api/fms/v1/dispatcher/pending
```

### Approve a trip
```
POST /api/fms/v1/dispatcher/trips/42/approve
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "call",
  "params": {
    "vehicle_id": 3,
    "driver_id": 7,
    "fuel_status": "full"
  }
}
```

### Reject a trip
```
POST /api/fms/v1/dispatcher/trips/42/reject
```

### Get available vehicles for a time window
```
GET /api/fms/v1/dispatcher/available-vehicles?start=2026-05-10 08:00:00&end=2026-05-10 12:00:00
```
**Response:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Toyota Corolla", "plate": "AA-1234", "model": "Corolla" },
    { "id": 2, "name": "Toyota Hiace",   "plate": "AA-5678", "model": "Hiace" }
  ]
}
```

### Get available drivers for a time window
```
GET /api/fms/v1/dispatcher/available-drivers?start=2026-05-10 08:00:00&end=2026-05-10 12:00:00
```

---

## Locations (Autocomplete)

### Search locations
```
GET /api/fms/v1/locations
GET /api/fms/v1/locations?q=bole
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Bole-Bulbula",
      "area": "Bole",
      "city": "Addis Ababa",
      "full_name": "Addis Ababa / Bole / Bole-Bulbula",
      "lat": 8.9806,
      "lng": 38.7578
    }
  ]
}
```

---

## Error Responses
```json
{ "success": false, "error": "Access denied" }
{ "success": false, "error": "Trip not found" }
{ "success": false, "error": "Invalid credentials" }
```

---

## Frontend Integration Example (JavaScript)

```javascript
const API = 'https://your-domain.com/api/fms/v1';

// Login
async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',   // important: saves session cookie
    body: JSON.stringify({
      jsonrpc: '2.0', method: 'call',
      params: { login: email, password }
    })
  });
  return res.json();
}

// Get my trips
async function getMyTrips(state = null) {
  const url = state ? `${API}/trips?state=${state}` : `${API}/trips`;
  const res = await fetch(url, { credentials: 'include' });
  return res.json();
}

// Create a trip
async function createTrip(data) {
  const res = await fetch(`${API}/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: data })
  });
  return res.json();
}

// Search locations (autocomplete)
async function searchLocations(query) {
  const res = await fetch(`${API}/locations?q=${query}`, { credentials: 'include' });
  return res.json();
}
```

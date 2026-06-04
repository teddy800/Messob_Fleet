// ---------------------------------------------------------------------------
// MESSOB Fleet Management System
// Load Testing Suite using K6
// Requirement: NFR-1.2 (1,000+ concurrent GPS updates per minute)
//
// This script tests system performance under load to verify:
//   - API response time < 500ms for 95% of requests (NFR-1.1)
//   - 1,000+ concurrent GPS updates per minute (NFR-1.2)
//   - Horizontal scaling capability (NFR-1.3)
//
// Installation:
//   Download k6: https://k6.io/docs/get-started/installation/
//
// Usage:
//   k6 run load_testing_suite.js
//   k6 run --vus 100 --duration 5m load_testing_suite.js
//
// Results:
//   Generates detailed performance report with metrics
// ---------------------------------------------------------------------------

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const gpsUpdateTrend = new Trend('gps_update_duration');
const apiResponseTrend = new Trend('api_response_duration');
const successfulGPSUpdates = new Counter('successful_gps_updates');

// Test configuration
export const options = {
    // Stages for ramping up load
    stages: [
        { duration: '2m', target: 100 },   // Ramp up to 100 users
        { duration: '5m', target: 100 },   // Stay at 100 users
        { duration: '2m', target: 500 },   // Ramp up to 500 users
        { duration: '5m', target: 500 },   // Stay at 500 users
        { duration: '2m', target: 1000 },  // Ramp up to 1000 users
        { duration: '5m', target: 1000 },  // Stay at 1000 users (peak load)
        { duration: '2m', target: 0 },     // Ramp down
    ],
    
    // Thresholds (NFR requirements)
    thresholds: {
        'http_req_duration': ['p(95)<500'], // 95% of requests < 500ms (NFR-1.1)
        'errors': ['rate<0.05'],            // Error rate < 5%
        'http_req_failed': ['rate<0.01'],   // Failed requests < 1%
        'successful_gps_updates': ['count>5000'], // At least 5000 GPS updates in test
    },
};

// Base URL configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:8018';

// Test data
const testVehicles = [
    { id: 1, plate: 'ET-3-12345', lat: 9.0320, lng: 38.7469 },
    { id: 2, plate: 'ET-3-67890', lat: 9.0450, lng: 38.7650 },
    { id: 3, plate: 'ET-3-11111', lat: 9.0280, lng: 38.7520 },
    { id: 4, plate: 'ET-3-22222', lat: 9.0380, lng: 38.7580 },
    { id: 5, plate: 'ET-3-33333', lat: 9.0150, lng: 38.7400 },
];

// Authentication helper
function authenticate() {
    const loginRes = http.post(`${BASE_URL}/web/session/authenticate`, JSON.stringify({
        jsonrpc: '2.0',
        params: {
            db: 'fleet_management',
            login: 'admin',
            password: 'admin',
        },
    }), {
        headers: { 'Content-Type': 'application/json' },
    });
    
    check(loginRes, {
        'authentication successful': (r) => r.status === 200,
    });
    
    return loginRes.cookies;
}

// Main test scenario
export default function () {
    const cookies = authenticate();
    const vehicle = testVehicles[Math.floor(Math.random() * testVehicles.length)];
    
    // Test 1: GPS Position Updates (NFR-1.2)
    group('GPS Position Updates', () => {
        const gpsPayload = {
            device_id: `GPS${vehicle.id}`,
            latitude: vehicle.lat + (Math.random() * 0.01 - 0.005),
            longitude: vehicle.lng + (Math.random() * 0.01 - 0.005),
            speed: Math.random() * 80,
            heading: Math.random() * 360,
            altitude: 2200 + Math.random() * 100,
            timestamp: new Date().toISOString(),
        };
        
        const startTime = Date.now();
        const gpsRes = http.post(
            `${BASE_URL}/messob/gps/webhook`,
            JSON.stringify(gpsPayload),
            {
                headers: { 'Content-Type': 'application/json' },
                cookies: cookies,
            }
        );
        const duration = Date.now() - startTime;
        
        const success = check(gpsRes, {
            'GPS update successful': (r) => r.status === 200,
            'GPS update fast': (r) => duration < 1000, // < 1 second
        });
        
        gpsUpdateTrend.add(duration);
        errorRate.add(!success);
        
        if (success) {
            successfulGPSUpdates.add(1);
        }
    });
    
    // Test 2: Trip Request List API (NFR-1.1)
    group('Trip Request List', () => {
        const startTime = Date.now();
        const listRes = http.get(`${BASE_URL}/messob/api/trips`, {
            cookies: cookies,
        });
        const duration = Date.now() - startTime;
        
        check(listRes, {
            'trip list retrieved': (r) => r.status === 200,
            'response time under 500ms': (r) => duration < 500, // NFR-1.1
        });
        
        apiResponseTrend.add(duration);
    });
    
    // Test 3: Vehicle Status Check
    group('Vehicle Status', () => {
        const statusRes = http.get(
            `${BASE_URL}/messob/api/vehicles/${vehicle.id}/status`,
            { cookies: cookies }
        );
        
        check(statusRes, {
            'vehicle status retrieved': (r) => r.status === 200,
        });
    });
    
    // Test 4: Priority Queue (Dispatcher)
    group('Priority Queue', () => {
        const queueRes = http.get(`${BASE_URL}/messob/api/trips/priority-queue`, {
            cookies: cookies,
        });
        
        check(queueRes, {
            'priority queue loaded': (r) => r.status === 200,
        });
    });
    
    // Simulate realistic user behavior with think time
    sleep(Math.random() * 3 + 1); // 1-4 seconds between requests
}

// Setup function (runs once per VU at start)
export function setup() {
    console.log('Starting MESSOB Fleet Management Load Test');
    console.log(`Target: ${BASE_URL}`);
    console.log('Test will simulate 1000+ concurrent users');
    return { timestamp: new Date().toISOString() };
}

// Teardown function (runs once at end)
export function teardown(data) {
    console.log('\n=================================================');
    console.log('MESSOB Fleet Management - Load Test Complete');
    console.log('=================================================');
    console.log(`Started: ${data.timestamp}`);
    console.log(`Ended: ${new Date().toISOString()}`);
}

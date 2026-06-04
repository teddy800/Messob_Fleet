// ---------------------------------------------------------------------------
// MESSOB Fleet Management System
// GPS Stress Test - Focused on NFR-1.2
// 
// Tests: 1,000+ concurrent GPS position updates per minute
// ---------------------------------------------------------------------------

import http from 'k6/http';
import { check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const gpsUpdatesPerMinute = new Counter('gps_updates_per_minute');
const gpsErrorRate = new Rate('gps_errors');
const gpsLatency = new Trend('gps_latency');

export const options = {
    scenarios: {
        gps_flood: {
            executor: 'constant-arrival-rate',
            rate: 20, // 20 updates per second = 1200/minute
            timeUnit: '1s',
            duration: '5m',
            preAllocatedVUs: 50,
            maxVUs: 200,
        },
    },
    thresholds: {
        'gps_updates_per_minute': ['count>5000'],
        'gps_errors': ['rate<0.01'],
        'gps_latency': ['p(95)<1000', 'p(99)<2000'],
    },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8018';

const vehicles = Array.from({ length: 50 }, (_, i) => ({
    device_id: `GPS${String(i + 1).padStart(3, '0')}`,
    base_lat: 9.0320 + (Math.random() * 0.1 - 0.05),
    base_lng: 38.7469 + (Math.random() * 0.1 - 0.05),
}));

export default function () {
    const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
    
    const payload = {
        device_id: vehicle.device_id,
        latitude: vehicle.base_lat + (Math.random() * 0.001 - 0.0005),
        longitude: vehicle.base_lng + (Math.random() * 0.001 - 0.0005),
        speed: Math.random() * 100,
        heading: Math.random() * 360,
        altitude: 2200 + Math.random() * 50,
        accuracy: 5 + Math.random() * 10,
        timestamp: new Date().toISOString(),
        ignition: Math.random() > 0.2,
    };
    
    const startTime = Date.now();
    const res = http.post(
        `${BASE_URL}/messob/gps/webhook`,
        JSON.stringify(payload),
        {
            headers: { 'Content-Type': 'application/json' },
            tags: { name: 'GPSUpdate' },
        }
    );
    const latency = Date.now() - startTime;
    
    const success = check(res, {
        'status 200': (r) => r.status === 200,
        'latency < 1s': () => latency < 1000,
    });
    
    gpsUpdatesPerMinute.add(1);
    gpsErrorRate.add(!success);
    gpsLatency.add(latency);
}

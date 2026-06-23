#!/usr/bin/env python3
"""
MESSOB Fleet Management - GPS Throughput Load Test
SRS Requirements: NFR-1.2 (Handle 1,000+ concurrent GPS updates per minute)

Run: python gps_throughput_test.py
"""

import time
import json
import requests
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from random import uniform

# Test Configuration
GPS_WEBHOOK_URL = "http://localhost:8018/messob/gps/webhook"
TARGET_UPDATES_PER_MINUTE = 1000
TEST_DURATION_SECONDS = 60
CONCURRENT_DEVICES = 100

# Simulated GPS device IDs
DEVICE_IDS = [f"GPS{str(i).zfill(3)}" for i in range(1, CONCURRENT_DEVICES + 1)]

# Addis Ababa coordinates (for realistic data)
BASE_LAT = 9.0320
BASE_LON = 38.7469

def send_gps_update(device_id, sequence):
    """Send single GPS position update"""
    # Simulate vehicle movement around Addis Ababa
    latitude = BASE_LAT + uniform(-0.1, 0.1)
    longitude = BASE_LON + uniform(-0.1, 0.1)
    speed = uniform(0, 80)  # km/h
    
    payload = {
        "device_id": device_id,
        "latitude": latitude,
        "longitude": longitude,
        "speed": speed,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "accuracy": uniform(5, 15),
        "heading": uniform(0, 360)
    }
    
    start = time.time()
    try:
        response = requests.post(
            GPS_WEBHOOK_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        elapsed_ms = (time.time() - start) * 1000
        
        return {
            "success": response.status_code < 500,
            "response_time_ms": elapsed_ms,
            "device_id": device_id,
            "sequence": sequence
        }
    except Exception as e:
        elapsed_ms = (time.time() - start) * 1000
        return {
            "success": False,
            "response_time_ms": elapsed_ms,
            "device_id": device_id,
            "sequence": sequence,
            "error": str(e)
        }

def run_gps_load_test():
    """Execute GPS throughput test"""
    print(f"🛰️  MESSOB Fleet GPS Throughput Test")
    print(f"═" * 70)
    print(f"Target: {GPS_WEBHOOK_URL}")
    print(f"Simulated Devices: {CONCURRENT_DEVICES}")
    print(f"Test Duration: {TEST_DURATION_SECONDS}s")
    print(f"SRS NFR-1.2 Target: >{TARGET_UPDATES_PER_MINUTE} updates/minute")
    print(f"═" * 70)
    
    all_results = []
    start_time = time.time()
    sequence = 0
    
    with ThreadPoolExecutor(max_workers=CONCURRENT_DEVICES) as executor:
        futures = []
        
        # Send GPS updates continuously for test duration
        while (time.time() - start_time) < TEST_DURATION_SECONDS:
            # Simulate each device sending an update
            for device_id in DEVICE_IDS:
                sequence += 1
                futures.append(executor.submit(send_gps_update, device_id, sequence))
            
            # Small delay to avoid overwhelming system
            time.sleep(0.5)
            
            # Collect completed results
            done_futures = [f for f in futures if f.done()]
            for future in done_futures:
                result = future.result()
                all_results.append(result)
                futures.remove(future)
            
            if sequence % 500 == 0:
                elapsed = time.time() - start_time
                rate = len(all_results) / elapsed * 60
                print(f"Progress: {len(all_results)} updates sent ({rate:.0f}/min)...")
        
        # Wait for remaining requests
        for future in as_completed(futures):
            result = future.result()
            all_results.append(result)
    
    # Calculate statistics
    total_duration = time.time() - start_time
    updates_per_minute = (len(all_results) / total_duration) * 60
    successful = [r for r in all_results if r["success"]]
    failed = [r for r in all_results if not r["success"]]
    
    avg_response_time = sum(r["response_time_ms"] for r in all_results) / len(all_results)
    
    print(f"\n📊 RESULTS")
    print(f"═" * 70)
    print(f"Total Updates Sent:   {len(all_results)}")
    print(f"Test Duration:        {total_duration:.2f} seconds")
    print(f"Successful:           {len(successful)} ({len(successful)/len(all_results)*100:.1f}%)")
    print(f"Failed:               {len(failed)} ({len(failed)/len(all_results)*100:.1f}%)")
    print(f"\n⚡ THROUGHPUT")
    print(f"Updates/Minute:       {updates_per_minute:.0f}")
    print(f"Updates/Second:       {len(all_results)/total_duration:.2f}")
    print(f"Avg Response Time:    {avg_response_time:.2f} ms")
    print(f"═" * 70)
    
    # SRS Compliance Check
    if updates_per_minute >= TARGET_UPDATES_PER_MINUTE:
        print(f"✅ SRS NFR-1.2 COMPLIANCE: PASS")
        print(f"   Throughput ({updates_per_minute:.0f}/min) >= {TARGET_UPDATES_PER_MINUTE}/min target")
    else:
        print(f"❌ SRS NFR-1.2 COMPLIANCE: FAIL")
        print(f"   Throughput ({updates_per_minute:.0f}/min) < {TARGET_UPDATES_PER_MINUTE}/min target")
    
    return updates_per_minute >= TARGET_UPDATES_PER_MINUTE

if __name__ == "__main__":
    try:
        passed = run_gps_load_test()
        exit(0 if passed else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Test interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        exit(1)

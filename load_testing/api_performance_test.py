#!/usr/bin/env python3
"""
MESSOB Fleet Management - API Performance Load Test
SRS Requirements: NFR-1.1 (API response time <500ms for 95% of operations)

Run: python api_performance_test.py
"""

import time
import statistics
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

# Test Configuration
BASE_URL = "http://localhost:8018"
NUM_REQUESTS = 1000
CONCURRENT_USERS = 50
TARGET_95TH_PERCENTILE_MS = 500

# Test endpoints (SRS critical operations)
ENDPOINTS = [
    {"method": "GET", "path": "/web/database/list"},
    {"method": "POST", "path": "/web/session/authenticate", "json": {
        "db": "fleet_management",
        "login": "admin",
        "password": "admin"
    }},
    {"method": "GET", "path": "/messob/api/trips"},
    {"method": "GET", "path": "/messob/api/vehicles"},
    {"method": "GET", "path": "/messob/api/drivers"},
]

def make_request(endpoint):
    """Execute single API request and measure response time"""
    start = time.time()
    try:
        if endpoint["method"] == "GET":
            response = requests.get(f"{BASE_URL}{endpoint['path']}", timeout=10)
        elif endpoint["method"] == "POST":
            response = requests.post(
                f"{BASE_URL}{endpoint['path']}", 
                json=endpoint.get("json", {}),
                timeout=10
            )
        
        elapsed_ms = (time.time() - start) * 1000
        return {
            "success": response.status_code < 500,
            "status_code": response.status_code,
            "response_time_ms": elapsed_ms,
            "endpoint": endpoint["path"]
        }
    except Exception as e:
        elapsed_ms = (time.time() - start) * 1000
        return {
            "success": False,
            "status_code": 0,
            "response_time_ms": elapsed_ms,
            "endpoint": endpoint["path"],
            "error": str(e)
        }

def run_load_test():
    """Execute load test with concurrent requests"""
    print(f"🚀 MESSOB Fleet API Performance Test")
    print(f"═" * 70)
    print(f"Target: {BASE_URL}")
    print(f"Requests: {NUM_REQUESTS}")
    print(f"Concurrent Users: {CONCURRENT_USERS}")
    print(f"SRS NFR-1.1 Target: <{TARGET_95TH_PERCENTILE_MS}ms (95th percentile)")
    print(f"═" * 70)
    
    all_results = []
    
    # Distribute requests across endpoints
    requests_per_endpoint = NUM_REQUESTS // len(ENDPOINTS)
    
    with ThreadPoolExecutor(max_workers=CONCURRENT_USERS) as executor:
        futures = []
        
        for endpoint in ENDPOINTS:
            for _ in range(requests_per_endpoint):
                futures.append(executor.submit(make_request, endpoint))
        
        # Collect results
        for i, future in enumerate(as_completed(futures), 1):
            result = future.result()
            all_results.append(result)
            
            if i % 100 == 0:
                print(f"Progress: {i}/{NUM_REQUESTS} requests completed...")
    
    # Calculate statistics
    response_times = [r["response_time_ms"] for r in all_results]
    successful = [r for r in all_results if r["success"]]
    failed = [r for r in all_results if not r["success"]]
    
    percentile_95 = statistics.quantiles(response_times, n=20)[18]  # 95th percentile
    
    print(f"\n📊 RESULTS")
    print(f"═" * 70)
    print(f"Total Requests:       {len(all_results)}")
    print(f"Successful:           {len(successful)} ({len(successful)/len(all_results)*100:.1f}%)")
    print(f"Failed:               {len(failed)} ({len(failed)/len(all_results)*100:.1f}%)")
    print(f"\n⏱️  RESPONSE TIMES")
    print(f"Mean:                 {statistics.mean(response_times):.2f} ms")
    print(f"Median:               {statistics.median(response_times):.2f} ms")
    print(f"Min:                  {min(response_times):.2f} ms")
    print(f"Max:                  {max(response_times):.2f} ms")
    print(f"95th Percentile:      {percentile_95:.2f} ms")
    print(f"═" * 70)
    
    # SRS Compliance Check
    if percentile_95 < TARGET_95TH_PERCENTILE_MS:
        print(f"✅ SRS NFR-1.1 COMPLIANCE: PASS")
        print(f"   95th percentile ({percentile_95:.2f}ms) < {TARGET_95TH_PERCENTILE_MS}ms target")
    else:
        print(f"❌ SRS NFR-1.1 COMPLIANCE: FAIL")
        print(f"   95th percentile ({percentile_95:.2f}ms) >= {TARGET_95TH_PERCENTILE_MS}ms target")
    
    return percentile_95 < TARGET_95TH_PERCENTILE_MS

if __name__ == "__main__":
    try:
        passed = run_load_test()
        exit(0 if passed else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Test interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        exit(1)

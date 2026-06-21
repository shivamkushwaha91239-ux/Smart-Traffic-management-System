"""
Test script to verify cumulative vehicle detection is working
"""
import requests
import time
import json

API_BASE = "http://127.0.0.1:8001/api"

def get_detection_data(junction_id):
    """Fetch current detection data"""
    try:
        response = requests.get(f"{API_BASE}/detection/current/{junction_id}")
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Error: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return None

def reset_counts(junction_id):
    """Reset cumulative counts"""
    try:
        response = requests.post(f"{API_BASE}/detection/reset/{junction_id}")
        if response.status_code == 200:
            return response.json()
        else:
            print(f"❌ Error: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return None

def main():
    junction = "Junction-01"
    
    print("=" * 70)
    print("🎥 CUMULATIVE VEHICLE DETECTION TEST")
    print("=" * 70)
    
    # Test 1: Get initial data
    print("\n📊 Test 1: Initial Detection Data")
    data = get_detection_data(junction)
    if data:
        counts = data.get('vehicle_counts', {})
        print(f"✅ API Response received")
        print(f"   Total vehicles: {counts.get('total', 0)}")
        print(f"   Cars: {counts.get('car', 0)}")
        print(f"   Bikes: {counts.get('bike', 0)}")
        print(f"   Buses: {counts.get('bus', 0)}")
        print(f"   Trucks: {counts.get('truck', 0)}")
        print(f"   Ambulances: {counts.get('ambulance', 0)}")
        print(f"   Pedestrians: {counts.get('pedestrian', 0)}")
    
    # Test 2: Monitor for changes
    print("\n📈 Test 2: Monitoring Detection Changes (polling every 2 seconds, 30 seconds total)")
    print("   Watching for YOLO detections that should increment counts...")
    
    previous_total = get_detection_data(junction)['vehicle_counts']['total'] if get_detection_data(junction) else 0
    
    for i in range(15):
        time.sleep(2)
        data = get_detection_data(junction)
        if data:
            counts = data.get('vehicle_counts', {})
            current_total = counts.get('total', 0)
            change = current_total - previous_total
            
            if change > 0:
                print(f"   ⬆️ [{i*2}s] Total: {current_total} (+{change} detected)")
                print(f"       Cars: {counts.get('car', 0)}, Bikes: {counts.get('bike', 0)}, Buses: {counts.get('bus', 0)}, Trucks: {counts.get('truck', 0)}, Ambulances: {counts.get('ambulance', 0)}, Pedestrians: {counts.get('pedestrian', 0)}")
            else:
                print(f"   ⏸️ [{i*2}s] No new detections (Total: {current_total})")
            
            previous_total = current_total
    
    # Test 3: Reset functionality
    print("\n🔄 Test 3: Reset Counts")
    result = reset_counts(junction)
    if result and result.get('status') == 'success':
        print(f"✅ Counts reset successfully")
        data = get_detection_data(junction)
        if data:
            counts = data.get('vehicle_counts', {})
            print(f"   New total: {counts.get('total', 0)}")
    
    print("\n" + "=" * 70)
    print("✅ Test Complete - Check that:")
    print("   1. Vehicle counts increase when YOLO detects vehicles")
    print("   2. Counts accumulate (don't reset each frame)")
    print("   3. Different vehicle types are tracked separately")
    print("   4. Reset endpoint clears all counts")
    print("=" * 70)

if __name__ == "__main__":
    main()

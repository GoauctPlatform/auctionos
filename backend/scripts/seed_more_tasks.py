import sys
import os
import json
import random
from datetime import datetime, timedelta, timezone

# Add backend directory to sys.path so we can import app modules
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from sqlalchemy import text

def seed_more_tasks():
    db = SessionLocal()
    try:
        print("Starting GoAuct secondary test task seeding (6 more tasks)...")
        
        # 1. Get Investor User: gustavot.gomes7@gmail.com
        investor_email = "gustavot.gomes7@gmail.com"
        investor = db.execute(
            text("SELECT id, email FROM users WHERE email = :email"),
            {"email": investor_email}
        ).fetchone()
        
        if not investor:
            print(f"Investor user '{investor_email}' not found. Please run the primary seed_test_tasks.py first.")
            return
            
        print(f"Using Investor: {investor.email} (ID: {investor.id})")
        
        # 2. Find currently seeded property IDs to exclude them and use different properties
        existing_task_props = db.execute(text("SELECT DISTINCT property_id FROM realtor_tasks")).fetchall()
        exclude_ids = [r.property_id for r in existing_task_props]
        print(f"Excluding already used property IDs: {exclude_ids}")
        
        # 3. Find or create 6 distinct new properties in property_details
        if exclude_ids:
            exclude_clause = f"WHERE id NOT IN ({', '.join(map(str, exclude_ids))})"
        else:
            exclude_clause = ""
            
        properties = db.execute(text(f"SELECT id, address, latitude, longitude, state FROM property_details {exclude_clause} LIMIT 6")).fetchall()
        prop_ids = [p.id for p in properties]
        
        needed = 6 - len(prop_ids)
        if needed > 0:
            print(f"Found {len(prop_ids)} unused properties. Seeding {needed} new dummy properties...")
            dummy_props = [
                ("300 Pine Street, Seattle, WA 98101", 47.608955, -122.336455, "WA", "King"),
                ("500 Boylston St, Boston, MA 02116", 42.351234, -71.074555, "MA", "Suffolk"),
                ("1700 Market St, Philadelphia, PA 19103", 39.952455, -75.168955, "PA", "Philadelphia"),
                ("111 W Monroe St, Phoenix, AZ 85003", 33.450455, -112.074555, "AZ", "Maricopa"),
                ("1200 17th St, Denver, CO 80202", 39.750455, -104.996455, "CO", "Denver"),
                ("1 Market St, San Francisco, CA 94105", 37.794455, -122.394555, "CA", "San Francisco")
            ]
            
            for i in range(needed):
                addr, lat, lng, st, county = dummy_props[i % len(dummy_props)]
                parcel = f"TEST-MORE-PARCEL-{random.randint(100000, 999999)}"
                db.execute(text("""
                    INSERT INTO property_details (parcel_id, address, latitude, longitude, state, county, assessed_value, amount_due)
                    VALUES (:parcel, :addr, :lat, :lng, :state, :county, 320000, 5200)
                """), {"parcel": parcel, "addr": addr, "lat": lat, "lng": lng, "state": st, "county": county})
            
            db.commit()
            
            # Fetch again with the new items included
            properties = db.execute(text(f"SELECT id, address, latitude, longitude, state FROM property_details {exclude_clause} LIMIT 6")).fetchall()
            prop_ids = [p.id for p in properties]
            
        print(f"Using 6 different Properties for the new tasks: {prop_ids}")
        
        # 4. Define the 6 tasks across three types (2 Combo, 2 Photo-only, 2 Checklist-only)
        test_checklist = {
            "exterior": ["missing_shingles", "fascia_rot"],
            "openings": ["damaged_doors", "garage_functional"],
            "utilities": ["water_meter", "gas_meter"],
            "occupancy": ["notices"]
        }
        
        tasks_meta = [
            # Type 1: Combo (Photos + Checklist)
            {
                "property_id": prop_ids[0],
                "type": "bpo",
                "title": f"BPO Mission: Secondary Structural Check - {properties[0].address}",
                "description": "Examine fascia/soffit rot and verify front and rear garage door functionality. Capture 5 detailed photos from different property corners.",
                "min_photos": 5,
                "max_photos": 15,
                "reward": 10000, # 100.00 USD
                "checklist": json.dumps(test_checklist)
            },
            {
                "property_id": prop_ids[1],
                "type": "bpo",
                "title": f"BPO Mission: Comprehensive Yard & Security - {properties[1].address}",
                "description": "Check front boundary fencing, overgrown weeds/vegetation, and notice postings. Capture 5 geo-located facade photos.",
                "min_photos": 5,
                "max_photos": 15,
                "reward": 10000, # 100.00 USD
                "checklist": json.dumps(test_checklist)
            },
            # Type 2: Photo Verification Only (No Checklist)
            {
                "property_id": prop_ids[2],
                "type": "photo_verification",
                "title": f"Field Mission: Rear and Alley Verification - {properties[2].address}",
                "description": "Capture 3 clean photographs of the rear/alley side of the property. No checklist responses required.",
                "min_photos": 3,
                "max_photos": 10,
                "reward": 5000, # 50.00 USD
                "checklist": "{}"
            },
            {
                "property_id": prop_ids[3],
                "type": "photo_verification",
                "title": f"Field Mission: Street-View Verification - {properties[3].address}",
                "description": "Capture 3 detailed street-view photos showing number signage clearly. No checklist inspection answers needed.",
                "min_photos": 3,
                "max_photos": 10,
                "reward": 5000, # 50.00 USD
                "checklist": "{}"
            },
            # Type 3: Visual Feedback Only (Checklist Only - No Photos)
            {
                "property_id": prop_ids[4],
                "type": "visual_feedback",
                "title": f"Due Diligence Mission: Yard Hazard Assessment - {properties[4].address}",
                "description": "Verify overgrown vegetation, standing water, and fencing damages. Fill checklist. 0 photos required.",
                "min_photos": 0,
                "max_photos": 0,
                "reward": 5000, # 50.00 USD
                "checklist": json.dumps(test_checklist)
            },
            {
                "property_id": prop_ids[5],
                "type": "visual_feedback",
                "title": f"Due Diligence Mission: Interior Hazard Scan - {properties[5].address}",
                "description": "Inspect external meter boxes and check for any foreclosure notices in view. Fill checklist. 0 photos required.",
                "min_photos": 0,
                "max_photos": 0,
                "reward": 5000, # 50.00 USD
                "checklist": json.dumps(test_checklist)
            }
        ]
        
        # 5. Insert tasks
        print("Inserting 6 more pre-funded, pre-paid active open tasks linked to gustavot.gomes7@gmail.com...")
        deadline = datetime.now(timezone.utc) + timedelta(days=7)
        
        for task_info in tasks_meta:
            prop = next(p for p in properties if p.id == task_info["property_id"])
            mock_session_id = f"mock_stripe_escrow_prepaid_{random.randint(10000000, 99999999)}"
            
            db.execute(text("""
                INSERT INTO realtor_tasks
                    (property_id, investor_user_id, task_type, title, description,
                     address, latitude, longitude, geo_radius_meters,
                     min_photos, max_photos, reward_points, status,
                     checklist_requirements, gps_photo_reference, expiration_date, stripe_charge_id)
                VALUES
                    (:property_id, :investor_id, :task_type, :title, :description,
                     :address, :lat, :lng, 50,
                     :min_photos, :max_photos, :reward_points, 'open',
                     :checklist, NULL, :expiration, :stripe_session_id)
            """), {
                "property_id": task_info["property_id"],
                "investor_id": investor.id,
                "task_type": task_info["type"],
                "title": task_info["title"],
                "description": task_info["description"],
                "address": prop.address,
                "lat": prop.latitude,
                "lng": prop.longitude,
                "min_photos": task_info["min_photos"],
                "max_photos": task_info["max_photos"],
                "reward_points": task_info["reward"],
                "checklist": task_info["checklist"],
                "expiration": deadline,
                "stripe_session_id": mock_session_id
            })
            
        db.commit()
        print("Secondary task seeding complete!")
        
        # 6. Print out details
        seeded = db.execute(text("""
            SELECT id, title, task_type, status, reward_points 
            FROM realtor_tasks 
            ORDER BY id DESC LIMIT 6
        """)).fetchall()
        
        print("\n--- SEEDED ADDITIONAL TASKS ---")
        for s in reversed(seeded):
            print(f"ID: {s.id} | Type: {s.task_type:18} | Points: {s.reward_points:5} | Status: {s.status:6} | Title: {s.title}")
            
    except Exception as e:
        print(f"Error seeding additional tasks: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_more_tasks()

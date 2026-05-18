import sys
import os
import json
import random
from datetime import datetime, timedelta, timezone

# Add backend directory to sys.path so we can import app modules
sys.path.append(os.getcwd())

from app.db.session import SessionLocal
from app.core.security import get_password_hash
from sqlalchemy import text

def seed_test_tasks():
    db = SessionLocal()
    try:
        print("Starting GoAuct automated test task seeding & user validation...")
        
        # 1. Find or create Investor User: gustavot.gomes7@gmail.com
        investor_email = "gustavot.gomes7@gmail.com"
        investor = db.execute(
            text("SELECT id, email, role FROM users WHERE email = :email"),
            {"email": investor_email}
        ).fetchone()
        
        if investor:
            print(f"Investor user '{investor_email}' already exists. Elevating/ensuring role is 'investor' and active.")
            db.execute(
                text("UPDATE users SET role = 'investor', is_active = TRUE WHERE email = :email"),
                {"email": investor_email}
            )
            db.commit()
            investor = db.execute(
                text("SELECT id, email FROM users WHERE email = :email"),
                {"email": investor_email}
            ).fetchone()
        else:
            print(f"Investor user '{investor_email}' does not exist. Creating default investor account...")
            db.execute(text("""
                INSERT INTO users (email, hashed_password, is_superuser, is_active, role, full_name)
                VALUES (:email, :pw, FALSE, TRUE, 'investor', 'Gustavo Investor')
            """), {
                "email": investor_email,
                "pw": get_password_hash("Senha123!")
            })
            db.commit()
            investor = db.execute(
                text("SELECT id, email FROM users WHERE email = :email"),
                {"email": investor_email}
            ).fetchone()
            
        print(f"Using Investor: {investor.email} (ID: {investor.id})")
        
        # 2. Find or create Realtor: corretor@goauct.com
        realtor_email = "corretor@goauct.com"
        realtor_user = db.execute(
            text("SELECT id, email FROM users WHERE email = :email"),
            {"email": realtor_email}
        ).fetchone()
        
        if realtor_user:
            print(f"Realtor user '{realtor_email}' exists. Ensuring role 'realtor', status active, and resetting password.")
            db.execute(
                text("UPDATE users SET role = 'realtor', is_active = TRUE, hashed_password = :pw WHERE email = :email"),
                {"email": realtor_email, "pw": get_password_hash("Senha123!")}
            )
            db.commit()
        else:
            print(f"Realtor user '{realtor_email}' does not exist. Creating account...")
            db.execute(text("""
                INSERT INTO users (email, hashed_password, is_superuser, is_active, role, full_name)
                VALUES (:email, :pw, FALSE, TRUE, 'realtor', 'Corretor Teste')
            """), {
                "email": realtor_email,
                "pw": get_password_hash("Senha123!")
            })
            db.commit()
            realtor_user = db.execute(
                text("SELECT id, email FROM users WHERE email = :email"),
                {"email": realtor_email}
            ).fetchone()
            
        # Verify Realtor Profile
        realtor_profile = db.execute(
            text("SELECT id FROM realtors WHERE email = :email"),
            {"email": realtor_email}
        ).fetchone()
        
        if realtor_profile:
            print(f"Realtor profile found. Setting verification_status = 'verified'.")
            db.execute(
                text("UPDATE realtors SET verification_status = 'verified', user_id = :uid WHERE email = :email"),
                {"email": realtor_email, "uid": realtor_user.id}
            )
            db.commit()
        else:
            print(f"Realtor profile not found. Inserting verified profile credentials...")
            db.execute(text("""
                INSERT INTO realtors (user_id, name, email, phone, verification_status, social_security, license_number, mls_id, payment_account)
                VALUES (:uid, 'Corretor Teste', :email, '555-0199', 'verified', '000-12-3456', 'CRECI-12345', 'MLS-999', 'Bank Account ending in 9876')
            """), {
                "uid": realtor_user.id,
                "email": realtor_email
            })
            db.commit()

        # 3. Find or create Agent: agente@goauct.com
        agent_email = "agente@goauct.com"
        agent_user = db.execute(
            text("SELECT id, email FROM users WHERE email = :email"),
            {"email": agent_email}
        ).fetchone()
        
        if agent_user:
            print(f"Agent user '{agent_email}' exists. Ensuring role 'agent_due_diligence', status active, and resetting password.")
            db.execute(
                text("UPDATE users SET role = 'agent_due_diligence', is_active = TRUE, hashed_password = :pw WHERE email = :email"),
                {"email": agent_email, "pw": get_password_hash("Senha123!")}
            )
            db.commit()
        else:
            print(f"Agent user '{agent_email}' does not exist. Creating account...")
            db.execute(text("""
                INSERT INTO users (email, hashed_password, is_superuser, is_active, role, full_name)
                VALUES (:email, :pw, FALSE, TRUE, 'agent_due_diligence', 'Agente Teste')
            """), {
                "email": agent_email,
                "pw": get_password_hash("Senha123!")
            })
            db.commit()
            agent_user = db.execute(
                text("SELECT id, email FROM users WHERE email = :email"),
                {"email": agent_email}
            ).fetchone()
            
        # Verify Agent Profile
        agent_profile = db.execute(
            text("SELECT id FROM agent_due_diligence_profiles WHERE user_id = :uid"),
            {"uid": agent_user.id}
        ).fetchone()
        
        if agent_profile:
            print(f"Agent profile found. Setting verification_status = 'verified'.")
            db.execute(
                text("UPDATE agent_due_diligence_profiles SET verification_status = 'verified' WHERE user_id = :uid"),
                {"uid": agent_user.id}
            )
            db.commit()
        else:
            print(f"Agent profile not found. Inserting verified profile credentials...")
            db.execute(text("""
                INSERT INTO agent_due_diligence_profiles (user_id, coverage_area, coverage_radius_miles, vehicle_type, social_security, payment_account, verification_status)
                VALUES (:uid, '33139, 90026', 50, 'SUV', '999-88-7777', 'PayPal: agente@goauct.com', 'verified')
            """), {
                "uid": agent_user.id
            })
            db.commit()

        # 4. Get or create 6 distinct properties in property_details
        properties = db.execute(text("SELECT id, address, latitude, longitude, state FROM property_details LIMIT 6")).fetchall()
        prop_ids = [p.id for p in properties]
        
        needed = 6 - len(prop_ids)
        if needed > 0:
            print(f"Found {len(prop_ids)} properties. Seeding {needed} dummy properties...")
            dummy_props = [
                ("101 Ocean Drive, Miami, FL 33139", 25.778135, -80.131335, "FL", "Miami-Dade"),
                ("220 Sunset Blvd, Los Angeles, CA 90026", 34.077234, -118.258455, "CA", "Los Angeles"),
                ("450 Park Avenue, New York, NY 10022", 40.761895, -73.971565, "NY", "New York"),
                ("1200 Peachtree St NE, Atlanta, GA 30309", 33.787455, -84.382895, "GA", "Fulton"),
                ("600 Congress Ave, Austin, TX 78701", 30.268455, -97.742335, "TX", "Travis"),
                ("900 Michigan Ave, Chicago, IL 60611", 41.899455, -87.624335, "IL", "Cook")
            ]
            
            for i in range(needed):
                addr, lat, lng, st, county = dummy_props[i % len(dummy_props)]
                parcel = f"TEST-PARCEL-{random.randint(100000, 999999)}"
                db.execute(text("""
                    INSERT INTO property_details (parcel_id, address, latitude, longitude, state, county, assessed_value, amount_due)
                    VALUES (:parcel, :addr, :lat, :lng, :state, :county, 250000, 4500)
                """), {"parcel": parcel, "addr": addr, "lat": lat, "lng": lng, "state": st, "county": county})
            
            db.commit()
            properties = db.execute(text("SELECT id, address, latitude, longitude, state FROM property_details LIMIT 6")).fetchall()
            prop_ids = [p.id for p in properties]
            
        print(f"Using 6 Properties for tasks: {prop_ids}")
        
        # 5. Clean up any existing tasks for these specific properties to keep the test environment perfectly clean
        db.execute(text("DELETE FROM realtor_tasks WHERE property_id IN (:p1, :p2, :p3, :p4, :p5, :p6)"), 
                   {"p1": prop_ids[0], "p2": prop_ids[1], "p3": prop_ids[2], "p4": prop_ids[3], "p5": prop_ids[4], "p6": prop_ids[5]})
        db.commit()
        
        # 6. Define the 6 tasks across three types (2 Combo, 2 Photo-only, 2 Checklist-only)
        test_checklist = {
            "exterior": ["roof_sagging", "foundation_cracks"],
            "openings": ["broken_windows", "boarded_doors"],
            "utilities": ["ac_present", "electric_meter"],
            "occupancy": ["vacant"]
        }
        
        tasks_meta = [
            # Type 1: Combo (Photos + Checklist)
            {
                "property_id": prop_ids[0],
                "type": "bpo",
                "title": f"BPO Mission: Full Visual Audit - {properties[0].address}",
                "description": "Premium full combo task. Verify exterior wall cracks, roof sagging, and window status. Capture 5 detailed high-res photos from multiple angles.",
                "min_photos": 5,
                "max_photos": 15,
                "reward": 10000, # 100.00 USD
                "checklist": json.dumps(test_checklist)
            },
            {
                "property_id": prop_ids[1],
                "type": "bpo",
                "title": f"BPO Mission: Condition Assessment - {properties[1].address}",
                "description": "Standard combo inspection. Confirm front structure framing stability and utility connections. Capture 5 distinct facade photos.",
                "min_photos": 5,
                "max_photos": 15,
                "reward": 10000, # 100.00 USD
                "checklist": json.dumps(test_checklist)
            },
            # Type 2: Photo Verification Only (No Checklist)
            {
                "property_id": prop_ids[2],
                "type": "photo_verification",
                "title": f"Field Mission: Facade Photo Verification - {properties[2].address}",
                "description": "Capture 3 clean facade photographs showing current occupancy indicators and general yard state. No inspection checklist required.",
                "min_photos": 3,
                "max_photos": 10,
                "reward": 5000, # 50.00 USD
                "checklist": "{}"
            },
            {
                "property_id": prop_ids[3],
                "type": "photo_verification",
                "title": f"Field Mission: Boundary Photo Verification - {properties[3].address}",
                "description": "Verify property exists by taking 3 high-res physical photographs of the site location. No checklist answers needed.",
                "min_photos": 3,
                "max_photos": 10,
                "reward": 5000, # 50.00 USD
                "checklist": "{}"
            },
            # Type 3: Visual Feedback Only (Checklist Only - No Photos)
            {
                "property_id": prop_ids[4],
                "type": "visual_feedback",
                "title": f"Due Diligence Mission: Visual Condition Check - {properties[4].address}",
                "description": "Complete the full structural inspection checklist. Verify if walls lean or if doors/windows are boarded. 0 photo uploads required.",
                "min_photos": 0,
                "max_photos": 0,
                "reward": 5000, # 50.00 USD
                "checklist": json.dumps(test_checklist)
            },
            {
                "property_id": prop_ids[5],
                "type": "visual_feedback",
                "title": f"Due Diligence Mission: Occupancy Survey - {properties[5].address}",
                "description": "Inspect for presence of squatters, auction signs, or foreclosure notices. Perform checklist check in the field. 0 photos required.",
                "min_photos": 0,
                "max_photos": 0,
                "reward": 5000, # 50.00 USD
                "checklist": json.dumps(test_checklist)
            }
        ]
        
        # 7. Insert tasks
        print("Inserting 6 pre-funded, pre-paid active open tasks linked to gustavot.gomes7@gmail.com...")
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
        print("Sandbox Seeding & Credentials validation complete!")
        
        # 8. Print out details
        seeded = db.execute(text("""
            SELECT id, title, task_type, status, reward_points 
            FROM realtor_tasks 
            ORDER BY id DESC LIMIT 6
        """)).fetchall()
        
        print("\n--- SEEDED TASKS ---")
        for s in reversed(seeded):
            print(f"ID: {s.id} | Type: {s.task_type:18} | Points: {s.reward_points:5} | Status: {s.status:6} | Title: {s.title}")
            
    except Exception as e:
        print(f"Error seeding test tasks: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_test_tasks()

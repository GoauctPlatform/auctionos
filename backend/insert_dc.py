import sys
import os

# Add parent directory to sys.path so we can import app modules when running directly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.state_contact import StateContact
from app.models.county_contact import CountyContact

def main():
    db = SessionLocal()
    try:
        # 1. Check & Insert Washington, D.C. state contact
        state_name = "Washington, D.C."
        state_contact = db.query(StateContact).filter(StateContact.state == state_name).first()
        if not state_contact:
            print(f"Creating StateContact for '{state_name}'...")
            state_contact = StateContact(
                state=state_name,
                url="https://otr.cfo.dc.gov/page/real-property-tax-assessment"
            )
            db.add(state_contact)
            db.flush()
            print("StateContact created successfully.")
        else:
            print(f"StateContact for '{state_name}' already exists.")

        # 2. Check & Insert District of Columbia county contact
        county_name_1 = "district of columbia"
        county_contact_1 = db.query(CountyContact).filter(
            CountyContact.state == "dc",
            CountyContact.county == county_name_1
        ).first()
        
        if not county_contact_1:
            print(f"Creating CountyContact for state='dc', county='{county_name_1}'...")
            county_contact_1 = CountyContact(
                state="dc",
                county=county_name_1,
                name="District of Columbia Property Tax",
                phone="(202) 727-4829",
                url="https://otr.cfo.dc.gov/page/real-property-tax-assessment"
            )
            db.add(county_contact_1)
            print("CountyContact (district of columbia) created successfully.")
        else:
            print(f"CountyContact for state='dc', county='{county_name_1}' already exists.")

        # 3. Check & Insert Washington county contact
        county_name_2 = "washington"
        county_contact_2 = db.query(CountyContact).filter(
            CountyContact.state == "dc",
            CountyContact.county == county_name_2
        ).first()
        
        if not county_contact_2:
            print(f"Creating CountyContact for state='dc', county='{county_name_2}'...")
            county_contact_2 = CountyContact(
                state="dc",
                county=county_name_2,
                name="Washington DC Assessor",
                phone="(202) 727-4829",
                url="https://otr.cfo.dc.gov/page/real-property-tax-assessment"
            )
            db.add(county_contact_2)
            print("CountyContact (washington) created successfully.")
        else:
            print(f"CountyContact for state='dc', county='{county_name_2}' already exists.")

        db.commit()
        print("All database inserts successfully committed!")
    except Exception as e:
        db.rollback()
        print(f"Error occurred during insertion: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    main()

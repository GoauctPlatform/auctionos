from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
import json
from datetime import datetime

class IntelligenceService:
    @staticmethod
    def calculate_weighted_score(property: Any) -> Dict[str, Any]:
        """
        Tier 5: Motor Score Algorithm
        Weights and criteria based on real estate investment best practices.
        """
        score = 0
        factors = []
        
        # 1. Base Data (+30)
        if property.get('address'):
            score += 10
            factors.append("+10: Address verified")
        if property.get('property_type') and property.get('property_type').lower() != 'unknown':
            score += 10
            factors.append("+10: Property type known")
        if property.get('owner_name'):
            score += 10
            factors.append("+10: Owner data verified")
            
        # 2. Financial Ratio (+45 max)
        taxes = property.get('amount_due') or 0
        assessed = property.get('assessed_value') or 0
        
        if assessed > 0:
            ratio = taxes / assessed
            if ratio < 0.05:
                score += 45
                factors.append("+45: Exceptional deal (Ratio < 5%)")
            elif ratio < 0.10:
                score += 35
                factors.append("+35: Excellent (Ratio < 10%)")
            elif ratio < 0.25:
                score += 22
                factors.append("+22: Good (Ratio < 25%)")
            elif ratio < 0.50:
                score += 10
                factors.append("+10: Fair (Ratio < 50%)")
        
        # 3. Structure & Improvements (+5)
        if property.get('improvement_value') and property.get('improvement_value') > 0:
            score += 5
            factors.append("+5: Structure present (Improvements)")
            
        # 4. Auction Type & Risk (+8 max)
        # Assuming we can detect auction type from tags or descriptions
        desc = (property.get('description') or "").lower()
        if 'lien' in desc:
            score += 8
            factors.append("+8: Lien (Lower risk)")
        elif 'deed' in desc:
            score += 6
            factors.append("+6: Deed (Direct access)")
        elif 'foreclosure' in desc:
            score += 4
            factors.append("+4: Distressed (Foreclosure)")
            
        # 5. Land Size (+5)
        acres = property.get('lot_acres') or 0
        if acres >= 1.0:
            score += 5
            factors.append("+5: Significant lot (>= 1 acre)")
            
        # 6. Availability (+5 or -5)
        status = (property.get('availability_status') or "").lower()
        if status == 'available':
            score += 5
            factors.append("+5: Confirmed Available")
        elif status == 'unavailable':
            score -= 5
            factors.append("-5: Penalty (Unavailable)")

        # Cap and Grade
        score = max(0, min(score, 100))
        
        rating = "F"
        if score >= 90: rating = "A+"
        elif score >= 80: rating = "A"
        elif score >= 65: rating = "B"
        elif score >= 50: rating = "C"
        elif score >= 35: rating = "D"
        
        return {
            "score": score,
            "rating": rating,
            "factors": factors
        }

    @staticmethod
    def get_comparative_estimate(db: Session, parcel_id: str, county: str, city: str, property_type: str) -> Optional[float]:
        """
        Algorithm: Replace mocks with a comparative search.
        Compares similar properties in same County/City.
        """
        if not county or not city:
            return None
            
        query = text("""
            SELECT AVG(assessed_value) as avg_val
            FROM property_details
            WHERE county ILIKE :county 
              AND address ILIKE :city_search
              AND property_type ILIKE :ptype
              AND assessed_value > 0
              AND parcel_id != :pid
        """)
        
        # Simple city search in address field if city is not a separate column
        result = db.execute(query, {
            "county": f"%{county}%",
            "city_search": f"%{city}%",
            "ptype": f"%{property_type}%" if property_type else "%",
            "pid": parcel_id
        }).fetchone()
        
        if result and result[0]:
            # Apply a small market multiplier (e.g. 1.2x of assessed value for a 'market' estimate)
            return round(float(result[0]) * 1.25, 2)
            
        return None

intelligence_service = IntelligenceService()

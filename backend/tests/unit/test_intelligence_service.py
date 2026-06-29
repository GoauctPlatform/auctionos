"""
Unit tests for IntelligenceService.calculate_weighted_score()

These tests run WITHOUT any database, Redis, or external services.
They verify the core scoring algorithm that powers GoAuct's deal intelligence.
"""
import pytest
from app.services.intelligence_service import IntelligenceService


# ─── Helpers ─────────────────────────────────────────────────────────────────

def make_property(**kwargs) -> dict:
    """Build a minimal property dict with sensible defaults."""
    defaults = {
        "address": None,
        "property_type": None,
        "owner_name": None,
        "amount_due": 0,
        "assessed_value": 0,
        "improvement_value": 0,
        "description": "",
        "lot_acres": 0,
        "availability_status": "",
    }
    defaults.update(kwargs)
    return defaults


# ─── Score Bounds ─────────────────────────────────────────────────────────────

class TestScoreBounds:
    def test_empty_property_scores_zero(self):
        result = IntelligenceService.calculate_weighted_score(make_property())
        assert result["score"] == 0
        assert result["rating"] == "F"

    def test_score_never_exceeds_100(self):
        prop = make_property(
            address="123 Main St",
            property_type="residential",
            owner_name="John Doe",
            amount_due=100,
            assessed_value=100_000,   # ratio = 0.001 → +45
            improvement_value=50_000,
            description="tax lien",
            lot_acres=2.0,
            availability_status="available",
        )
        result = IntelligenceService.calculate_weighted_score(prop)
        assert result["score"] <= 100
        assert result["score"] >= 0

    def test_score_never_below_zero_with_unavailable_penalty(self):
        prop = make_property(availability_status="unavailable")
        result = IntelligenceService.calculate_weighted_score(prop)
        assert result["score"] == 0  # capped at 0, never negative


# ─── Base Data Section (+30 max) ──────────────────────────────────────────────

class TestBaseData:
    def test_address_adds_10(self):
        r_with = IntelligenceService.calculate_weighted_score(make_property(address="123 St"))
        r_without = IntelligenceService.calculate_weighted_score(make_property())
        assert r_with["score"] - r_without["score"] == 10

    def test_known_property_type_adds_10(self):
        r_with = IntelligenceService.calculate_weighted_score(make_property(property_type="Residential"))
        r_unknown = IntelligenceService.calculate_weighted_score(make_property(property_type="unknown"))
        r_none = IntelligenceService.calculate_weighted_score(make_property(property_type=None))
        assert r_with["score"] == 10
        assert r_unknown["score"] == 0
        assert r_none["score"] == 0

    def test_owner_name_adds_10(self):
        r = IntelligenceService.calculate_weighted_score(make_property(owner_name="Jane Smith"))
        assert r["score"] == 10


# ─── Financial Ratio Section (+45 max) ───────────────────────────────────────

class TestFinancialRatio:
    def test_exceptional_deal_ratio_below_5_pct(self):
        prop = make_property(amount_due=1_000, assessed_value=100_000)  # 1%
        result = IntelligenceService.calculate_weighted_score(prop)
        assert "+45: Exceptional deal (Ratio < 5%)" in result["factors"]

    def test_excellent_deal_ratio_below_10_pct(self):
        prop = make_property(amount_due=8_000, assessed_value=100_000)  # 8%
        result = IntelligenceService.calculate_weighted_score(prop)
        assert "+35: Excellent (Ratio < 10%)" in result["factors"]

    def test_good_deal_ratio_below_25_pct(self):
        prop = make_property(amount_due=15_000, assessed_value=100_000)  # 15%
        result = IntelligenceService.calculate_weighted_score(prop)
        assert "+22: Good (Ratio < 25%)" in result["factors"]

    def test_fair_deal_ratio_below_50_pct(self):
        prop = make_property(amount_due=40_000, assessed_value=100_000)  # 40%
        result = IntelligenceService.calculate_weighted_score(prop)
        assert "+10: Fair (Ratio < 50%)" in result["factors"]

    def test_no_bonus_ratio_above_50_pct(self):
        prop = make_property(amount_due=60_000, assessed_value=100_000)  # 60%
        result = IntelligenceService.calculate_weighted_score(prop)
        ratio_factors = [f for f in result["factors"] if "Ratio" in f]
        assert len(ratio_factors) == 0

    def test_zero_assessed_value_gets_no_ratio_bonus(self):
        prop = make_property(amount_due=5_000, assessed_value=0)
        result = IntelligenceService.calculate_weighted_score(prop)
        ratio_factors = [f for f in result["factors"] if "Ratio" in f]
        assert len(ratio_factors) == 0


# ─── Auction Type Section (+8 max) ───────────────────────────────────────────

class TestAuctionType:
    def test_lien_adds_8(self):
        prop = make_property(description="This is a tax lien auction")
        result = IntelligenceService.calculate_weighted_score(prop)
        assert "+8: Lien (Lower risk)" in result["factors"]

    def test_deed_adds_6(self):
        prop = make_property(description="Tax deed sale")
        result = IntelligenceService.calculate_weighted_score(prop)
        assert "+6: Deed (Direct access)" in result["factors"]

    def test_foreclosure_adds_4(self):
        prop = make_property(description="Foreclosure property")
        result = IntelligenceService.calculate_weighted_score(prop)
        assert "+4: Distressed (Foreclosure)" in result["factors"]

    def test_lien_takes_priority_over_deed_in_description(self):
        # "lien" appears first in the if-elif chain
        prop = make_property(description="tax lien deed sale")
        result = IntelligenceService.calculate_weighted_score(prop)
        assert "+8: Lien (Lower risk)" in result["factors"]
        assert "+6: Deed (Direct access)" not in result["factors"]


# ─── Availability Section ─────────────────────────────────────────────────────

class TestAvailability:
    def test_available_adds_5(self):
        prop = make_property(availability_status="available")
        result = IntelligenceService.calculate_weighted_score(prop)
        assert "+5: Confirmed Available" in result["factors"]

    def test_unavailable_subtracts_5(self):
        prop = make_property(availability_status="unavailable")
        result = IntelligenceService.calculate_weighted_score(prop)
        assert "-5: Penalty (Unavailable)" in result["factors"]

    def test_available_status_is_case_insensitive(self):
        prop_upper = make_property(availability_status="AVAILABLE")
        prop_lower = make_property(availability_status="available")
        # The implementation lowercases, so both should behave the same
        r_upper = IntelligenceService.calculate_weighted_score(prop_upper)
        r_lower = IntelligenceService.calculate_weighted_score(prop_lower)
        assert r_upper["score"] == r_lower["score"]


# ─── Rating Thresholds ────────────────────────────────────────────────────────

class TestRatingThresholds:
    def _score_to_rating(self, score: int) -> str:
        # Build a property that scores exactly `score` using known inputs
        # We'll mock around the known scoring rules
        result = IntelligenceService.calculate_weighted_score(make_property())
        assert result["score"] == 0
        return result["rating"]

    def test_score_90_plus_is_A_plus(self):
        prop = make_property(
            address="123 St",           # +10
            property_type="residential", # +10
            owner_name="Jane",          # +10
            amount_due=100, assessed_value=100_000,  # +45 (< 5%)
            improvement_value=50_000,   # +5
            description="tax lien",     # +8
            lot_acres=2.0,              # +5
            availability_status="available",  # +5
        )
        # Total: 10+10+10+45+5+8+5+5 = 98 (capped at 100)
        result = IntelligenceService.calculate_weighted_score(prop)
        assert result["score"] >= 90
        assert result["rating"] == "A+"

    def test_score_80_to_89_is_A(self):
        # 10+10+10+35+5+8+5 = 83
        prop = make_property(
            address="123 St", property_type="res", owner_name="X",
            amount_due=8_000, assessed_value=100_000,  # +35
            improvement_value=1, description="lien",
            lot_acres=2.0,
        )
        result = IntelligenceService.calculate_weighted_score(prop)
        assert 80 <= result["score"] <= 89
        assert result["rating"] == "A"

    def test_f_rating_for_zero_score(self):
        result = IntelligenceService.calculate_weighted_score(make_property())
        assert result["rating"] == "F"


# ─── Return Shape ─────────────────────────────────────────────────────────────

class TestReturnShape:
    def test_result_always_has_score_rating_factors(self):
        result = IntelligenceService.calculate_weighted_score(make_property())
        assert "score" in result
        assert "rating" in result
        assert "factors" in result
        assert isinstance(result["factors"], list)

    def test_factors_list_is_non_empty_for_scoring_property(self):
        prop = make_property(address="123 St")
        result = IntelligenceService.calculate_weighted_score(prop)
        assert len(result["factors"]) >= 1

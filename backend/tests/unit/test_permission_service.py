"""
Unit tests for PermissionService and PLAN_LIMITS

Tests the plan limits data structure and the logic branches
that can be verified without a real database connection.
Uses MagicMock to simulate DB sessions.
"""
import pytest
from unittest.mock import MagicMock, patch, PropertyMock
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException

from app.services.permission_service import PermissionService, PLAN_LIMITS


# ─── PLAN_LIMITS data contract ───────────────────────────────────────────────

class TestPlanLimitsContract:
    """Verify the plan limits dictionary has the required shape.
    
    These tests act as a contract — if someone edits PLAN_LIMITS in a way
    that breaks downstream logic, these will catch it immediately.
    """

    REQUIRED_PLANS = ["trial", "advanced", "pro", "enterprise"]
    REQUIRED_KEYS = ["views", "companies", "managers", "agents",
                     "custom_properties", "community", "tasks", "exports"]

    def test_all_plans_exist(self):
        for plan in self.REQUIRED_PLANS:
            assert plan in PLAN_LIMITS, f"Plan '{plan}' missing from PLAN_LIMITS"

    def test_all_keys_present_in_each_plan(self):
        for plan in self.REQUIRED_PLANS:
            for key in self.REQUIRED_KEYS:
                assert key in PLAN_LIMITS[plan], \
                    f"Key '{key}' missing from PLAN_LIMITS['{plan}']"

    def test_trial_most_restrictive(self):
        trial = PLAN_LIMITS["trial"]
        enterprise = PLAN_LIMITS["enterprise"]
        assert trial["views"] < enterprise["views"]
        assert trial["companies"] <= enterprise["companies"]
        assert trial["managers"] == 0
        assert trial["agents"] == 0
        assert trial["community"] is False
        assert trial["tasks"] is False
        assert trial["exports"] is False

    def test_enterprise_most_permissive(self):
        enterprise = PLAN_LIMITS["enterprise"]
        pro = PLAN_LIMITS["pro"]
        advanced = PLAN_LIMITS["advanced"]
        assert enterprise["views"] >= pro["views"]
        assert enterprise["companies"] >= pro["companies"]
        assert enterprise["managers"] >= pro["managers"]
        assert enterprise["agents"] >= pro["agents"]

    def test_view_limits_are_positive_integers(self):
        for plan_name, plan in PLAN_LIMITS.items():
            assert isinstance(plan["views"], int), \
                f"Plan '{plan_name}' views must be int"
            assert plan["views"] >= 0

    def test_boolean_features_are_actual_booleans(self):
        for plan_name, plan in PLAN_LIMITS.items():
            for key in ["community", "tasks", "exports"]:
                assert isinstance(plan[key], bool), \
                    f"PLAN_LIMITS['{plan_name}']['{key}'] must be bool, got {type(plan[key])}"

    def test_trial_views_are_reasonable(self):
        """Trial should allow some views but not unlimited."""
        assert 1 <= PLAN_LIMITS["trial"]["views"] <= 100

    def test_advanced_and_above_have_exports(self):
        for plan in ["advanced", "pro", "enterprise"]:
            assert PLAN_LIMITS[plan]["exports"] is True


# ─── Trial Expiration Logic ──────────────────────────────────────────────────

class TestTrialExpiration:
    """Tests for PermissionService.get_parent_subscription() expiration logic.
    
    Mocks the DB to return a trial subscription with controlled start_date.
    """

    def _make_user(self, role="client", active_company_id=None):
        user = MagicMock()
        user.id = 1
        user.role = role
        user.active_company_id = active_company_id
        user.subscription_tier = "trial"
        return user

    def _make_subscription(self, plan_type="trial", status="active", days_old=0):
        sub = MagicMock()
        sub.plan_type = plan_type
        sub.status = status
        sub.start_date = datetime.now(timezone.utc) - timedelta(days=days_old)
        return sub

    def _make_owner_user(self, subscription_tier="trial"):
        owner = MagicMock()
        owner.id = 1
        owner.subscription_tier = subscription_tier
        return owner

    def _make_db(self, subscription, owner_user=None):
        db = MagicMock()
        mock_query = MagicMock()
        
        # First query → subscription, second query → owner_user
        if owner_user is None:
            owner_user = self._make_owner_user()
        
        mock_query.filter.return_value.first.side_effect = [subscription, owner_user]
        db.query.return_value = mock_query
        return db

    def test_active_trial_within_7_days_is_valid(self):
        user = self._make_user()
        sub = self._make_subscription(plan_type="trial", status="active", days_old=3)
        db = self._make_db(sub, self._make_owner_user("trial"))
        
        # Should NOT raise
        result = PermissionService.get_parent_subscription(db, user)
        assert result is not None

    def test_trial_expired_after_7_days_raises_402(self):
        user = self._make_user()
        sub = self._make_subscription(plan_type="trial", status="active", days_old=8)
        db = self._make_db(sub, self._make_owner_user("trial"))

        with pytest.raises(HTTPException) as exc_info:
            PermissionService.get_parent_subscription(db, user)

        assert exc_info.value.status_code == 402
        assert "expired" in exc_info.value.detail.lower()

    def test_inactive_subscription_raises_402(self):
        user = self._make_user()
        sub = self._make_subscription(plan_type="pro", status="cancelled", days_old=0)
        db = self._make_db(sub, self._make_owner_user("pro"))

        with pytest.raises(HTTPException) as exc_info:
            PermissionService.get_parent_subscription(db, user)

        assert exc_info.value.status_code == 402
        assert "cancelled" in exc_info.value.detail.lower()

    def test_pro_plan_never_expires_from_age(self):
        """Non-trial plans must not be subject to the 7-day expiration check."""
        user = self._make_user()
        sub = self._make_subscription(plan_type="pro", status="active", days_old=365)
        db = self._make_db(sub, self._make_owner_user("pro"))

        # Should NOT raise — pro plan has no age-based expiration
        result = PermissionService.get_parent_subscription(db, user)
        assert result is not None

    def test_enterprise_plan_never_expires_from_age(self):
        user = self._make_user()
        sub = self._make_subscription(plan_type="enterprise", status="active", days_old=730)
        db = self._make_db(sub, self._make_owner_user("enterprise"))

        result = PermissionService.get_parent_subscription(db, user)
        assert result is not None


# ─── Feature Access ───────────────────────────────────────────────────────────

class TestCheckFeatureAccess:
    """Verify that feature gates enforce plan limits correctly."""

    def _make_active_sub(self, plan_type):
        sub = MagicMock()
        sub.plan_type = plan_type
        sub.status = "active"
        sub.start_date = datetime.now(timezone.utc)
        return sub

    def _make_user_and_db(self, plan_type):
        user = MagicMock()
        user.id = 1
        user.role = "client"
        user.subscription_tier = plan_type

        sub = self._make_active_sub(plan_type)
        owner = MagicMock()
        owner.id = 1
        owner.subscription_tier = plan_type

        db = MagicMock()
        mock_query = MagicMock()
        mock_query.filter.return_value.first.side_effect = [sub, owner]
        db.query.return_value = mock_query
        return user, db

    def test_trial_cannot_access_community(self):
        user, db = self._make_user_and_db("trial")
        with pytest.raises(HTTPException) as exc_info:
            PermissionService.check_feature_access(db, user, "community")
        assert exc_info.value.status_code == 403
        assert "trial" in exc_info.value.detail.lower()

    def test_trial_cannot_access_tasks(self):
        user, db = self._make_user_and_db("trial")
        with pytest.raises(HTTPException) as exc_info:
            PermissionService.check_feature_access(db, user, "tasks")
        assert exc_info.value.status_code == 403

    def test_advanced_can_access_tasks(self):
        user, db = self._make_user_and_db("advanced")
        # Should NOT raise
        PermissionService.check_feature_access(db, user, "tasks")

    def test_enterprise_can_access_all_boolean_features(self):
        for feature in ["community", "tasks", "exports"]:
            user, db = self._make_user_and_db("enterprise")
            # Should NOT raise for any feature
            PermissionService.check_feature_access(db, user, feature)

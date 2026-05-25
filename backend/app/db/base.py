from app.db.base_class import Base

# Import all models here so that Alembic can detect them
from app.models.user import User  # noqa
from app.models.property import PropertyDetails, PropertyAuctionHistory, PropertyAvailabilityHistory
from app.models.county_contact import CountyContact
from app.models.auction_event import AuctionEvent  # noqa
from app.models.client_data import ClientList, ClientNote, ClientAttachment
from app.models.system_announcement import SystemAnnouncement
from app.models.state_contact import StateContact
from app.models.scoring import PropertyScore  # noqa — ML scoring engine
from app.models.notification import Notification
from app.models.activity_log import ActivityLog
from app.models.lead import Lead
from app.models.community_update import CommunityUpdate

from app.models.company import Company
from app.models.realtor import Realtor
from app.models.user_property import UserProperty
from app.models.agent_due_diligence import AgentDueDiligenceProfile
from app.models.user_onboarding import UserOnboarding

# Realtor Task Ecosystem
from app.models.realtor_task import (
    PropertyExport,
    RealtorTask,
    TaskSubmission,
    RealtorCommission,
    SupportTicket,
)

from app.models.realtor_economy import RealtorWallet, WithdrawalRequest, PropertyMediaPurchase
from app.models.monetization import UserSubscription, StorageUsage
from app.models.property_user_override import PropertyUserOverride  # noqa — JSONB Override/Merge pattern
from app.models.backup_job import BackupJob

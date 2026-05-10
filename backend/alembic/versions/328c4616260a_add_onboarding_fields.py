"""add_onboarding_fields

Revision ID: 328c4616260a
Revises: 1112b9792659
Create Date: 2026-05-10 04:57:00.027856

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '328c4616260a'
down_revision: Union[str, None] = '1112b9792659'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # realtors table
    op.add_column('realtors', sa.Column('social_security', sa.String(length=100), nullable=True))
    op.add_column('realtors', sa.Column('license_number', sa.String(length=100), nullable=True))
    op.add_column('realtors', sa.Column('mls_id', sa.String(length=100), nullable=True))
    op.add_column('realtors', sa.Column('payment_account', sa.String(length=255), nullable=True))
    
    # agent_due_diligence_profiles table
    op.add_column('agent_due_diligence_profiles', sa.Column('social_security', sa.String(length=100), nullable=True))
    op.add_column('agent_due_diligence_profiles', sa.Column('payment_account', sa.String(length=255), nullable=True))


def downgrade() -> None:
    # agent_due_diligence_profiles table
    op.drop_column('agent_due_diligence_profiles', 'payment_account')
    op.drop_column('agent_due_diligence_profiles', 'social_security')
    
    # realtors table
    op.drop_column('realtors', 'payment_account')
    op.drop_column('realtors', 'mls_id')
    op.drop_column('realtors', 'license_number')
    op.drop_column('realtors', 'social_security')

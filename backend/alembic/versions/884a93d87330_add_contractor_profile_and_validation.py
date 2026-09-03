"""Add contractor profile and validation

Revision ID: 884a93d87330
Revises: a7b4310e4c47
Create Date: 2026-07-04 19:54:55.097364

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '884a93d87330'
down_revision: Union[str, None] = 'a7b4310e4c47'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create contractor_profiles table
    op.create_table(
        'contractor_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('profession', sa.String(length=255), nullable=True),
        sa.Column('service_area_zipcodes', sa.String(length=1000), nullable=True),
        sa.Column('license_number', sa.String(length=255), nullable=True),
        sa.Column('license_document_url', sa.String(length=500), nullable=True),
        sa.Column('verification_status', sa.String(length=50), nullable=True),
        sa.Column('document_verification_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rejection_reason', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_contractor_profiles_id'), 'contractor_profiles', ['id'], unique=False)

    # Add new columns to agent_due_diligence_profiles
    op.add_column('agent_due_diligence_profiles', sa.Column('work_permit_document_url', sa.String(length=500), nullable=True))
    op.add_column('agent_due_diligence_profiles', sa.Column('document_verification_date', sa.DateTime(timezone=True), nullable=True))

def downgrade() -> None:
    op.drop_column('agent_due_diligence_profiles', 'document_verification_date')
    op.drop_column('agent_due_diligence_profiles', 'work_permit_document_url')
    op.drop_index(op.f('ix_contractor_profiles_id'), table_name='contractor_profiles')
    op.drop_table('contractor_profiles')

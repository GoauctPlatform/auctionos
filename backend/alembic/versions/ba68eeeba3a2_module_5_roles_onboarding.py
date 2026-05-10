"""module_5_roles_onboarding

Revision ID: ba68eeeba3a2
Revises: b7c8d9e0f1a2
Create Date: 2026-05-10 03:42:26.314878

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ba68eeeba3a2'
down_revision: Union[str, None] = 'b7c8d9e0f1a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename tables
    op.rename_table('consultants', 'realtors')
    op.rename_table('consultant_tasks', 'realtor_tasks')
    op.rename_table('consultant_commissions', 'realtor_commissions')
    
    # Rename columns
    op.alter_column('realtor_tasks', 'consultant_user_id', new_column_name='realtor_user_id')
    op.alter_column('realtor_commissions', 'consultant_user_id', new_column_name='realtor_user_id')
    op.alter_column('task_submissions', 'consultant_user_id', new_column_name='realtor_user_id')

    # Create new tables
    op.create_table('agent_due_diligence_profiles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('coverage_area', sa.String(length=255), nullable=True),
        sa.Column('vehicle_type', sa.String(length=50), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_agent_due_diligence_profiles_id'), 'agent_due_diligence_profiles', ['id'], unique=False)

    op.create_table('user_onboarding',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('has_completed_tour', sa.Boolean(), nullable=True),
        sa.Column('role_selected_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('onboarding_step', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_user_onboarding_id'), 'user_onboarding', ['id'], unique=False)

def downgrade() -> None:
    # Drop new tables
    op.drop_index(op.f('ix_user_onboarding_id'), table_name='user_onboarding')
    op.drop_table('user_onboarding')
    op.drop_index(op.f('ix_agent_due_diligence_profiles_id'), table_name='agent_due_diligence_profiles')
    op.drop_table('agent_due_diligence_profiles')
    
    # Revert column renames
    op.alter_column('task_submissions', 'realtor_user_id', new_column_name='consultant_user_id')
    op.alter_column('realtor_commissions', 'realtor_user_id', new_column_name='consultant_user_id')
    op.alter_column('realtor_tasks', 'realtor_user_id', new_column_name='consultant_user_id')
    
    # Revert table renames
    op.rename_table('realtor_commissions', 'consultant_commissions')
    op.rename_table('realtor_tasks', 'consultant_tasks')
    op.rename_table('realtors', 'consultants')

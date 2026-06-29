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
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    
    if 'consultants' in tables:
        # Rename tables
        op.rename_table('consultants', 'realtors')
        op.rename_table('consultant_tasks', 'realtor_tasks')
        op.rename_table('consultant_commissions', 'realtor_commissions')
        
        # Rename columns
        op.alter_column('realtor_tasks', 'consultant_user_id', new_column_name='realtor_user_id')
        op.alter_column('realtor_commissions', 'consultant_user_id', new_column_name='realtor_user_id')
        op.alter_column('task_submissions', 'consultant_user_id', new_column_name='realtor_user_id')
    else:
        # Create realtors and related tables if they do not exist
        if 'realtors' not in tables:
            op.create_table('realtors',
                sa.Column('id', sa.Integer(), nullable=False),
                sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True),
                sa.Column('name', sa.String(length=255), nullable=False),
                sa.Column('email', sa.String(length=255), nullable=False),
                sa.Column('phone', sa.String(length=50), nullable=True),
                sa.Column('verification_status', sa.String(length=50), server_default='pending'),
                sa.Column('commission_model', sa.String(length=255), nullable=True),
                sa.Column('social_security', sa.String(length=100), nullable=True),
                sa.Column('license_number', sa.String(length=100), nullable=True),
                sa.Column('mls_id', sa.String(length=100), nullable=True),
                sa.Column('payment_account', sa.String(length=255), nullable=True),
                sa.Column('rejection_reason', sa.String(length=500), nullable=True),
                sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
                sa.PrimaryKeyConstraint('id'),
                sa.UniqueConstraint('email')
            )
            op.create_index(op.f('ix_realtors_id'), 'realtors', ['id'], unique=False)
            op.create_index(op.f('ix_realtors_email'), 'realtors', ['email'], unique=True)
            
        if 'realtor_tasks' not in tables:
            op.create_table('realtor_tasks',
                sa.Column('id', sa.Integer(), nullable=False),
                sa.Column('property_id', sa.Integer(), sa.ForeignKey('property_details.id', ondelete='CASCADE'), nullable=False),
                sa.Column('investor_user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
                sa.Column('realtor_user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
                sa.Column('task_type', sa.String(length=50), server_default='photo_verification'),
                sa.Column('title', sa.String(length=255), nullable=False),
                sa.Column('description', sa.Text(), nullable=True),
                sa.Column('address', sa.String(length=255), nullable=True),
                sa.Column('latitude', sa.Float(), nullable=True),
                sa.Column('longitude', sa.Float(), nullable=True),
                sa.Column('geo_radius_meters', sa.Integer(), server_default='50'),
                sa.Column('min_photos', sa.Integer(), server_default='3'),
                sa.Column('max_photos', sa.Integer(), server_default='10'),
                sa.Column('reward_points', sa.Integer(), server_default='500'),
                sa.Column('checklist_requirements', sa.Text(), nullable=True),
                sa.Column('gps_photo_reference', sa.String(length=2048), nullable=True),
                sa.Column('rejections_count', sa.Integer(), server_default='0'),
                sa.Column('stripe_charge_id', sa.String(length=255), nullable=True),
                sa.Column('expiration_date', sa.DateTime(timezone=True), nullable=True),
                sa.Column('status', sa.String(length=50), server_default='open'),
                sa.Column('deadline', sa.DateTime(timezone=True), nullable=True),
                sa.Column('claimed_at', sa.DateTime(timezone=True), nullable=True),
                sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=True),
                sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
                sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
                sa.PrimaryKeyConstraint('id')
            )
            op.create_index(op.f('ix_realtor_tasks_id'), 'realtor_tasks', ['id'], unique=False)
            op.create_index(op.f('ix_realtor_tasks_property_id'), 'realtor_tasks', ['property_id'], unique=False)
            op.create_index(op.f('ix_realtor_tasks_investor_user_id'), 'realtor_tasks', ['investor_user_id'], unique=False)
            op.create_index(op.f('ix_realtor_tasks_realtor_user_id'), 'realtor_tasks', ['realtor_user_id'], unique=False)
            op.create_index(op.f('ix_realtor_tasks_status'), 'realtor_tasks', ['status'], unique=False)
            
        if 'task_submissions' not in tables:
            op.create_table('task_submissions',
                sa.Column('id', sa.Integer(), nullable=False),
                sa.Column('task_id', sa.Integer(), sa.ForeignKey('realtor_tasks.id', ondelete='CASCADE'), nullable=False),
                sa.Column('realtor_user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
                sa.Column('submission_lat', sa.Float(), nullable=True),
                sa.Column('submission_lng', sa.Float(), nullable=True),
                sa.Column('distance_meters', sa.Float(), nullable=True),
                sa.Column('geo_validated', sa.Boolean(), server_default='false'),
                sa.Column('file_path', sa.String(length=2048), nullable=True),
                sa.Column('file_type', sa.String(length=50), nullable=True),
                sa.Column('photo_count', sa.Integer(), server_default='1'),
                sa.Column('notes', sa.Text(), nullable=True),
                sa.Column('checklist_responses', sa.Text(), nullable=True),
                sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
                sa.Column('review_status', sa.String(length=50), server_default='pending'),
                sa.Column('review_notes', sa.Text(), nullable=True),
                sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
                sa.PrimaryKeyConstraint('id')
            )
            op.create_index(op.f('ix_task_submissions_id'), 'task_submissions', ['id'], unique=False)
            op.create_index(op.f('ix_task_submissions_task_id'), 'task_submissions', ['task_id'], unique=False)
            op.create_index(op.f('ix_task_submissions_realtor_user_id'), 'task_submissions', ['realtor_user_id'], unique=False)
            
        if 'realtor_commissions' not in tables:
            op.create_table('realtor_commissions',
                sa.Column('id', sa.Integer(), nullable=False),
                sa.Column('realtor_user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
                sa.Column('task_id', sa.Integer(), sa.ForeignKey('realtor_tasks.id', ondelete='SET NULL'), nullable=True),
                sa.Column('points', sa.Integer(), nullable=False),
                sa.Column('usd_value', sa.Float(), nullable=True),
                sa.Column('type', sa.String(length=50), nullable=False),
                sa.Column('status', sa.String(length=50), server_default='available'),
                sa.Column('description', sa.Text(), nullable=True),
                sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
                sa.PrimaryKeyConstraint('id')
            )
            op.create_index(op.f('ix_realtor_commissions_id'), 'realtor_commissions', ['id'], unique=False)
            op.create_index(op.f('ix_realtor_commissions_realtor_user_id'), 'realtor_commissions', ['realtor_user_id'], unique=False)
            
        if 'support_tickets' not in tables:
            op.create_table('support_tickets',
                sa.Column('id', sa.Integer(), nullable=False),
                sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
                sa.Column('task_id', sa.Integer(), sa.ForeignKey('realtor_tasks.id', ondelete='SET NULL'), nullable=True),
                sa.Column('subject', sa.String(length=255), nullable=False),
                sa.Column('message', sa.Text(), nullable=False),
                sa.Column('ticket_type', sa.String(length=50), server_default='general'),
                sa.Column('status', sa.String(length=50), server_default='open'),
                sa.Column('admin_response', sa.Text(), nullable=True),
                sa.Column('responded_at', sa.DateTime(timezone=True), nullable=True),
                sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
                sa.PrimaryKeyConstraint('id')
            )
            op.create_index(op.f('ix_support_tickets_id'), 'support_tickets', ['id'], unique=False)
            op.create_index(op.f('ix_support_tickets_user_id'), 'support_tickets', ['user_id'], unique=False)


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

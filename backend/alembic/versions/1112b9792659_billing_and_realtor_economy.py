"""billing_and_realtor_economy

Revision ID: 1112b9792659
Revises: 9702ac5c9706
Create Date: 2026-05-10 04:40:32.141507

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1112b9792659'
down_revision: Union[str, None] = '9702ac5c9706'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # user_subscriptions
    op.create_table('user_subscriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('plan_type', sa.String(length=50), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('start_date', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('property_views_used', sa.Integer(), nullable=True),
        sa.Column('property_searches_used', sa.Integer(), nullable=True),
        sa.Column('properties_created', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_subscriptions_id'), 'user_subscriptions', ['id'], unique=False)
    op.create_index(op.f('ix_user_subscriptions_user_id'), 'user_subscriptions', ['user_id'], unique=True)

    # storage_usage
    op.create_table('storage_usage',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('total_bytes', sa.Integer(), nullable=True),
        sa.Column('last_calculated', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_storage_usage_company_id'), 'storage_usage', ['company_id'], unique=True)
    op.create_index(op.f('ix_storage_usage_id'), 'storage_usage', ['id'], unique=False)

    # realtor_wallet
    op.create_table('realtor_wallet',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('realtor_user_id', sa.Integer(), nullable=False),
        sa.Column('balance', sa.Float(), nullable=True),
        sa.Column('total_earned', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['realtor_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_realtor_wallet_id'), 'realtor_wallet', ['id'], unique=False)
    op.create_index(op.f('ix_realtor_wallet_realtor_user_id'), 'realtor_wallet', ['realtor_user_id'], unique=True)

    # withdrawal_requests
    op.create_table('withdrawal_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('realtor_user_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('admin_notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['realtor_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_withdrawal_requests_created_at'), 'withdrawal_requests', ['created_at'], unique=False)
    op.create_index(op.f('ix_withdrawal_requests_id'), 'withdrawal_requests', ['id'], unique=False)
    op.create_index(op.f('ix_withdrawal_requests_realtor_user_id'), 'withdrawal_requests', ['realtor_user_id'], unique=False)

    # property_media_purchases
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if 'property_media_purchases' not in tables:
        op.create_table('property_media_purchases',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('property_id', sa.String(length=36), nullable=False),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('amount_paid', sa.Float(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_property_media_purchases_id'), 'property_media_purchases', ['id'], unique=False)
        op.create_index(op.f('ix_property_media_purchases_property_id'), 'property_media_purchases', ['property_id'], unique=False)
        op.create_index(op.f('ix_property_media_purchases_user_id'), 'property_media_purchases', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_table('property_media_purchases')
    op.drop_table('withdrawal_requests')
    op.drop_table('realtor_wallet')
    op.drop_table('storage_usage')
    op.drop_table('user_subscriptions')

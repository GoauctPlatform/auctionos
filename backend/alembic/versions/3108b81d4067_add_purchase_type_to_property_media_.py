"""Add purchase_type to property_media_purchases

Revision ID: 3108b81d4067
Revises: 455a72170067
Create Date: 2026-05-17 03:08:25.932757

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3108b81d4067'
down_revision: Union[str, None] = '455a72170067'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add purchase_type column
    op.add_column('property_media_purchases', sa.Column('purchase_type', sa.String(length=50), server_default='combo', nullable=True))
    
    # Safely convert property_id from String to Integer using Postgres syntax
    op.execute('ALTER TABLE property_media_purchases ALTER COLUMN property_id TYPE integer USING property_id::integer')


def downgrade() -> None:
    op.drop_column('property_media_purchases', 'purchase_type')
    op.execute('ALTER TABLE property_media_purchases ALTER COLUMN property_id TYPE varchar(36) USING property_id::varchar')

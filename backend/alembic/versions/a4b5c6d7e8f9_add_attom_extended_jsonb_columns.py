"""add_attom_extended_jsonb_columns

Revision ID: a4b5c6d7e8f9
Revises: 675537ce7a0f
Create Date: 2026-05-19 07:23:00.000000

Adds four JSONB columns to property_details for storing extended ATTOM API data:
  - extended_owner_json: co-owners, corporate flag, mailing address parts (for skip tracing)
  - sales_history_json: full sale/transfer history list
  - tax_history_json: multi-year assessment and tax history
  - permits_json: building and renovation permits
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision = 'a4b5c6d7e8f9'
down_revision = '675537ce7a0f'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('property_details', sa.Column('extended_owner_json', JSONB, nullable=True))
    op.add_column('property_details', sa.Column('sales_history_json', JSONB, nullable=True))
    op.add_column('property_details', sa.Column('tax_history_json', JSONB, nullable=True))
    op.add_column('property_details', sa.Column('permits_json', JSONB, nullable=True))


def downgrade():
    op.drop_column('property_details', 'extended_owner_json')
    op.drop_column('property_details', 'sales_history_json')
    op.drop_column('property_details', 'tax_history_json')
    op.drop_column('property_details', 'permits_json')

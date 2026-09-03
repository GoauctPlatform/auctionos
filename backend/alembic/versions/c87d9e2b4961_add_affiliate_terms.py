"""add_affiliate_terms

Revision ID: c87d9e2b4961
Revises: 340b6535737c
Create Date: 2026-08-05 14:10:11.947950

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c87d9e2b4961'
down_revision: Union[str, None] = '340b6535737c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('affiliate_profiles', schema=None) as batch_op:
        batch_op.add_column(sa.Column('terms_accepted', sa.Boolean(), nullable=True))
        batch_op.add_column(sa.Column('terms_accepted_at', sa.DateTime(), nullable=True))

def downgrade() -> None:
    with op.batch_alter_table('affiliate_profiles', schema=None) as batch_op:
        batch_op.drop_column('terms_accepted_at')
        batch_op.drop_column('terms_accepted')

"""add_company_id_to_activity_logs

Revision ID: ffa41ad5e5f6
Revises: 6d765a06df0e
Create Date: 2026-05-01 16:31:16.515687

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ffa41ad5e5f6'
down_revision: Union[str, None] = '6d765a06df0e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = 'f102da7a6c29'


def upgrade() -> None:
    # add column company_id to activity_logs
    op.add_column('activity_logs', sa.Column('company_id', sa.Integer(), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=True))
    op.create_index(op.f('ix_activity_logs_company_id'), 'activity_logs', ['company_id'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_activity_logs_company_id'), table_name='activity_logs')
    op.drop_column('activity_logs', 'company_id')

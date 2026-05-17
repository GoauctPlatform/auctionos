"""Add BPO marketplace columns to realtor_tasks and task_submissions

Revision ID: 455a72170067
Revises: 96c8c0b7b949
Create Date: 2026-05-17 03:06:00.606931

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '455a72170067'
down_revision: Union[str, None] = '96c8c0b7b949'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add columns to realtor_tasks
    op.add_column('realtor_tasks', sa.Column('checklist_requirements', sa.Text(), nullable=True))
    op.add_column('realtor_tasks', sa.Column('gps_photo_reference', sa.String(length=2048), nullable=True))
    op.add_column('realtor_tasks', sa.Column('rejections_count', sa.Integer(), server_default='0', nullable=True))
    op.add_column('realtor_tasks', sa.Column('stripe_charge_id', sa.String(length=255), nullable=True))
    op.add_column('realtor_tasks', sa.Column('expiration_date', sa.DateTime(timezone=True), nullable=True))

    # Add columns to task_submissions
    op.add_column('task_submissions', sa.Column('checklist_responses', sa.Text(), nullable=True))


def downgrade() -> None:
    # Drop columns from task_submissions
    op.drop_column('task_submissions', 'checklist_responses')

    # Drop columns from realtor_tasks
    op.drop_column('realtor_tasks', 'expiration_date')
    op.drop_column('realtor_tasks', 'stripe_charge_id')
    op.drop_column('realtor_tasks', 'rejections_count')
    op.drop_column('realtor_tasks', 'gps_photo_reference')
    op.drop_column('realtor_tasks', 'checklist_requirements')

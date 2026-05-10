"""add_backup_job

Revision ID: 9702ac5c9706
Revises: ba68eeeba3a2
Create Date: 2026-05-10 04:28:05.800151

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9702ac5c9706'
down_revision: Union[str, None] = 'ba68eeeba3a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('backup_jobs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('filename', sa.String(length=255), nullable=False),
        sa.Column('file_path', sa.String(length=1024), nullable=False),
        sa.Column('file_size_bytes', sa.BigInteger(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_backup_jobs_id'), 'backup_jobs', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_backup_jobs_id'), table_name='backup_jobs')
    op.drop_table('backup_jobs')

"""verify_existing_users

Revision ID: fa05396d7099
Revises: cc7219807028
Create Date: 2026-05-16 15:17:53.280582

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fa05396d7099'
down_revision: Union[str, None] = 'cc7219807028'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use inspector to check if columns exist
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('users')]

    # Use batch_alter_table for compatibility
    with op.batch_alter_table('users', schema=None) as batch_op:
        if 'is_verified' not in columns:
            batch_op.add_column(sa.Column('is_verified', sa.Boolean(), nullable=True, server_default=sa.text('0')))
        if 'verification_token' not in columns:
            batch_op.add_column(sa.Column('verification_token', sa.String(length=255), nullable=True))
    
    # Critical: Set all existing users to verified
    # This works regardless of whether the columns were just added or already existed
    op.execute("UPDATE users SET is_verified = TRUE")


def downgrade() -> None:
    # Downgrade only if we want to revert verification (not recommended for data migrations)
    pass

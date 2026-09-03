"""add_user_company_links

Revision ID: b7c8d9e0f1a2
Revises: 675537ce7a0f
Create Date: 2026-05-05
"""
from alembic import op
import sqlalchemy as sa

revision = 'b7c8d9e0f1a2'
down_revision = '675537ce7a0f'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Create the many-to-many association table
    op.create_table(
        'user_company_links',
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('company_id', sa.Integer(), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(50), nullable=True),          # Optional: override role per company
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('user_id', 'company_id')
    )
    op.create_index('ix_user_company_links_user_id',    'user_company_links', ['user_id'])
    op.create_index('ix_user_company_links_company_id', 'user_company_links', ['company_id'])

    # 2. Seed: migrate every existing company_id from users → new table (only if company_id column exists)
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('users')]
    if 'company_id' in columns:
        op.execute("""
            INSERT INTO user_company_links (user_id, company_id, role)
            SELECT id, company_id, role
            FROM users
            WHERE company_id IS NOT NULL
            ON CONFLICT DO NOTHING
        """)



def downgrade():
    op.drop_index('ix_user_company_links_company_id', table_name='user_company_links')
    op.drop_index('ix_user_company_links_user_id',    table_name='user_company_links')
    op.drop_table('user_company_links')

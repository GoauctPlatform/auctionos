"""add company_id to client notes and attachments

Revision ID: 96c8c0b7b949
Revises: fa05396d7099
Create Date: 2026-05-16 20:04:07.249400

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '96c8c0b7b949'
down_revision: Union[str, None] = 'fa05396d7099'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Safely add company_id to client_notes
    op.execute('''
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_notes' AND column_name='company_id') THEN 
                ALTER TABLE client_notes ADD COLUMN company_id INTEGER;
                ALTER TABLE client_notes ADD CONSTRAINT fk_client_notes_company_id FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
            END IF; 
        END $$;
    ''')
    op.execute('CREATE INDEX IF NOT EXISTS ix_client_notes_company_id ON client_notes (company_id);')

    # Safely add company_id to client_attachments
    op.execute('''
        DO $$ 
        BEGIN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_attachments' AND column_name='company_id') THEN 
                ALTER TABLE client_attachments ADD COLUMN company_id INTEGER;
                ALTER TABLE client_attachments ADD CONSTRAINT fk_client_attachments_company_id FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL;
            END IF; 
        END $$;
    ''')
    op.execute('CREATE INDEX IF NOT EXISTS ix_client_attachments_company_id ON client_attachments (company_id);')


def downgrade() -> None:
    op.execute('DROP INDEX IF EXISTS ix_client_attachments_company_id;')
    op.execute('ALTER TABLE client_attachments DROP COLUMN IF EXISTS company_id;')
    
    op.execute('DROP INDEX IF EXISTS ix_client_notes_company_id;')
    op.execute('ALTER TABLE client_notes DROP COLUMN IF EXISTS company_id;')

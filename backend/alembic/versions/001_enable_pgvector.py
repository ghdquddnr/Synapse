"""Enable pgvector extension

Revision ID: 001
Revises:
Create Date: 2025-10-15 09:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Enable pgvector extension"""
    # Create pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")


def downgrade() -> None:
    """Disable pgvector extension"""
    # Drop pgvector extension
    op.execute("DROP EXTENSION IF EXISTS vector")

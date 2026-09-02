"""Add explicit tariff matching fields

Revision ID: 024f3d668922
Revises: e3e6de96c90f
Create Date: 2026-09-01 19:37:28.903287

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '024f3d668922'
down_revision: Union[str, Sequence[str], None] = 'e3e6de96c90f'
branch_labels: Union[str, Sequence[str], None] = None
def upgrade() -> None:
    """Upgrade schema safely."""
    bind = op.get_bind()
    insp = sa.inspect(bind)
    
    # Safely add columns if they don't exist
    facility_cols = [c['name'] for c in insp.get_columns('facilities')] if insp.has_table('facilities') else []
    if 'country' not in facility_cols:
        op.add_column('facilities', sa.Column('country', sa.String(length=100), nullable=True))
        
    product_cols = [c['name'] for c in insp.get_columns('products')] if insp.has_table('products') else []
    if 'hs_code' not in product_cols:
        op.add_column('products', sa.Column('hs_code', sa.String(length=100), nullable=True))

def downgrade() -> None:
    """Downgrade schema."""
    pass


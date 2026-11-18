"""Seed default designations for all schools

Revision ID: 0033_seed_default_designations
Revises: b60b1bae775e
Create Date: 2026-03-05 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid
from datetime import datetime, timezone

# revision identifiers, used by Alembic.
revision: str = '0033_seed_default_designations'
down_revision: str = 'b60b1bae775e'
branch_labels = None
depends_on = None

# Default designations to seed for every school
DEFAULT_DESIGNATIONS = [
    {'title': 'Principal',     'code': 'PRIN', 'level': 1, 'description': 'School Principal'},
    {'title': 'Vice Principal','code': 'VPRIN','level': 2, 'description': 'Vice Principal'},
    {'title': 'Admin',         'code': 'ADM',  'level': 3, 'description': 'Administrative Staff'},
    {'title': 'Head Teacher',  'code': 'HTCH', 'level': 4, 'description': 'Head of Department / Senior Teacher'},
    {'title': 'Teacher',       'code': 'TCH',  'level': 5, 'description': 'Teaching Staff'},
    {'title': 'Librarian',     'code': 'LIB',  'level': 6, 'description': 'Library Staff'},
    {'title': 'Lab Assistant', 'code': 'LAB',  'level': 7, 'description': 'Laboratory Assistant'},
    {'title': 'Support Staff', 'code': 'SUP',  'level': 8, 'description': 'General Support Staff'},
]


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # Only run if designations table exists
    if 'designations' not in insp.get_table_names():
        return

    now = datetime.now(timezone.utc)

    # Get all school IDs
    schools = bind.execute(sa.text("SELECT id FROM schools WHERE is_active = true")).fetchall()

    for (school_id,) in schools:
        for desig in DEFAULT_DESIGNATIONS:
            # Check if this code already exists for this school
            existing = bind.execute(
                sa.text(
                    "SELECT id FROM designations WHERE school_id = :school_id AND code = :code LIMIT 1"
                ),
                {'school_id': school_id, 'code': desig['code']}
            ).fetchone()

            if not existing:
                bind.execute(
                    sa.text(
                        """
                        INSERT INTO designations
                            (id, school_id, title, code, level, description, is_active, created_at)
                        VALUES
                            (:id, :school_id, :title, :code, :level, :description, true, :created_at)
                        """
                    ),
                    {
                        'id': uuid.uuid4(),
                        'school_id': school_id,
                        'title': desig['title'],
                        'code': desig['code'],
                        'level': desig['level'],
                        'description': desig['description'],
                        'created_at': now,
                    }
                )


def downgrade() -> None:
    # Remove only the seeded designations (by code) for all schools
    # that have no staff assigned to them
    bind = op.get_bind()
    codes = [d['code'] for d in DEFAULT_DESIGNATIONS]
    codes_placeholder = ', '.join(f"'{c}'" for c in codes)
    bind.execute(
        sa.text(
            f"""
            DELETE FROM designations
            WHERE code IN ({codes_placeholder})
              AND id NOT IN (SELECT DISTINCT designation_id FROM staff WHERE designation_id IS NOT NULL)
            """
        )
    )

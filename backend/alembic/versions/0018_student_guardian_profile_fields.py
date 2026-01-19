from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "0018"
down_revision = "0017"
branch_labels = None
depends_on = None


def _add_column_if_missing(table_name: str, column: sa.Column) -> None:
    bind = op.get_bind()
    existing = {c["name"] for c in inspect(bind).get_columns(table_name)}
    if column.name not in existing:
        op.add_column(table_name, column)


def upgrade() -> None:
    _add_column_if_missing("students", sa.Column("full_name_bc", sa.String(length=200), nullable=True))
    _add_column_if_missing("students", sa.Column("place_of_birth", sa.String(length=100), nullable=True))
    _add_column_if_missing("students", sa.Column("nationality", sa.String(length=64), nullable=True))
    _add_column_if_missing("students", sa.Column("religion", sa.String(length=64), nullable=True))
    _add_column_if_missing("students", sa.Column("blood_group", sa.String(length=8), nullable=True))

    _add_column_if_missing("students", sa.Column("admission_date", sa.Date(), nullable=True))
    _add_column_if_missing(
        "students",
        sa.Column("admission_status", sa.String(length=32), nullable=False, server_default=sa.text("'pending'")),
    )
    _add_column_if_missing("students", sa.Column("medium", sa.String(length=32), nullable=True))
    _add_column_if_missing("students", sa.Column("shift", sa.String(length=32), nullable=True))
    _add_column_if_missing("students", sa.Column("previous_school_name", sa.String(length=200), nullable=True))
    _add_column_if_missing("students", sa.Column("previous_class", sa.String(length=64), nullable=True))
    _add_column_if_missing("students", sa.Column("transfer_certificate_no", sa.String(length=64), nullable=True))

    _add_column_if_missing("students", sa.Column("present_address", sa.String(length=500), nullable=True))
    _add_column_if_missing("students", sa.Column("permanent_address", sa.String(length=500), nullable=True))
    _add_column_if_missing("students", sa.Column("city", sa.String(length=100), nullable=True))
    _add_column_if_missing("students", sa.Column("thana", sa.String(length=100), nullable=True))
    _add_column_if_missing("students", sa.Column("postal_code", sa.String(length=20), nullable=True))
    _add_column_if_missing("students", sa.Column("emergency_contact_name", sa.String(length=200), nullable=True))
    _add_column_if_missing("students", sa.Column("emergency_contact_phone", sa.String(length=32), nullable=True))

    _add_column_if_missing("students", sa.Column("known_allergies", sa.String(length=500), nullable=True))
    _add_column_if_missing("students", sa.Column("chronic_illness", sa.String(length=500), nullable=True))
    _add_column_if_missing("students", sa.Column("physical_disabilities", sa.String(length=500), nullable=True))
    _add_column_if_missing("students", sa.Column("special_needs", sa.String(length=500), nullable=True))
    _add_column_if_missing("students", sa.Column("doctor_name", sa.String(length=200), nullable=True))
    _add_column_if_missing("students", sa.Column("doctor_phone", sa.String(length=32), nullable=True))
    _add_column_if_missing("students", sa.Column("vaccination_status", sa.String(length=100), nullable=True))

    _add_column_if_missing("students", sa.Column("birth_certificate_no", sa.String(length=64), nullable=True))
    _add_column_if_missing("students", sa.Column("national_id_no", sa.String(length=64), nullable=True))
    _add_column_if_missing("students", sa.Column("passport_no", sa.String(length=64), nullable=True))

    _add_column_if_missing("students", sa.Column("fee_category", sa.String(length=64), nullable=True))
    _add_column_if_missing("students", sa.Column("scholarship_type", sa.String(length=64), nullable=True))
    _add_column_if_missing("students", sa.Column("portal_username", sa.String(length=64), nullable=True))
    _add_column_if_missing(
        "students",
        sa.Column("portal_access_student", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    _add_column_if_missing(
        "students",
        sa.Column("portal_access_parent", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    _add_column_if_missing("students", sa.Column("remarks", sa.String(length=1000), nullable=True))

    _add_column_if_missing("students", sa.Column("rfid_nfc_no", sa.String(length=64), nullable=True))
    _add_column_if_missing("students", sa.Column("hostel_status", sa.String(length=32), nullable=True))
    _add_column_if_missing("students", sa.Column("library_card_no", sa.String(length=64), nullable=True))

    _add_column_if_missing("guardians", sa.Column("occupation", sa.String(length=100), nullable=True))
    _add_column_if_missing("guardians", sa.Column("id_number", sa.String(length=64), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    insp = inspect(bind)

    if "students" in insp.get_table_names():
        cols = {c["name"] for c in insp.get_columns("students")}
        for name in [
            "library_card_no",
            "hostel_status",
            "rfid_nfc_no",
            "remarks",
            "portal_access_parent",
            "portal_access_student",
            "portal_username",
            "scholarship_type",
            "fee_category",
            "passport_no",
            "national_id_no",
            "birth_certificate_no",
            "vaccination_status",
            "doctor_phone",
            "doctor_name",
            "special_needs",
            "physical_disabilities",
            "chronic_illness",
            "known_allergies",
            "emergency_contact_phone",
            "emergency_contact_name",
            "postal_code",
            "thana",
            "city",
            "permanent_address",
            "present_address",
            "transfer_certificate_no",
            "previous_class",
            "previous_school_name",
            "shift",
            "medium",
            "admission_status",
            "admission_date",
            "blood_group",
            "religion",
            "nationality",
            "place_of_birth",
            "full_name_bc",
        ]:
            if name in cols:
                op.drop_column("students", name)

    if "guardians" in insp.get_table_names():
        cols = {c["name"] for c in insp.get_columns("guardians")}
        for name in ["id_number", "occupation"]:
            if name in cols:
                op.drop_column("guardians", name)


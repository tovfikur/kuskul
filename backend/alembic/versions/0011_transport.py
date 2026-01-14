"""transport vehicles routes stops assignments

Revision ID: 0011_transport
Revises: 0010_library
Create Date: 2026-01-14
"""

from alembic import op
import sqlalchemy as sa


revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "transport_vehicles",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("registration_no", sa.String(length=64), nullable=True),
        sa.Column("capacity", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("driver_name", sa.String(length=150), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default=sa.text("'active'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_transport_vehicles_school_id", "transport_vehicles", ["school_id"])

    op.create_table(
        "transport_routes",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=True),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_transport_routes_school_id", "transport_routes", ["school_id"])

    op.create_table(
        "transport_route_stops",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("route_id", sa.Uuid(as_uuid=True), sa.ForeignKey("transport_routes.id"), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("pickup_time", sa.Time(), nullable=True),
        sa.Column("drop_time", sa.Time(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_transport_route_stops_route_id", "transport_route_stops", ["route_id"])

    op.create_table(
        "student_transport_assignments",
        sa.Column("id", sa.Uuid(as_uuid=True), primary_key=True),
        sa.Column("school_id", sa.Uuid(as_uuid=True), sa.ForeignKey("schools.id"), nullable=False),
        sa.Column("student_id", sa.Uuid(as_uuid=True), sa.ForeignKey("students.id"), nullable=False),
        sa.Column("route_id", sa.Uuid(as_uuid=True), sa.ForeignKey("transport_routes.id"), nullable=False),
        sa.Column("stop_id", sa.Uuid(as_uuid=True), sa.ForeignKey("transport_route_stops.id"), nullable=True),
        sa.Column("vehicle_id", sa.Uuid(as_uuid=True), sa.ForeignKey("transport_vehicles.id"), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default=sa.text("'active'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_student_transport_assignments_school_id", "student_transport_assignments", ["school_id"])
    op.create_index("ix_student_transport_assignments_student_id", "student_transport_assignments", ["student_id"])
    op.create_index("ix_student_transport_assignments_route_id", "student_transport_assignments", ["route_id"])
    op.create_index("ix_student_transport_assignments_stop_id", "student_transport_assignments", ["stop_id"])
    op.create_index("ix_student_transport_assignments_vehicle_id", "student_transport_assignments", ["vehicle_id"])


def downgrade() -> None:
    op.drop_index("ix_student_transport_assignments_vehicle_id", table_name="student_transport_assignments")
    op.drop_index("ix_student_transport_assignments_stop_id", table_name="student_transport_assignments")
    op.drop_index("ix_student_transport_assignments_route_id", table_name="student_transport_assignments")
    op.drop_index("ix_student_transport_assignments_student_id", table_name="student_transport_assignments")
    op.drop_index("ix_student_transport_assignments_school_id", table_name="student_transport_assignments")
    op.drop_table("student_transport_assignments")

    op.drop_index("ix_transport_route_stops_route_id", table_name="transport_route_stops")
    op.drop_table("transport_route_stops")

    op.drop_index("ix_transport_routes_school_id", table_name="transport_routes")
    op.drop_table("transport_routes")

    op.drop_index("ix_transport_vehicles_school_id", table_name="transport_vehicles")
    op.drop_table("transport_vehicles")


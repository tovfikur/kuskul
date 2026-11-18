from logging.config import fileConfig

from alembic import context
from sqlalchemy import Column, MetaData, String, Table, engine_from_config, inspect, pool

from app.core.config import settings
from app.db.base import Base

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

_VERSION_TABLE = "alembic_version"
_VERSION_COLUMN = "version_num"
_VERSION_COLUMN_LENGTH = 255


def ensure_version_table_capacity(connection) -> None:
    version_table = Table(
        _VERSION_TABLE,
        MetaData(),
        Column(_VERSION_COLUMN, String(_VERSION_COLUMN_LENGTH), primary_key=True),
    )
    version_table.create(bind=connection, checkfirst=True)

    columns = {
        column["name"]: column for column in inspect(connection).get_columns(_VERSION_TABLE)
    }
    column = columns.get(_VERSION_COLUMN)
    if column is None:
        return

    current_length = getattr(column.get("type"), "length", None)
    if current_length is None or current_length >= _VERSION_COLUMN_LENGTH:
        return

    dialect = connection.dialect.name
    if dialect == "postgresql":
        connection.exec_driver_sql(
            f"ALTER TABLE {_VERSION_TABLE} ALTER COLUMN {_VERSION_COLUMN} TYPE VARCHAR({_VERSION_COLUMN_LENGTH})"
        )
    elif dialect == "mysql":
        connection.exec_driver_sql(
            f"ALTER TABLE {_VERSION_TABLE} MODIFY {_VERSION_COLUMN} VARCHAR({_VERSION_COLUMN_LENGTH}) NOT NULL"
        )


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        ensure_version_table_capacity(connection)
        connection.commit()
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

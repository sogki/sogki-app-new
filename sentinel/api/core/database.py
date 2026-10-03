from collections.abc import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from api.core.config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()
connect_args = {"check_same_thread": False} if settings.sqlalchemy_url.startswith("sqlite") else {}
engine = create_engine(settings.sqlalchemy_url, future=True, connect_args=connect_args)

if settings.sqlalchemy_url.startswith("sqlite"):

    @event.listens_for(engine, "connect")
    def _sqlite_fk(dbapi_connection, _connection_record):  # type: ignore[no-untyped-def]
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    # Import models so metadata is populated.
    from api import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _ensure_finding_triage_columns()


def _ensure_finding_triage_columns() -> None:
    """Add triage columns on existing SQLite/Postgres DBs created before triage existed."""
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if "sentinel_findings" not in insp.get_table_names():
        return
    existing = {col["name"] for col in insp.get_columns("sentinel_findings")}
    statements: list[str] = []
    if "triage_status" not in existing:
        statements.append(
            "ALTER TABLE sentinel_findings ADD COLUMN triage_status VARCHAR(32) DEFAULT 'open'"
        )
    if "triage_notes" not in existing:
        statements.append(
            "ALTER TABLE sentinel_findings ADD COLUMN triage_notes TEXT DEFAULT ''"
        )
    if not statements:
        return
    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))
        # Backfill nulls on SQLite after ADD COLUMN without NOT NULL
        conn.execute(
            text(
                "UPDATE sentinel_findings SET triage_status = 'open' "
                "WHERE triage_status IS NULL"
            )
        )
        conn.execute(
            text(
                "UPDATE sentinel_findings SET triage_notes = '' "
                "WHERE triage_notes IS NULL"
            )
        )

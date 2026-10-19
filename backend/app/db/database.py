from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from backend.app.config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {},
    future=True,
)
session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)


def get_db() -> Generator[Session, None, None]:
    db = session_local()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from backend.app.db import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    columns = {column["name"] for column in inspect(engine).get_columns("invoice_header")}
    with engine.begin() as connection:
        if "terms_and_conditions" not in columns:
            connection.execute(text("ALTER TABLE invoice_header ADD COLUMN terms_and_conditions TEXT DEFAULT ''"))
        if "discount_amount" not in columns:
            connection.execute(text("ALTER TABLE invoice_header ADD COLUMN discount_amount FLOAT DEFAULT 0"))
        if "billing_address" not in columns:
            connection.execute(text("ALTER TABLE invoice_header ADD COLUMN billing_address TEXT DEFAULT ''"))
        if "shipping_address" not in columns:
            connection.execute(text("ALTER TABLE invoice_header ADD COLUMN shipping_address TEXT DEFAULT ''"))
        if "delivery_spoc" not in columns:
            connection.execute(text("ALTER TABLE invoice_header ADD COLUMN delivery_spoc VARCHAR(255) DEFAULT ''"))
        if "delivery_date" not in columns:
            connection.execute(text("ALTER TABLE invoice_header ADD COLUMN delivery_date DATE"))

from __future__ import annotations

from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from backend.database.base import Base


def build_engine(db_path: Path):
    db_path.parent.mkdir(parents=True, exist_ok=True)
    return create_engine(f"sqlite:///{db_path}", future=True)


def build_session_factory(engine):
    return sessionmaker(bind=engine, class_=Session, autoflush=False, autocommit=False)


def initialize_database(engine) -> None:
    Base.metadata.create_all(bind=engine)


def get_db(session_factory) -> Generator[Session, None, None]:
    session = session_factory()
    try:
        yield session
    finally:
        session.close()

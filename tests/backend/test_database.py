from __future__ import annotations

from pathlib import Path

from backend.database.models import Conversation
from backend.database.session import build_engine, build_session_factory, initialize_database


def test_database_creation(tmp_path: Path) -> None:
    db_file = tmp_path / "test.sqlite3"
    engine = build_engine(db_file)
    initialize_database(engine)
    session_factory = build_session_factory(engine)
    session = session_factory()

    convo = Conversation(title="test")
    session.add(convo)
    session.commit()

    rows = session.query(Conversation).all()
    assert len(rows) == 1
    assert rows[0].title == "test"
    session.close()

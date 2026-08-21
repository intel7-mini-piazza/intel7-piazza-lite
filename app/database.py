"""Database connection, initialization, and user lookup module for Piazza-Lite."""

import os
import sqlite3
from contextlib import contextmanager
from typing import Generator, Optional


def get_db_path() -> str:
    """Resolve database path from environment variable or fallback path."""
    env_path = os.getenv("CLASSROOM_DB_PATH")
    if env_path and env_path.strip():
        return os.path.abspath(env_path.strip())
    # Default fallback path
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "classroom.db"))


def verify_db_exists(db_path: Optional[str] = None) -> str:
    """Verify that the database file exists and contains the required users table.
    
    Raises:
        FileNotFoundError: If the database file does not exist.
        RuntimeError: If the database exists but lacks a users table.
    """
    path = db_path or get_db_path()
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Database file not found at '{path}'. "
            "Piazza-Lite requires an existing classroom database. "
            "Please configure CLASSROOM_DB_PATH or supply data/classroom.db."
        )

    # Check for users table
    with sqlite3.connect(f"file:{path}?mode=ro", uri=True) as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if not cursor.fetchone():
            raise RuntimeError(
                f"Database at '{path}' does not contain the required 'users' table from the chat application."
            )

    return path


@contextmanager
def get_db_connection(db_path: Optional[str] = None) -> Generator[sqlite3.Connection, None, None]:
    """Context manager for SQLite connections with foreign keys and row factory."""
    path = db_path or get_db_path()
    conn = sqlite3.connect(path, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA busy_timeout = 10000;")
    try:
        yield conn
    finally:
        conn.close()


def init_db(db_path: Optional[str] = None) -> None:
    """Initialize WAL mode and ensure Piazza-Lite tables exist without modifying users table."""
    path = verify_db_exists(db_path)

    with get_db_connection(path) as conn:
        # Enable WAL mode for concurrent readers/writers
        conn.execute("PRAGMA journal_mode = WAL;")

        # Create Piazza-Lite questions table
        conn.execute("""
        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            tag TEXT NOT NULL,
            accepted_answer_id INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        """)

        # Create Piazza-Lite answers table
        conn.execute("""
        CREATE TABLE IF NOT EXISTS answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            body TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(question_id) REFERENCES questions(id) ON DELETE CASCADE,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
        """)

        # Indexes for query performance
        conn.execute("CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);")

        conn.commit()


def resolve_user_id(conn: sqlite3.Connection, nickname: str) -> Optional[int]:
    """Look up an existing user by nickname / normalized_username / display_name.
    
    Returns the user id if found, or None. Strictly read-only; no new users are inserted.
    """
    clean_name = nickname.strip()
    if not clean_name:
        return None

    normalized = clean_name.lower()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id FROM users
        WHERE normalized_username = ?
           OR username = ?
           OR display_name = ?
        ORDER BY id ASC
        LIMIT 1
        """,
        (normalized, clean_name, clean_name),
    )
    row = cursor.fetchone()
    if row:
        return int(row["id"])
    return None

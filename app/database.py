"""Database connection, initialization, and authentication module for Bamboo-Stack (대나무지식인)."""

import hashlib
import logging
import os
import secrets
import sqlite3
import unicodedata
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from typing import Generator, Optional

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

logger = logging.getLogger("bamboo-stack.database")

# Argon2 Password Hasher matching BambooChat configuration
_PASSWORD_HASHER = PasswordHasher(
    time_cost=2,
    memory_cost=19456,
    parallelism=1,
)

SESSION_LIFETIME_HOURS = 12


def normalize_username(username: str) -> str:
    """Normalize username exactly like BambooChat using NFKC and casefold."""
    return unicodedata.normalize("NFKC", username).strip().casefold()


def verify_password(stored_hash: str, supplied_password: str) -> bool:
    """Verify password against stored Argon2id hash without exposing details."""
    if not stored_hash or not supplied_password:
        return False
    try:
        return _PASSWORD_HASHER.verify(stored_hash, supplied_password)
    except (InvalidHashError, VerificationError, VerifyMismatchError):
        return False
    except Exception as e:
        logger.warning(f"Unexpected password verification exception: {type(e).__name__}")
        return False


def hash_session_token(raw_token: str) -> str:
    """Compute SHA-256 hex digest of raw session token."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def get_db_path() -> str:
    """Resolve database path from environment variable or fallback path."""
    env_path = os.getenv("CLASSROOM_DB_PATH")
    if env_path and env_path.strip():
        return os.path.abspath(env_path.strip())
    # Default fallback path
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "classroom.db"))


def verify_db_exists(db_path: Optional[str] = None) -> str:
    """Verify that the database file exists and contains the required users table."""
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
    """Initialize WAL mode and ensure Piazza-Lite tables exist without modifying chat tables."""
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

        # Create Piazza-Lite sessions table
        conn.execute("""
        CREATE TABLE IF NOT EXISTS piazza_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token_hash TEXT NOT NULL UNIQUE,
            user_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        """)

        # Indexes for query performance
        conn.execute("CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_piazza_sessions_expires_at ON piazza_sessions(expires_at);")

        conn.commit()


def authenticate_user(conn: sqlite3.Connection, username: str, password: str) -> Optional[dict]:
    """Authenticate user against shared users table. Returns safe user dict if valid and active."""
    if not username or not password:
        return None

    clean_username = normalize_username(username)
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, username, display_name, role, active, password_hash
        FROM users
        WHERE normalized_username = ?
        """,
        (clean_username,),
    )
    row = cursor.fetchone()
    if not row:
        return None

    # Check password
    if not verify_password(row["password_hash"], password):
        return None

    # Check active status
    if int(row["active"]) != 1:
        return None

    display = (row["display_name"] or "").strip() or row["username"]
    return {
        "id": int(row["id"]),
        "username": row["username"],
        "display_name": display,
        "role": row["role"],
    }


def create_piazza_session(conn: sqlite3.Connection, user_id: int) -> str:
    """Create a new 12-hour session for user. Returns raw opaque token."""
    delete_expired_piazza_sessions(conn)
    raw_token = secrets.token_urlsafe(32)
    token_h = hash_session_token(raw_token)
    now = datetime.now(timezone.utc)
    expires_at = (now + timedelta(hours=SESSION_LIFETIME_HOURS)).strftime("%Y-%m-%dT%H:%M:%SZ")
    now_str = now.strftime("%Y-%m-%dT%H:%M:%SZ")

    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO piazza_sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
        (token_h, user_id, now_str, expires_at),
    )
    conn.commit()
    return raw_token


def get_piazza_session_user(conn: sqlite3.Connection, raw_token: str) -> Optional[dict]:
    """Retrieve authenticated safe user from raw session cookie."""
    if not raw_token or not raw_token.strip():
        return None
    token_h = hash_session_token(raw_token.strip())
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT u.id, u.username, u.display_name, u.role, u.active
        FROM piazza_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1
        """,
        (token_h, now_str),
    )
    row = cursor.fetchone()
    if not row:
        return None

    display = (row["display_name"] or "").strip() or row["username"]
    return {
        "id": int(row["id"]),
        "username": row["username"],
        "display_name": display,
        "role": row["role"],
    }


def delete_piazza_session(conn: sqlite3.Connection, raw_token: str) -> None:
    """Delete session by raw token."""
    if not raw_token or not raw_token.strip():
        return
    token_h = hash_session_token(raw_token.strip())
    cursor = conn.cursor()
    cursor.execute("DELETE FROM piazza_sessions WHERE token_hash = ?", (token_h,))
    conn.commit()


def delete_expired_piazza_sessions(conn: sqlite3.Connection) -> int:
    """Prune expired sessions."""
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    cursor = conn.cursor()
    cursor.execute("DELETE FROM piazza_sessions WHERE expires_at <= ?", (now_str,))
    conn.commit()
    return cursor.rowcount

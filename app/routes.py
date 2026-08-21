"""API route handlers for Piazza-Lite forum endpoints."""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.database import get_db_connection, get_db_path, resolve_user_id
from app.schemas import (
    AnswerCreate,
    AnswerResponse,
    HealthResponse,
    QuestionCreate,
    QuestionCreatedResponse,
    QuestionDetailResponse,
    QuestionSummaryResponse,
)

router = APIRouter(prefix="/api", tags=["Piazza"])


def now_iso() -> str:
    """Return current UTC ISO-8601 formatted string."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


@router.get("/health", response_model=HealthResponse)
def health_check():
    """Health check endpoint confirming service and database connectivity."""
    db_path = get_db_path()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        user_count = cursor.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        question_count = cursor.execute("SELECT COUNT(*) FROM questions").fetchone()[0]

    return HealthResponse(
        status="ok",
        database=db_path,
        user_count=user_count,
        question_count=question_count,
    )


@router.get("/questions", response_model=List[QuestionSummaryResponse])
def list_questions(search: Optional[str] = Query(None, description="Optional search term")):
    """List questions newest-first with author, answer count, and solved state."""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        query = """
        SELECT 
            q.id,
            q.title,
            COALESCE(u.display_name, u.username, 'Anonymous') AS author,
            q.tag,
            (SELECT COUNT(*) FROM answers a WHERE a.question_id = q.id) AS answer_count,
            (q.accepted_answer_id IS NOT NULL) AS solved,
            q.created_at
        FROM questions q
        JOIN users u ON q.user_id = u.id
        """
        params = []

        if search and search.strip():
            clean_search = f"%{search.strip()}%"
            query += " WHERE (q.title LIKE ? OR q.body LIKE ? OR q.tag LIKE ?)"
            params.extend([clean_search, clean_search, clean_search])

        query += " ORDER BY q.created_at DESC, q.id DESC"

        rows = cursor.execute(query, params).fetchall()

        results = []
        for row in rows:
            results.append(
                QuestionSummaryResponse(
                    id=row["id"],
                    title=row["title"],
                    author=row["author"],
                    tag=row["tag"],
                    answer_count=row["answer_count"],
                    solved=bool(row["solved"]),
                    created_at=row["created_at"],
                )
            )
        return results


@router.post("/questions", response_model=QuestionCreatedResponse, status_code=status.HTTP_201_CREATED)
def create_question(payload: QuestionCreate):
    """Create a new question. Requires existing user account from chat app."""
    with get_db_connection() as conn:
        user_id = resolve_user_id(conn, payload.author)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User '{payload.author}' not found. Please create an account in the chat app first.",
            )

        ts = now_iso()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO questions (user_id, title, body, tag, accepted_answer_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, NULL, ?, ?)
            """,
            (user_id, payload.title, payload.body, payload.tag, ts, ts),
        )
        question_id = cursor.lastrowid
        conn.commit()

        # Fetch inserted question with canonical author name
        cursor.execute(
            """
            SELECT q.id, q.title, q.body, q.tag, COALESCE(u.display_name, u.username) AS author,
                   q.accepted_answer_id, q.created_at, q.updated_at
            FROM questions q
            JOIN users u ON q.user_id = u.id
            WHERE q.id = ?
            """,
            (question_id,),
        )
        row = cursor.fetchone()

        return QuestionCreatedResponse(
            id=row["id"],
            title=row["title"],
            body=row["body"],
            tag=row["tag"],
            author=row["author"],
            accepted_answer_id=row["accepted_answer_id"],
            solved=row["accepted_answer_id"] is not None,
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )


@router.get("/questions/{question_id}", response_model=QuestionDetailResponse)
def get_question_detail(question_id: int):
    """Retrieve full question detail with all answers (oldest-first)."""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Fetch question
        cursor.execute(
            """
            SELECT q.id, q.title, q.body, q.tag, COALESCE(u.display_name, u.username) AS author,
                   q.accepted_answer_id, q.created_at, q.updated_at
            FROM questions q
            JOIN users u ON q.user_id = u.id
            WHERE q.id = ?
            """,
            (question_id,),
        )
        q_row = cursor.fetchone()
        if not q_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

        accepted_id = q_row["accepted_answer_id"]

        # Fetch answers
        cursor.execute(
            """
            SELECT a.id, a.question_id, a.body, a.created_at,
                   COALESCE(u.display_name, u.username) AS author
            FROM answers a
            JOIN users u ON a.user_id = u.id
            WHERE a.question_id = ?
            ORDER BY a.created_at ASC, a.id ASC
            """,
            (question_id,),
        )
        a_rows = cursor.fetchall()

        answers = [
            AnswerResponse(
                id=a["id"],
                question_id=a["question_id"],
                author=a["author"],
                body=a["body"],
                accepted=(a["id"] == accepted_id),
                created_at=a["created_at"],
            )
            for a in a_rows
        ]

        return QuestionDetailResponse(
            id=q_row["id"],
            title=q_row["title"],
            body=q_row["body"],
            tag=q_row["tag"],
            author=q_row["author"],
            accepted_answer_id=accepted_id,
            solved=(accepted_id is not None),
            created_at=q_row["created_at"],
            updated_at=q_row["updated_at"],
            answers=answers,
        )


@router.post("/questions/{question_id}/answers", response_model=AnswerResponse, status_code=status.HTTP_201_CREATED)
def create_answer(question_id: int, payload: AnswerCreate):
    """Post an answer to a question. Requires existing user account from chat app."""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Check question exists
        cursor.execute("SELECT id FROM questions WHERE id = ?", (question_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

        # Resolve user
        user_id = resolve_user_id(conn, payload.author)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User '{payload.author}' not found. Please create an account in the chat app first.",
            )

        ts = now_iso()
        cursor.execute(
            """
            INSERT INTO answers (question_id, user_id, body, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (question_id, user_id, payload.body, ts),
        )
        answer_id = cursor.lastrowid

        # Update question updated_at
        cursor.execute("UPDATE questions SET updated_at = ? WHERE id = ?", (ts, question_id))
        conn.commit()

        # Fetch created answer
        cursor.execute(
            """
            SELECT a.id, a.question_id, a.body, a.created_at, COALESCE(u.display_name, u.username) AS author
            FROM answers a
            JOIN users u ON a.user_id = u.id
            WHERE a.id = ?
            """,
            (answer_id,),
        )
        a_row = cursor.fetchone()

        return AnswerResponse(
            id=a_row["id"],
            question_id=a_row["question_id"],
            author=a_row["author"],
            body=a_row["body"],
            accepted=False,
            created_at=a_row["created_at"],
        )


@router.post("/questions/{question_id}/accept/{answer_id}", response_model=QuestionDetailResponse)
def accept_answer(question_id: int, answer_id: int):
    """Accept an answer as the solution for a question."""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Check question exists
        cursor.execute("SELECT id FROM questions WHERE id = ?", (question_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

        # Check answer exists
        cursor.execute("SELECT id, question_id FROM answers WHERE id = ?", (answer_id,))
        ans_row = cursor.fetchone()
        if not ans_row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Answer not found")

        # Verify answer belongs to question
        if ans_row["question_id"] != question_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Answer does not belong to this question",
            )

        ts = now_iso()
        cursor.execute(
            "UPDATE questions SET accepted_answer_id = ?, updated_at = ? WHERE id = ?",
            (answer_id, ts, question_id),
        )
        conn.commit()

    return get_question_detail(question_id)

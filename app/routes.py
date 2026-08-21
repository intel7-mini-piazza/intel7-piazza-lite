"""API route handlers for Bamboo-Stack (대나무지식인) forum backend."""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status

from app.database import (
    authenticate_user,
    create_piazza_session,
    delete_piazza_session,
    get_db_connection,
    get_db_path,
    get_piazza_session_user,
)
from app.schemas import (
    AnswerCreate,
    AnswerResponse,
    AuthUserResponse,
    HealthResponse,
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    QuestionCreate,
    QuestionCreatedResponse,
    QuestionDetailResponse,
    QuestionSummaryResponse,
)

router = APIRouter()


def get_current_user(request: Request) -> dict:
    """FastAPI dependency to extract and authenticate current user from session cookie."""
    token = request.cookies.get("piazza_session")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    with get_db_connection() as conn:
        user = get_piazza_session_user(conn, token)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
            )
        return user


# ==============================================================================
# Health Check Endpoint (Public)
# ==============================================================================

@router.get("/api/health", response_model=HealthResponse, tags=["Health"])
def health_check():
    """Verify backend health, database connection, and record counts."""
    db_file = get_db_path()
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM users;")
            user_count = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM questions;")
            question_count = cursor.fetchone()[0]

        return HealthResponse(
            status="ok",
            database=db_file,
            user_count=user_count,
            question_count=question_count,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database check failed: {str(e)}",
        )


# ==============================================================================
# Authentication Endpoints
# ==============================================================================

@router.post("/api/auth/login", response_model=LoginResponse, tags=["Auth"])
def login(payload: LoginRequest, response: Response):
    """Authenticate user with BambooChat credentials and issue HttpOnly session cookie."""
    with get_db_connection() as conn:
        user = authenticate_user(conn, payload.username, payload.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password",
            )

        raw_token = create_piazza_session(conn, user["id"])
        response.set_cookie(
            key="piazza_session",
            value=raw_token,
            httponly=True,
            samesite="lax",
            path="/",
            max_age=43200,  # 12 hours
            secure=False,   # Local / Classroom LAN deployment
        )

        return LoginResponse(
            authenticated=True,
            user=AuthUserResponse(**user),
        )


@router.get("/api/auth/me", response_model=LoginResponse, tags=["Auth"])
def get_me(current_user: dict = Depends(get_current_user)):
    """Retrieve currently authenticated user identity."""
    return LoginResponse(
        authenticated=True,
        user=AuthUserResponse(**current_user),
    )


@router.post("/api/auth/logout", response_model=LogoutResponse, tags=["Auth"])
def logout(request: Request, response: Response):
    """Log out current user, prune session, and clear session cookie."""
    token = request.cookies.get("piazza_session")
    if token:
        with get_db_connection() as conn:
            delete_piazza_session(conn, token)

    response.delete_cookie(
        key="piazza_session",
        path="/",
        httponly=True,
        samesite="lax",
    )
    return LogoutResponse(success=True)


# ==============================================================================
# Questions Endpoints (Protected)
# ==============================================================================

@router.get("/api/questions", response_model=List[QuestionSummaryResponse], tags=["Questions"])
def list_questions(
    search: Optional[str] = Query(None, description="Search term for title, body, or tag"),
    current_user: dict = Depends(get_current_user),
):
    """List all questions ordered newest-first, with optional keyword search."""
    query = """
        SELECT
            q.id,
            q.title,
            COALESCE(NULLIF(TRIM(u.display_name), ''), u.username, 'Unknown') AS author,
            q.tag,
            COUNT(a.id) AS answer_count,
            (q.accepted_answer_id IS NOT NULL) AS solved,
            q.created_at
        FROM questions q
        LEFT JOIN users u ON q.user_id = u.id
        LEFT JOIN answers a ON q.id = a.question_id
    """
    params = []

    if search and search.strip():
        search_pattern = f"%{search.strip()}%"
        query += """
            WHERE (q.title LIKE ? OR q.body LIKE ? OR q.tag LIKE ?)
        """
        params.extend([search_pattern, search_pattern, search_pattern])

    query += """
        GROUP BY q.id
        ORDER BY q.created_at DESC;
    """

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]


@router.post("/api/questions", response_model=QuestionCreatedResponse, status_code=status.HTTP_201_CREATED, tags=["Questions"])
def create_question(
    payload: QuestionCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a new question authored by the authenticated user."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO questions (user_id, title, body, tag, accepted_answer_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, NULL, ?, ?)
            """,
            (current_user["id"], payload.title, payload.body, payload.tag, now, now),
        )
        conn.commit()
        question_id = cursor.lastrowid

        return QuestionCreatedResponse(
            id=question_id,
            title=payload.title,
            body=payload.body,
            tag=payload.tag,
            author=current_user["display_name"],
            accepted_answer_id=None,
            solved=False,
            created_at=now,
            updated_at=now,
        )


@router.get("/api/questions/{question_id}", response_model=QuestionDetailResponse, tags=["Questions"])
def get_question_detail(
    question_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Retrieve question details along with all answers ordered oldest-first."""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Retrieve question
        cursor.execute(
            """
            SELECT
                q.id,
                q.user_id,
                q.title,
                q.body,
                q.tag,
                COALESCE(NULLIF(TRIM(u.display_name), ''), u.username, 'Unknown') AS author,
                q.accepted_answer_id,
                (q.accepted_answer_id IS NOT NULL) AS solved,
                q.created_at,
                q.updated_at
            FROM questions q
            LEFT JOIN users u ON q.user_id = u.id
            WHERE q.id = ?
            """,
            (question_id,),
        )
        q_row = cursor.fetchone()
        if not q_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Question with ID {question_id} not found.",
            )

        # Retrieve answers
        cursor.execute(
            """
            SELECT
                a.id,
                a.question_id,
                COALESCE(NULLIF(TRIM(u.display_name), ''), u.username, 'Unknown') AS author,
                a.body,
                (a.id = ?) AS accepted,
                a.created_at
            FROM answers a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE a.question_id = ?
            ORDER BY a.created_at ASC;
            """,
            (q_row["accepted_answer_id"], question_id),
        )
        answer_rows = cursor.fetchall()
        answers = [
            AnswerResponse(
                id=row["id"],
                question_id=row["question_id"],
                author=row["author"],
                body=row["body"],
                accepted=bool(row["accepted"]),
                created_at=row["created_at"],
            )
            for row in answer_rows
        ]

        can_accept = (q_row["user_id"] == current_user["id"])

        return QuestionDetailResponse(
            id=q_row["id"],
            title=q_row["title"],
            body=q_row["body"],
            tag=q_row["tag"],
            author=q_row["author"],
            accepted_answer_id=q_row["accepted_answer_id"],
            solved=bool(q_row["solved"]),
            created_at=q_row["created_at"],
            updated_at=q_row["updated_at"],
            can_accept_answers=can_accept,
            answers=answers,
        )


@router.post("/api/questions/{question_id}/answers", response_model=AnswerResponse, status_code=status.HTTP_201_CREATED, tags=["Answers"])
def create_answer(
    question_id: int,
    payload: AnswerCreate,
    current_user: dict = Depends(get_current_user),
):
    """Post an answer to a question authored by the authenticated user."""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Verify question exists
        cursor.execute("SELECT id FROM questions WHERE id = ?", (question_id,))
        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Question with ID {question_id} not found.",
            )

        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        cursor.execute(
            """
            INSERT INTO answers (question_id, user_id, body, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (question_id, current_user["id"], payload.body, now),
        )
        conn.commit()
        answer_id = cursor.lastrowid

        return AnswerResponse(
            id=answer_id,
            question_id=question_id,
            author=current_user["display_name"],
            body=payload.body,
            accepted=False,
            created_at=now,
        )


@router.post("/api/questions/{question_id}/accept/{answer_id}", response_model=QuestionDetailResponse, tags=["Answers"])
def accept_answer(
    question_id: int,
    answer_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Mark an answer as accepted solution. Only the question author may accept answers."""
    with get_db_connection() as conn:
        cursor = conn.cursor()

        # 1. Verify question exists
        cursor.execute("SELECT id, user_id FROM questions WHERE id = ?", (question_id,))
        q_row = cursor.fetchone()
        if not q_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Question with ID {question_id} not found.",
            )

        # 2. Enforce question ownership
        if q_row["user_id"] != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the question author can accept an answer",
            )

        # 3. Verify answer exists
        cursor.execute("SELECT id, question_id FROM answers WHERE id = ?", (answer_id,))
        ans_row = cursor.fetchone()
        if not ans_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Answer with ID {answer_id} not found.",
            )

        # 4. Verify answer belongs to this question
        if ans_row["question_id"] != question_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Answer {answer_id} does not belong to question {question_id}.",
            )

        # 5. Update accepted_answer_id
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        cursor.execute(
            "UPDATE questions SET accepted_answer_id = ?, updated_at = ? WHERE id = ?",
            (answer_id, now, question_id),
        )
        conn.commit()

    return get_question_detail(question_id, current_user=current_user)

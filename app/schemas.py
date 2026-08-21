"""Pydantic schemas and contract models for Piazza-Lite."""

from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class QuestionCreate(BaseModel):
    """Payload for creating a new question."""
    author: str = Field(..., min_length=1, max_length=50, description="Nickname of existing chat user")
    title: str = Field(..., min_length=1, max_length=200, description="Question title")
    body: str = Field(..., min_length=1, max_length=10000, description="Question detailed body")
    tag: str = Field(..., min_length=1, max_length=50, description="Category or topic tag")

    @field_validator("author", "title", "body", "tag")
    @classmethod
    def check_not_whitespace(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Field cannot be empty or contain only whitespace.")
        return trimmed


class AnswerCreate(BaseModel):
    """Payload for posting an answer."""
    author: str = Field(..., min_length=1, max_length=50, description="Nickname of existing chat user")
    body: str = Field(..., min_length=1, max_length=10000, description="Answer content")

    @field_validator("author", "body")
    @classmethod
    def check_not_whitespace(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Field cannot be empty or contain only whitespace.")
        return trimmed


class AnswerResponse(BaseModel):
    """Representation of an answer in question details."""
    id: int
    question_id: int
    author: str
    body: str
    accepted: bool
    created_at: str


class QuestionSummaryResponse(BaseModel):
    """Representation of a question in list / search responses."""
    id: int
    title: str
    author: str
    tag: str
    answer_count: int
    solved: bool
    created_at: str


class QuestionDetailResponse(BaseModel):
    """Full question detail response including all answers."""
    id: int
    title: str
    body: str
    tag: str
    author: str
    accepted_answer_id: Optional[int] = None
    solved: bool
    created_at: str
    updated_at: str
    answers: List[AnswerResponse] = []


class QuestionCreatedResponse(BaseModel):
    """Response returned upon successful question creation."""
    id: int
    title: str
    body: str
    tag: str
    author: str
    accepted_answer_id: Optional[int] = None
    solved: bool
    created_at: str
    updated_at: str


class HealthResponse(BaseModel):
    """Health check endpoint response."""
    status: str = "ok"
    database: str
    user_count: int
    question_count: int

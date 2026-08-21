# Piazza-Lite Frontend Handoff & API Specification

**API Contract Status**: **FROZEN (Authenticated V2 - Single Workspace)**  
All question and answer interactions occur inside the Home two-column workspace.

---

## 1. Base URLs & Interactive Documentation

* **Local Development**: `http://127.0.0.1:8100`
* **Classroom LAN**: `http://HOST_IP:8100` *(Replace `HOST_IP` with backend server's IPv4)*
* **Interactive OpenAPI Docs**: `http://HOST_IP:8100/docs`
* **Raw OpenAPI JSON**: `http://HOST_IP:8100/openapi.json`

---

## 2. Architecture & URL Routing Model

* **Single-Workspace Layout**:
  - **Left**: Live feed and search (`#postFeed`).
  - **Right**: Workspace container (`#postDetail`).
* **Canonical URL States**:
  - Home / Welcome: `/`
  - Selected Question Detail: `/?post=<question_id>`
  - Question Composer: `/?compose=question`
  - `/ask.html` and `/question.html?id=<id>` automatically redirect to the canonical URLs.
* **Authentication**: HttpOnly cookie named `piazza_session` (12 hours).
* **401 Unauthorized**: Redirects to `login.html?next=<encoded_path>`.
* **403 Forbidden**: Only the question author can accept an answer solution.

---

## 3. Endpoints Overview

| Method | Endpoint | Auth Required | Description |
|---|---|:---:|---|
| `GET` | `/api/health` | No | Health check & database stats |
| `POST` | `/api/auth/login` | No | Authenticate user & issue cookie |
| `GET` | `/api/auth/me` | Yes | Get current user profile |
| `POST` | `/api/auth/logout` | No/Yes | Clear session & delete cookie |
| `GET` | `/api/questions` | Yes | List questions (newest-first, supports `?search=`) |
| `POST` | `/api/questions` | Yes | Create question (payload: `title`, `body`, `tag`) |
| `GET` | `/api/questions/{id}` | Yes | Detail with answers and `can_accept_answers` flag |
| `POST` | `/api/questions/{id}/answers` | Yes | Post answer (payload: `body`) |
| `POST` | `/api/questions/{id}/accept/{answer_id}` | Yes | Accept answer (Question Author only) |

---

## 4. Schemas & Payloads

### A. User Login (`POST /api/auth/login`)

**Request Body**:
```json
{
  "username": "sean",
  "password": "my_password"
}
```

**Success Response (`200 OK`)**:
```json
{
  "authenticated": true,
  "user": {
    "id": 7,
    "username": "sean",
    "display_name": "Sean Choi",
    "role": "student"
  }
}
```
*(Sets `piazza_session` HttpOnly cookie)*

---

### B. List / Search Questions (`GET /api/questions` / `GET /api/questions?search=servo`)

**Response (`200 OK`)**:
```json
[
  {
    "id": 1,
    "title": "Servo 모터가 90도로 회전하지 않고 진동만 합니다",
    "author": "khb",
    "tag": "Arduino",
    "answer_count": 2,
    "solved": true,
    "created_at": "2026-08-21T02:32:00Z"
  }
]
```

---

### C. Ask Question (`POST /api/questions`)

**Request Body**:
```json
{
  "title": "FastAPI에서 백그라운드 태스크 처리 방법",
  "body": "FastAPI BackgroundTasks를 사용할 때 주의할 점이 있을까요?",
  "tag": "FastAPI"
}
```

**Response (`201 Created`)**:
```json
{
  "id": 12,
  "title": "FastAPI에서 백그라운드 태스크 처리 방법",
  "body": "FastAPI BackgroundTasks를 사용할 때 주의할 점이 있을까요?",
  "tag": "FastAPI",
  "author": "Sean Choi",
  "accepted_answer_id": null,
  "solved": false,
  "created_at": "2026-08-21T02:34:00Z",
  "updated_at": "2026-08-21T02:34:00Z"
}
```

---

### D. Question Detail & Answers (`GET /api/questions/{id}`)

**Response (`200 OK`)**:
```json
{
  "id": 1,
  "title": "Servo 모터가 90도로 회전하지 않고 진동만 합니다",
  "body": "Arduino Uno 5V 핀에 SG90 서보모터를 연결하고 Servo.write(90)을 실행했는데 계속 드르륵거리며 진동만 합니다.",
  "tag": "Arduino",
  "author": "khb",
  "accepted_answer_id": 1,
  "solved": true,
  "created_at": "2026-08-21T02:32:00Z",
  "updated_at": "2026-08-21T02:32:00Z",
  "can_accept_answers": true,
  "answers": [
    {
      "id": 1,
      "question_id": 1,
      "author": "chw",
      "body": "별도의 외부 5V 전원 어댑터를 연결하세요.",
      "accepted": true,
      "created_at": "2026-08-21T02:32:00Z"
    }
  ]
}
```

---

### E. Post Answer (`POST /api/questions/{id}/answers`)

**Request Body**:
```json
{
  "body": "외부 5V 전원 공급 장치를 연결하고 아두이노와 GND를 공통 접지하세요."
}
```

**Response (`201 Created`)**:
```json
{
  "id": 10,
  "question_id": 1,
  "author": "Sean Choi",
  "body": "외부 5V 전원 공급 장치를 연결하고 아두이노와 GND를 공통 접지하세요.",
  "accepted": false,
  "created_at": "2026-08-21T02:35:00Z"
}
```

---

### F. Accept Answer (`POST /api/questions/{id}/accept/{answer_id}`)

**Request Body**: *(empty)*  
**Response (`200 OK`)**: Returns the updated `QuestionDetailResponse` with `solved = true` and `accepted = true`.

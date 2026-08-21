# Piazza-Lite Frontend Handoff & API Specification

**API Contract Status**: **FROZEN**  
No endpoints, request formats, or response JSON fields will change during this session.

---

## 1. Base URLs & Interactive Documentation

* **Local Development**: `http://127.0.0.1:8100`
* **Classroom LAN**: `http://HOST_IP:8100` *(Replace `HOST_IP` with backend server's IPv4)*
* **Interactive OpenAPI Docs**: `http://HOST_IP:8100/docs`
* **Raw OpenAPI JSON**: `http://HOST_IP:8100/openapi.json`

---

## 2. Authentication & Account Rules

* **No Auth Tokens / Headers Required**: You do not need to send `Authorization` headers or cookies.
* **Author Field**: In `POST` requests, supply `author` (the student's registered nickname).
* **Account Authority**: The chat application (`BambooChat`) is the single source of truth for accounts.
  * If a user posts using a nickname not registered in the chat app, the backend returns HTTP `400 Bad Request`:
    ```json
    {
      "detail": "User 'nickname' not found. Please create an account in the chat app first."
    }
    ```
  * Frontends should display this error message directly to the user.

---

## 3. Endpoints Overview

| Method | Endpoint | Success Status | Description |
|---|---|---:|---|
| `GET` | `/api/health` | 200 | Health check & database stats |
| `GET` | `/api/questions` | 200 | List all questions (newest-first) |
| `GET` | `/api/questions?search={query}` | 200 | Search questions by title, body, or tag |
| `POST` | `/api/questions` | 201 | Ask a new question |
| `GET` | `/api/questions/{question_id}` | 200 | Get full question detail with answers |
| `POST` | `/api/questions/{question_id}/answers` | 201 | Post an answer to a question |
| `POST` | `/api/questions/{question_id}/accept/{answer_id}` | 200 | Mark an answer as accepted solution |

---

## 4. Detailed Schemas & Real Response Examples

### A. List / Search Questions (`GET /api/questions` / `GET /api/questions?search=servo`)

**Response (`200 OK`)**: Array of question summaries.
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
  },
  {
    "id": 4,
    "title": "Docker 컨테이너 안의 웹 서버가 브라우저에서 접속이 안 됩니다",
    "author": "rjsxo342",
    "tag": "Docker",
    "answer_count": 1,
    "solved": false,
    "created_at": "2026-08-21T02:32:00Z"
  }
]
```

### B. Ask Question (`POST /api/questions`)

**Request Headers**: `Content-Type: application/json`  
**Request Body**:
```json
{
  "author": "admin",
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
  "author": "admin",
  "accepted_answer_id": null,
  "solved": false,
  "created_at": "2026-08-21T02:34:00Z",
  "updated_at": "2026-08-21T02:34:00Z"
}
```

### C. Question Detail & Answers (`GET /api/questions/{question_id}`)

**Response (`200 OK`)**:
```json
{
  "id": 1,
  "title": "Servo 모터가 90도로 회전하지 않고 진동만 합니다",
  "body": "Arduino Uno 5V 핀에 SG90 서보모터를 연결하고 Servo.write(90)을 실행했는데 계속 드르륵거리며 진동만 합니다. 코드는 기본 예제인데 전원 문제인가요?",
  "tag": "Arduino",
  "author": "khb",
  "accepted_answer_id": 1,
  "solved": true,
  "created_at": "2026-08-21T02:32:00Z",
  "updated_at": "2026-08-21T02:32:00Z",
  "answers": [
    {
      "id": 1,
      "question_id": 1,
      "author": "chw",
      "body": "Arduino 보드의 5V 핀은 전류 공급량이 제한되어 있어서 서보 모터 구동 시 전압 강하가 발생합니다. 별도의 외부 5V 전원 어댑터나 배터리를 서보에 연결하고 GND는 아두이노와 묶어주세요.",
      "accepted": true,
      "created_at": "2026-08-21T02:32:00Z"
    },
    {
      "id": 2,
      "question_id": 1,
      "author": "admin",
      "body": "서보 신호선(PWM) 핀 번호도 9번 핀에 잘 연결되어 있는지 확인해보세요.",
      "accepted": false,
      "created_at": "2026-08-21T02:32:00Z"
    }
  ]
}
```

### D. Post Answer (`POST /api/questions/{question_id}/answers`)

**Request Body**:
```json
{
  "author": "jiwon",
  "body": "FastAPI 공식 문서에 따르면 비동기 함수와 동기 함수의 실행 스레드 풀 할당 차이를 유의해야 합니다."
}
```

**Response (`201 Created`)**:
```json
{
  "id": 10,
  "question_id": 12,
  "author": "jiwon",
  "body": "FastAPI 공식 문서에 따르면 비동기 함수와 동기 함수의 실행 스레드 풀 할당 차이를 유의해야 합니다.",
  "accepted": false,
  "created_at": "2026-08-21T02:35:00Z"
}
```

### E. Accept Answer (`POST /api/questions/{question_id}/accept/{answer_id}`)

**Request Body**: *(empty)*  
**Response (`200 OK`)**: Returns the updated `QuestionDetailResponse` with `solved = true` and `accepted = true` on the chosen answer.

---

## 5. Error Responses

* **User Not Found in Chat App (`400 Bad Request`)**:
  ```json
  {
    "detail": "User 'some_user' not found. Please create an account in the chat app first."
  }
  ```
* **Answer Does Not Belong to Question (`400 Bad Request`)**:
  ```json
  {
    "detail": "Answer does not belong to this question"
  }
  ```
* **Question or Answer Not Found (`404 Not Found`)**:
  ```json
  {
    "detail": "Question not found"
  }
  ```
* **Validation Failure (`422 Unprocessable Entity`)**: (e.g. whitespace-only title, missing field)
  ```json
  {
    "detail": [
      {
        "loc": ["body", "title"],
        "msg": "Field cannot be empty or contain only whitespace.",
        "type": "value_error"
      }
    ]
  }
  ```

---

## 6. Frontend Developer Assignments

### 🖥️ Frontend B — Home & Search Screen
* **Responsibilities**:
  1. Fetch and render question list from `GET /api/questions`.
  2. Implement search input with debounce (e.g. 300ms) calling `GET /api/questions?search={query}`.
  3. Render badges for `tag`, `author`, `answer_count`, and `solved` status.
  4. Handle UI states: Loading skeleton, empty search results, error alert.
  5. Clicking a question card navigates to `/questions/{id}`.

### ✍️ Frontend C — Ask Question Screen
* **Responsibilities**:
  1. Render form inputs for `author` (nickname), `title`, `tag`, and `body`.
  2. Perform client-side non-empty validation before submit.
  3. Send `POST /api/questions`.
  4. On `201 Created`, navigate to the newly created question (`/questions/{res.id}`).
  5. On `400 Bad Request`, display the account prompt: *"User not found. Please create an account in BambooChat first."*

### 💬 Frontend D — Question Detail & Answers Screen
* **Responsibilities**:
  1. Fetch full detail via `GET /api/questions/{id}`.
  2. Display question header, author, created timestamp, and body.
  3. Display list of answers (oldest-first) with visual highlight on accepted answer (`answer.accepted === true`).
  4. Provide an answer form submitting `POST /api/questions/{id}/answers`.
  5. Provide an "Accept Answer" button on each answer card triggering `POST /api/questions/{id}/accept/{answer.id}`.
  6. Refetch question detail upon posting or accepting answers.

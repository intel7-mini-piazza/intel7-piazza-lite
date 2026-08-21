# Intel7 Piazza-Lite

Piazza-Lite is a classroom Q&A and knowledge-sharing forum backend and web application built with FastAPI and SQLite. It operates alongside the classroom chat application (`BambooChat`), reusing registered user accounts and verifying passwords locally against Argon2id hashes without modifying chat tables.

---

## Architecture & Authentication Highlights

* **Shared SQLite Database**: Connects to the classroom chat SQLite database via `CLASSROOM_DB_PATH` with `PRAGMA journal_mode = WAL` for concurrent access.
* **BambooChat Credential Verification**: Reuses existing `users` accounts from BambooChat. Passwords are verified locally using `argon2-cffi` matching BambooChat's normalization (`NFKC` + `casefold`) and Argon2id parameters.
* **Dedicated Piazza Sessions**: Maintains an isolated `piazza_sessions` table in the shared database storing only SHA-256 hashes of opaque session tokens.
* **HttpOnly Session Cookies**: Issues a 12-hour `piazza_session` cookie (`HttpOnly=True`, `SameSite="lax"`, `Path="/"`, `Max-Age=43200`).
* **Session-Derived Authorship**: Write requests (`POST /api/questions`, `POST /api/questions/{id}/answers`) do not accept author fields; authorship is derived strictly from the active session.
* **Question Ownership Enforcement**: Only the question author can accept an answer solution (`POST /api/questions/{id}/accept/{answer_id}`). Non-owners are rejected with HTTP 403 Forbidden.
* **Integrated Frontend Serving**: Serves the unified web UI directly through FastAPI on port 8100 at `/`.

> [!WARNING]
> **Classroom LAN Transport Limitation**:
> In this classroom MVP deployment, HTTP is used without TLS across the local network. Passwords and session cookies travel unencrypted over the local Wi-Fi / LAN. For production deployment, HTTPS (TLS termination) and `Secure=True` cookies must be enabled.

---

## 1. Quickstart & Setup with `uv` (Windows PowerShell)

### Prerequisites
* Python 3.12+ (or Python 3.14)
* [uv](https://github.com/astral-sh/uv) package manager installed

### Step-by-Step Installation

```powershell
# 1. Clone or navigate to the project directory
cd E:\_se4nchoi\intel7-piazza-lite

# 2. Synchronize virtual environment and dependencies using uv
uv sync
```

---

## 2. Running the Server

### Setting Environment & Starting Uvicorn

```powershell
# Set path to the shared classroom chat database
$env:CLASSROOM_DB_PATH = "E:\_se4nchoi\BambooChatData\chat.db"

# Start the integrated FastAPI server on 0.0.0.0 (Accessible across classroom LAN)
uv run uvicorn app.main:app --host 0.0.0.0 --port 8100
```

* **Web Application**: [http://127.0.0.1:8100/](http://127.0.0.1:8100/)
* **Login Page**: [http://127.0.0.1:8100/login.html](http://127.0.0.1:8100/login.html)
* **Health Check (Public)**: [http://127.0.0.1:8100/api/health](http://127.0.0.1:8100/api/health)
* **API Interactive Docs**: [http://127.0.0.1:8100/docs](http://127.0.0.1:8100/docs)
* **LAN Access**: `http://<HOST_IP>:8100/` *(Find your IP using `ipconfig`)*

---

## 3. Seed Data

To populate the forum with ~10 realistic questions (Arduino, FastAPI, Docker, Python, PLC):

```powershell
$env:CLASSROOM_DB_PATH = "E:\_se4nchoi\BambooChatData\chat.db"
uv run python scripts/seed.py
```

*The seed script is idempotent and resolves existing chat user accounts internally.*

---

## 4. Automated Smoke Tests

Verify health check, unauthenticated rejection (401), login sessions, question & answer posting, solution acceptance, non-owner authorization rejection (403), and logout:

```powershell
# Unauthenticated & public endpoint checks:
uv run python scripts/smoke_test.py

# Full end-to-end authenticated testing with test credentials:
$env:PIAZZA_TEST_USERNAME = "your_username"
$env:PIAZZA_TEST_PASSWORD = "your_password"
$env:PIAZZA_TEST_OTHER_USERNAME = "other_username"
$env:PIAZZA_TEST_OTHER_PASSWORD = "other_password"
uv run python scripts/smoke_test.py
```

---

## 5. Web Interface & Endpoints Reference

### Web Pages
* **Login**: `/login.html`
* **Home / Feed**: `/` or `/index.html` (requires login)
* **Ask Question**: `/ask.html` (requires login)
* **Question Detail & Discussion**: `/question.html?id=<id>` (requires login)

### REST API Endpoints
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | Health check & database statistics |
| `POST` | `/api/auth/login` | No | Authenticate user & issue session cookie |
| `GET` | `/api/auth/me` | Yes | Get current authenticated user info |
| `POST` | `/api/auth/logout` | No / Yes | Clear session and revoke cookie |
| `GET` | `/api/questions` | Yes | List questions (newest-first, `?search=`) |
| `POST` | `/api/questions` | Yes | Create question (payload: `title`, `body`, `tag`) |
| `GET` | `/api/questions/{id}` | Yes | Detail with answers and `can_accept_answers` |
| `POST` | `/api/questions/{id}/answers` | Yes | Post answer (payload: `body`) |
| `POST` | `/api/questions/{id}/accept/{answer_id}` | Yes | Accept answer (Question Owner only) |

For full schemas and examples, refer to [`FRONTEND_HANDOFF.md`](./FRONTEND_HANDOFF.md).

---

## 6. Project Structure

```text
intel7-piazza-lite/
├── app/
│   ├── __init__.py
│   ├── main.py            # FastAPI entrypoint, static frontend mounting, CORS
│   ├── database.py        # SQLite connection, WAL init, Argon2 auth, sessions
│   ├── schemas.py         # Pydantic contract models & auth schemas
│   └── routes.py          # API route handlers & get_current_user dependency
├── frontend/
│   ├── index.html         # Home / Search page
│   ├── login.html         # Login page
│   ├── ask.html           # Ask Question page
│   ├── question.html      # Question detail & answers discussion page
│   ├── css/
│   │   ├── common.css     # Shared design tokens & base stylesheet
│   │   ├── home.css       # Home/Feed stylesheet
│   │   ├── login.css      # Login page stylesheet
│   │   ├── ask.css        # Ask Question stylesheet
│   │   └── question.css   # Question page stylesheet
│   └── js/
│       ├── auth.js        # Shared auth helper & session verification
│       ├── login.js       # Login submission & safe redirect handling
│       ├── home.js        # Home listing & debounced search logic
│       ├── ask.js         # Question submission logic
│       └── question.js    # Detail rendering, answer posting, solution acceptance
├── docs/
│   ├── frontend_b_home_search_ko.md
│   ├── frontend_d_question_detail_ko.md
│   └── question-page-guide.md
├── scripts/
│   ├── seed.py            # Idempotent classroom seed generator
│   └── smoke_test.py      # E2E automated smoke test suite
├── src/
│   └── intel7_piazza_lite/
│       └── __init__.py    # CLI entrypoint
├── data/
│   └── .gitkeep           # Local fallback folder
├── pyproject.toml         # UV project configuration & dependencies
├── uv.lock                # UV deterministic dependency lockfile
├── requirements.txt       # Standard requirements definition
├── .python-version        # Python version specification
├── .env.example           # Environment template
├── .gitignore             # Standard Python gitignore
├── FRONTEND_HANDOFF.md    # Frontend specifications & auth contract
└── README.md              # Project runbook
```

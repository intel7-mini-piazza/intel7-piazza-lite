# Intel7 Piazza-Lite Backend

Piazza-Lite is a lightweight classroom Q&A forum backend built with FastAPI and SQLite. It operates alongside the classroom chat application (`BambooChat`), referencing existing user accounts without modifying chat tables.

---

## Architecture Highlights

* **Shared SQLite Database**: Connects to the classroom chat SQLite database via `CLASSROOM_DB_PATH` with `PRAGMA journal_mode = WAL` for concurrent access.
* **Zero User Creation**: Piazza-Lite treats the chat application as the single source of truth for accounts. Nicknames must exist in the chat database to post questions or answers.
* **Strict DB Presence**: Will fail fast on startup if the target database file or `users` table is not found.
* **CORS Enabled**: Ready for classroom LAN web clients.

---

## 1. Quickstart & Setup (Windows PowerShell)

### Prerequisites
* Python 3.12+ (or Python 3.14)
* [uv](https://github.com/astral-sh/uv) package manager installed

### Step-by-Step Installation

```powershell
# 1. Clone or navigate to the project directory
cd E:\_se4nchoi\intel7-piazza-lite

# 2. Create virtual environment using uv
uv venv

# 3. Activate virtual environment
.\.venv\Scripts\Activate.ps1

# 4. Install dependencies
uv pip install -r requirements.txt
```

---

## 2. Running the Server

### Setting Environment & Starting Uvicorn

```powershell
# Set path to the shared classroom chat database
$env:CLASSROOM_DB_PATH = "E:\_se4nchoi\BambooChatData\chat.db"

# Start the FastAPI server on 0.0.0.0 (Accessible across classroom LAN)
py -m uvicorn app.main:app --host 0.0.0.0 --port 8100 --reload
```

* **Interactive Docs**: [http://127.0.0.1:8100/docs](http://127.0.0.1:8100/docs)
* **Health Endpoint**: [http://127.0.0.1:8100/api/health](http://127.0.0.1:8100/api/health)
* **LAN Access**: `http://<HOST_IP>:8100/api/questions` *(Find your IP using `ipconfig`)*

> **Windows Firewall Note**: If other classroom computers cannot connect, allow Python / port 8100 in Windows Defender Firewall inbound rules:
> ```powershell
> New-NetFirewallRule -DisplayName "Piazza-Lite Backend (Port 8100)" -Direction Inbound -LocalPort 8100 -Protocol TCP -Action Allow
> ```

---

## 3. Seed Data

To populate the forum with ~10 realistic questions (Arduino, FastAPI, Docker, Python, PLC):

```powershell
$env:CLASSROOM_DB_PATH = "E:\_se4nchoi\BambooChatData\chat.db"
py scripts/seed.py
```

*The seed script is idempotent and can be safely executed multiple times without duplicating data.*

---

## 4. Automated Smoke Tests

Verify all 7 API endpoints, author verification, search, error handling, and solution acceptance:

```powershell
# With the server running on port 8100:
py scripts/smoke_test.py
```

---

## 5. API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check & database statistics |
| `GET` | `/api/questions` | List questions (newest-first, supports `?search=`) |
| `POST` | `/api/questions` | Create question (verifies chat account) |
| `GET` | `/api/questions/{id}` | Question detail with answers (oldest-first) |
| `POST` | `/api/questions/{id}/answers` | Post answer (verifies chat account) |
| `POST` | `/api/questions/{id}/accept/{answer_id}` | Mark answer as accepted solution |

For full request/response payloads, refer to [`FRONTEND_HANDOFF.md`](./FRONTEND_HANDOFF.md).

---

## 6. Project Structure

```text
intel7-piazza-lite/
├── app/
│   ├── __init__.py
│   ├── main.py            # FastAPI entrypoint, lifespan DB check, CORS
│   ├── database.py        # SQLite connection, WAL init, read-only user resolver
│   ├── schemas.py         # Pydantic request/response contract models
│   └── routes.py          # API route handlers
├── scripts/
│   ├── seed.py            # Idempotent classroom seed generator
│   └── smoke_test.py      # E2E automated smoke test suite
├── data/
│   └── .gitkeep           # Local fallback folder
├── .env.example           # Environment template
├── .gitignore             # Standard Python gitignore
├── FRONTEND_HANDOFF.md    # Frontend specifications and assignments
├── README.md              # Project runbook
└── requirements.txt       # Dependencies
```

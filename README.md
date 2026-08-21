# Bamboo-Stack (대나무지식인)

Bamboo-Stack(대나무지식인)은 FastAPI와 SQLite 기반의 강의실 Q&A 및 지식 공유 포럼 웹 애플리케이션입니다. 강의실 채팅 애플리케이션(`BambooChat`)과 연동되어 별도의 회원가입 없이 기존 계정 및 Argon2id 패스워드 검증을 통해 동작합니다.

---

## Architecture & Visual Foundation

* **대나무지식인 2열 통합 워크스페이스 (Single-Workspace Layout)**: 전체 Q&A 경험이 화면 전환 없이 홈 화면에서 이루어집니다.
  - **좌측 피드**: 실시간 질문 검색, 해결 여부 뱃지, 선택된 질문 하이라이트.
  - **우측 워크스페이스**: 온보딩 안내, 질문 상세 및 답변 목록, 인라인 답변 작성기, 인라인 새 질문 작성기.
* **Canonical URL State (History API)**:
  - 홈 / 안내: `/`
  - 선택된 질문 상세: `/?post=<question_id>`
  - 새 질문 작성: `/?compose=question`
  - `ask.html` 및 `question.html?id=<id>` 호환 리다이렉트 지원.
* **Shared SQLite Database**: `CLASSROOM_DB_PATH` 환경 변수를 통해 BambooChat SQLite 데이터베이스에 연결하며 `PRAGMA journal_mode = WAL`을 통해 동시 읽기/쓰기를 지원합니다.
* **BambooChat Credential Verification**: BambooChat의 `users` 테이블을 활용하며, `unicodedata` NFKC + casefold 정규화 및 Argon2id 해시 검증을 로컬에서 수행합니다.
* **Dedicated Piazza Sessions**: 공유 데이터베이스 내 독립된 `piazza_sessions` 테이블에 세션 토큰의 SHA-256 해시를 안전하게 보관합니다.
* **HttpOnly Session Cookies**: 12시간 유효한 `piazza_session` 쿠키를 발급합니다 (`HttpOnly=True`, `SameSite="lax"`, `Path="/"`, `Max-Age=43200`).
* **Session-Derived Authorship**: 질문 및 답변 작성 시 작성자 정보는 클라이언트 입력을 신뢰하지 않고 활성 세션에서 직접 추출합니다.
* **Question Ownership Enforcement**: 질문 작성자 본인만 유효한 답변을 해결책으로 채택할 수 있습니다 (`POST /api/questions/{id}/accept/{answer_id}`). 작성자가 아닌 경우 HTTP 403 Forbidden을 반환합니다.
* **Integrated Frontend Serving**: FastAPI가 포트 8100 루트(`/`)에서 통합 웹 UI를 직접 서비스합니다.

> [!WARNING]
> **Classroom LAN Transport Limitation**:
> 본 강의실 MVP 배포 환경에서는 로컬 네트워크 상에서 평문 HTTP를 사용합니다. 프로덕션 환경에 배포 시 HTTPS(TLS 종단) 설정 및 `Secure=True` 쿠키 옵션 활성화가 필요합니다.

---

## 1. Quickstart & Setup with `uv` (Windows PowerShell)

### Prerequisites
* Python 3.12+ (or Python 3.14)
* [uv](https://github.com/astral-sh/uv) 패키지 매니저 설치

### Step-by-Step Installation

```powershell
# 1. 프로젝트 디렉토리로 이동
cd E:\_se4nchoi\intel7-piazza-lite

# 2. uv를 사용한 가상환경 및 의존성 동기화
uv sync
```

---

## 2. Running the Server

### Option A: Using `run.py` (권장)

```powershell
uv run python run.py
```

### Option B: Using Uvicorn Directly

```powershell
# 공유 채팅 데이터베이스 경로 설정
$env:CLASSROOM_DB_PATH = "E:\_se4nchoi\BambooChatData\chat.db"

# FastAPI 서버 시작 (강의실 LAN 0.0.0.0 바인딩)
uv run uvicorn app.main:app --host 0.0.0.0 --port 8100
```

* **웹 애플리케이션**: [http://127.0.0.1:8100/](http://127.0.0.1:8100/)
* **로그인 페이지**: [http://127.0.0.1:8100/login.html](http://127.0.0.1:8100/login.html)
* **상태 확인 (Public)**: [http://127.0.0.1:8100/api/health](http://127.0.0.1:8100/api/health)
* **대화형 API 문서**: [http://127.0.0.1:8100/docs](http://127.0.0.1:8100/docs)
* **강의실 LAN 접속**: `http://<내_IP>:8100/` *(PowerShell `ipconfig`로 IPv4 확인)*

---

## 3. Seed Data

포럼에 실습 관련 예제 질문들(Arduino, FastAPI, Docker, Python, PLC 등)을 생성합니다:

```powershell
$env:CLASSROOM_DB_PATH = "E:\_se4nchoi\BambooChatData\chat.db"
uv run python scripts/seed.py
```

*시드 스크립트는 멱등성을 보장하며 기존 채팅 사용자와 매핑됩니다.*

---

## 4. Automated Smoke Tests

헬스체크, 미인증 거부(401), 로그인 세션, 질문/답변 등록, 답변 채택, 비작성자 채택 거부(403), 로그아웃을 종합 검증합니다:

```powershell
# 미인증 및 공개 엔드포인트 자동 테스트:
uv run python scripts/smoke_test.py

# 테스트 계정을 이용한 전체 인증 E2E 검증:
$env:PIAZZA_TEST_USERNAME = "your_username"
$env:PIAZZA_TEST_PASSWORD = "your_password"
$env:PIAZZA_TEST_OTHER_USERNAME = "other_username"
$env:PIAZZA_TEST_OTHER_PASSWORD = "other_password"
uv run python scripts/smoke_test.py
```

---

## 5. Web Interface & Endpoints Reference

### Web Pages & Views
* **로그인 페이지**: `/login.html`
* **홈 / 통합 워크스페이스**: `/`
  * **선택된 질문 상세**: `/?post=<id>`
  * **새 질문 작성기**: `/?compose=question`
* **호환 리다이렉트**: `/ask.html` ➔ `/?compose=question`, `/question.html?id=<id>` ➔ `/?post=<id>`

### REST API Endpoints
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `GET` | `/api/health` | No | 헬스체크 및 DB 통계 |
| `POST` | `/api/auth/login` | No | 사용자 인증 및 세션 쿠키 발급 |
| `GET` | `/api/auth/me` | Yes | 현재 로그인한 사용자 정보 조회 |
| `POST` | `/api/auth/logout` | No / Yes | 세션 만료 및 쿠키 제거 |
| `GET` | `/api/questions` | Yes | 질문 목록 조회 (최신순, `?search=`) |
| `POST` | `/api/questions` | Yes | 새 질문 작성 (`title`, `body`, `tag`) |
| `GET` | `/api/questions/{id}` | Yes | 질문 상세, 답변 목록, `can_accept_answers` |
| `POST` | `/api/questions/{id}/answers` | Yes | 답변 작성 (`body`) |
| `POST` | `/api/questions/{id}/accept/{answer_id}` | Yes | 답변 채택 (질문 작성자 전용) |

자세한 API 명세는 [`FRONTEND_HANDOFF.md`](./FRONTEND_HANDOFF.md)를 참조하세요.

---

## 6. Project Structure

```text
intel7-piazza-lite/
├── app/
│   ├── __init__.py
│   ├── main.py            # FastAPI 진입점, 정적 파일 서빙, CORS
│   ├── database.py        # SQLite 연결, WAL 설정, Argon2 인증, 세션
│   ├── schemas.py         # Pydantic 모델 및 인증 스키마
│   └── routes.py          # API 라우트 핸들러 및 get_current_user 의존성
├── frontend/
│   ├── index.html         # Bamboo-Stack 2열 통합 워크스페이스
│   ├── login.html         # 로그인 페이지
│   ├── ask.html           # /?compose=question 호환 리다이렉트
│   ├── question.html      # /?post=<id> 호환 리다이렉트
│   ├── css/
│   │   ├── common.css     # 공통 디자인 토큰 및 기본 스타일
│   │   ├── home.css       # 피드 및 워크스페이스 스타일시트
│   │   └── login.css      # 로그인 스타일시트
│   └── js/
│       ├── auth.js        # 프론트엔드 인증 및 세션 확인 헬퍼
│       ├── login.js       # 로그인 제출 및 안전한 리다이렉트 처리
│       └── home.js        # 통합 피드, 라우팅, 작성기, 상세 및 답변 로직
├── docs/
│   ├── frontend_b_home_search_ko.md
│   ├── frontend_d_question_detail_ko.md
│   └── question-page-guide.md
├── scripts/
│   ├── seed.py            # 멱등 시드 데이터 생성기
│   └── smoke_test.py      # E2E 자동화 스모크 테스트 스위트
├── src/
│   └── intel7_piazza_lite/
│       └── __init__.py    # CLI 진입점
├── data/
│   └── .gitkeep           # 로컬 폴백 폴더
├── run.py                 # 실행 스크립트
├── pyproject.toml         # UV 프로젝트 설정 및 의존성
├── uv.lock                # UV 락파일
├── requirements.txt       # 표준 의존성 정의
├── .python-version        # 파이썬 버전 명세
├── .env.example           # 환경 변수 템플릿
├── .gitignore             # Git 제외 규칙
├── FRONTEND_HANDOFF.md    # 프론트엔드 연동 명세서
└── README.md              # 프로젝트 안내서
```

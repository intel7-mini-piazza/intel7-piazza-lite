"""Repeatable classroom seed data generator for Piazza-Lite.

Uses existing user accounts from BambooChat. Running this script multiple times
is idempotent and will not create duplicate questions or answers.
"""

import os
import sqlite3
import sys
from datetime import datetime, timezone
from typing import Optional

# Add workspace to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import get_db_connection, init_db, normalize_username


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def resolve_seed_user_id(conn: sqlite3.Connection, identifier: str) -> Optional[int]:
    """Internal helper for seeder to map author handle to existing chat user ID."""
    clean = normalize_username(identifier)
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id FROM users
        WHERE normalized_username = ? OR username = TRIM(?) OR display_name = TRIM(?)
        LIMIT 1;
        """,
        (clean, identifier, identifier),
    )
    row = cursor.fetchone()
    return int(row["id"]) if row else None


SEED_QUESTIONS = [
    # 1. Solved - Arduino Servo Power
    {
        "title": "Servo 모터가 90도로 회전하지 않고 진동만 합니다",
        "author": "khb",
        "tag": "Arduino",
        "body": "Arduino Uno 5V 핀에 SG90 서보모터를 연결하고 Servo.write(90)을 실행했는데 계속 드르륵거리며 진동만 합니다. 코드는 기본 예제인데 전원 문제인가요?",
        "answers": [
            {
                "author": "chw",
                "body": "Arduino 보드의 5V 핀은 전류 공급량이 제한되어 있어서 서보 모터 구동 시 전압 강하가 발생합니다. 별도의 외부 5V 전원 어댑터나 배터리를 서보에 연결하고 GND는 아두이노와 묶어주세요.",
                "accepted": True,
            },
            {
                "author": "admin",
                "body": "서보 신호선(PWM) 핀 번호도 9번 핀에 잘 연결되어 있는지 확인해보세요.",
                "accepted": False,
            }
        ]
    },
    # 2. Solved - Python venv Activation
    {
        "title": "PowerShell에서 venv 활성화 시 스크립트 실행 오류가 발생합니다",
        "author": "doraji",
        "tag": "Python",
        "body": ".venv\\Scripts\\Activate.ps1 을 실행하면 '이 시스템에서 스크립트를 실행할 수 없으므로...' 라는 ExecutionPolicy 오류가 발생합니다. 어떻게 해결하나요?",
        "answers": [
            {
                "author": "admin",
                "body": "PowerShell 관리자 권한에서 `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` 를 실행하시면 현재 사용자에 대해 로컬 스크립트 실행이 허용됩니다.",
                "accepted": True,
            }
        ]
    },
    # 3. Solved - FastAPI CORS Issue
    {
        "title": "FastAPI 백엔드로 프론트엔드 fetch 호출 시 CORS 에러가 납니다",
        "author": "bjw0625",
        "tag": "FastAPI",
        "body": "HTML 파일에서 localhost:8100/api/questions 로 fetch 요청을 보내는데 Access-Control-Allow-Origin 헤더가 없다는 콘솔 에러가 발생합니다.",
        "answers": [
            {
                "author": "rasp",
                "body": "app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*']) 를 FastAPI app에 등록해주어야 합니다.",
                "accepted": True,
            }
        ]
    },
    # 4. Answered Unsolved - Docker Port Mapping
    {
        "title": "Docker 컨테이너 안의 웹 서버가 브라우저에서 접속이 안 됩니다",
        "author": "rjsxo342",
        "tag": "Docker",
        "body": "docker run 으로 컨테이너를 띄웠는데 호스트 브라우저에서 127.0.0.1:8000 접속이 타임아웃 됩니다. 컨테이너 내부에서는 curl 8000이 잘 됩니다.",
        "answers": [
            {
                "author": "jiwon",
                "body": "docker run 시에 `-p 8000:8000` 포트 포워딩 옵션을 주셨나요? 그리고 웹 서버가 127.0.0.1이 아닌 0.0.0.0으로 바인딩되어 있는지 확인해보세요.",
                "accepted": False,
            }
        ]
    },
    # 5. Answered Unsolved - Arduino COM Port Missing
    {
        "title": "Arduino IDE 포트 선택 메뉴에 COM 포트가 비활성화되어 있습니다",
        "author": "khb",
        "tag": "Arduino",
        "body": "USB 케이블로 보드를 PC에 연결했는데 장치 관리자 및 아두이노 IDE에서 COM 포트를 인식하지 못합니다. CH340 드라이버 문제일까요?",
        "answers": [
            {
                "author": "doraji",
                "body": "호환 보드의 경우 CH340 드라이버를 설치하셔야 합니다. 또한 데이터 전송이 지원되지 않는 충전 전용 USB 케이블인지도 확인해보세요.",
                "accepted": False,
            }
        ]
    },
    # 6. Answered Unsolved - PLC I/O Scan Cycle
    {
        "title": "PLC 프로그램에서 입력 접점 신호가 순간적으로 누락되는 원인이 궁금합니다",
        "author": "admin",
        "tag": "PLC",
        "body": "고속 센서에서 들어오는 펄스 신호가 간헐적으로 카운트되지 않습니다. PLC 스캔 타임(Scan Time)과 연관이 있을까요?",
        "answers": [
            {
                "author": "chw",
                "body": "일반 디지털 입력 모듈은 스캔 주기(10~20ms)보다 짧은 펄스를 감지하지 못합니다. 고속 카운터 모듈(High-Speed Counter)이나 인터럽트 입력 기능을 사용하셔야 합니다.",
                "accepted": False,
            }
        ]
    },
    # 7. Answered Unsolved - SQLite Database Locked Error
    {
        "title": "멀티스레드 환경에서 sqlite3.OperationalError: database is locked 가 발생합니다",
        "author": "bjw0625",
        "tag": "Python",
        "body": "여러 요청이 동시에 들어올 때 SQLite 데이터베이스에 쓰기 시 locked 오류가 납니다. 해결 방법이 있을까요?",
        "answers": [
            {
                "author": "admin",
                "body": "PRAGMA journal_mode = WAL; 설정과 함께 connect 시 timeout=10.0 또는 PRAGMA busy_timeout = 10000; 을 설정해주시면 쓰기 경합 시 대기 후 처리됩니다.",
                "accepted": False,
            }
        ]
    },
    # 8. Unanswered - LAN Access Firewall
    {
        "title": "강의실 다른 컴퓨터에서 제 IP로 접속이 되지 않습니다",
        "author": "jiwon",
        "tag": "Network",
        "body": "uvicorn app.main:app --host 0.0.0.0 --port 8100 으로 서버를 켰는데 옆자리 친구가 http://192.168.x.x:8100 으로 들어오면 접속 대기만 하다가 실패합니다. Windows 방화벽 인바운드 규칙을 추가해야 하나요?",
        "answers": []
    },
    # 9. Unanswered - PLC Sensor Wiring PNP vs NPN
    {
        "title": "광전 센서 NPN 출력과 PNP 출력의 PLC 입력 결선 차이점",
        "author": "rasp",
        "tag": "PLC",
        "body": "현장에 3선식 NPN 오픈 컬렉터 센서와 PNP 센서가 혼용되어 있습니다. 싱크(Sink) 입력과 소스(Source) 입력 카드에 각각 어떻게 COM 단자를 결선해야 하나요?",
        "answers": []
    },
    # 10. Unanswered - Python Package Build Error
    {
        "title": "pip install 시 Microsoft Visual C++ 14.0 is required 오류 발생",
        "author": "rjsxo342",
        "tag": "Python",
        "body": "특정 C-extension 라이브러리를 설치하려고 하는데 C++ 빌드 도구가 필요하다는 오류가 발생합니다. 사전 빌드된 wheel을 받는 방법이 있나요?",
        "answers": []
    },
]


def seed_database():
    """Seed questions and answers idempotently."""
    init_db()

    with get_db_connection() as conn:
        cursor = conn.cursor()

        # Check available chat users
        cursor.execute("SELECT id, username, display_name, normalized_username FROM users")
        users = cursor.fetchall()
        if not users:
            print("[ERROR] No users found in users table. Cannot seed questions.")
            return

        print(f"[INFO] Found {len(users)} users in classroom database.")

        added_questions = 0
        added_answers = 0

        for item in SEED_QUESTIONS:
            # Check if question title already exists
            cursor.execute("SELECT id FROM questions WHERE title = ?", (item["title"],))
            existing_q = cursor.fetchone()
            if existing_q:
                # Already exists, skip
                continue

            user_id = resolve_seed_user_id(conn, item["author"])
            if not user_id:
                # Fallback to first user in database
                user_id = users[0]["id"]

            ts = now_iso()
            cursor.execute(
                """
                INSERT INTO questions (user_id, title, body, tag, accepted_answer_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, NULL, ?, ?)
                """,
                (user_id, item["title"], item["body"], item["tag"], ts, ts),
            )
            q_id = cursor.lastrowid
            added_questions += 1

            accepted_ans_id = None
            for ans in item["answers"]:
                ans_user_id = resolve_seed_user_id(conn, ans["author"]) or users[0]["id"]
                cursor.execute(
                    """
                    INSERT INTO answers (question_id, user_id, body, created_at)
                    VALUES (?, ?, ?, ?)
                    """,
                    (q_id, ans_user_id, ans["body"], ts),
                )
                a_id = cursor.lastrowid
                added_answers += 1

                if ans["accepted"]:
                    accepted_ans_id = a_id

            if accepted_ans_id:
                cursor.execute(
                    "UPDATE questions SET accepted_answer_id = ? WHERE id = ?",
                    (accepted_ans_id, q_id),
                )

        conn.commit()
        print(f"[SUCCESS] Seed complete: added {added_questions} questions, {added_answers} answers.")


if __name__ == "__main__":
    seed_database()

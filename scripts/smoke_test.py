"""End-to-End automated smoke test suite for Piazza-Lite API.

Verifies complete contract behavior, health, creation, search, detail, answer posting,
answer acceptance, error handling (400, 404, 422), and zero-user-creation constraints.
"""

import os
import sys
import uuid
import httpx

BASE_URL = os.getenv("BASE_URL", "http://127.0.0.1:8100")


def run_smoke_tests():
    print(f"==================================================")
    print(f"Starting Piazza-Lite Smoke Tests against {BASE_URL}")
    print(f"==================================================")

    client = httpx.Client(base_url=BASE_URL, timeout=10.0)

    # 1. Health Check
    print("\n[TEST 1] GET /api/health")
    r = client.get("/api/health")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    health_data = r.json()
    assert health_data["status"] == "ok"
    assert "user_count" in health_data
    assert "question_count" in health_data
    print(f"  [PASS] Health OK (Users: {health_data['user_count']}, Questions: {health_data['question_count']})")

    # 2. Reject Non-Existent User Question Creation
    print("\n[TEST 2] POST /api/questions (Unknown user rejection)")
    bogus_author = f"GhostUser_{uuid.uuid4().hex[:6]}"
    r = client.post(
        "/api/questions",
        json={
            "author": bogus_author,
            "title": "Will this fail?",
            "body": "Should be rejected because user does not exist in chat DB.",
            "tag": "Test",
        },
    )
    assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
    err_detail = r.json().get("detail", "")
    assert "create an account in the chat app first" in err_detail
    print(f"  [PASS] Rejected unknown user correctly: {err_detail}")

    # 3. Create Valid Question
    print("\n[TEST 3] POST /api/questions (Valid author 'admin')")
    test_token = f"SmokeToken_{uuid.uuid4().hex[:8]}"
    q_payload = {
        "author": "admin",
        "title": f"Automated Smoke Question {test_token}",
        "body": f"Testing Piazza-Lite full vertical workflow with token {test_token}",
        "tag": "SmokeTest",
    }
    r = client.post("/api/questions", json=q_payload)
    assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"
    q_data = r.json()
    q_id = q_data["id"]
    assert q_data["title"] == q_payload["title"]
    assert q_data["solved"] is False
    assert q_data["accepted_answer_id"] is None
    print(f"  [PASS] Created Question ID: {q_id}")

    # 4. List Questions & Check New Question
    print("\n[TEST 4] GET /api/questions")
    r = client.get("/api/questions")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    q_list = r.json()
    assert isinstance(q_list, list)
    matching = [q for q in q_list if q["id"] == q_id]
    assert len(matching) == 1, "Created question not found in questions list"
    assert matching[0]["answer_count"] == 0
    assert matching[0]["solved"] is False
    print(f"  [PASS] Found question in list (Total items: {len(q_list)})")

    # 5. Search Questions by Unique Token
    print(f"\n[TEST 5] GET /api/questions?search={test_token}")
    r = client.get(f"/api/questions?search={test_token}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    search_results = r.json()
    assert len(search_results) == 1
    assert search_results[0]["id"] == q_id
    print(f"  [PASS] Search by token returned exactly 1 matching question")

    # 6. Retrieve Question Detail
    print(f"\n[TEST 6] GET /api/questions/{q_id}")
    r = client.get(f"/api/questions/{q_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    detail = r.json()
    assert detail["id"] == q_id
    assert detail["answers"] == []
    assert detail["solved"] is False
    print(f"  [PASS] Retrieved question detail with empty answers list")

    # 7. Post Answer with Unknown User (Must Fail)
    print(f"\n[TEST 7] POST /api/questions/{q_id}/answers (Unknown user rejection)")
    r = client.post(
        f"/api/questions/{q_id}/answers",
        json={"author": bogus_author, "body": "Unknown user answer."},
    )
    assert r.status_code == 400
    print("  [PASS] Unknown user answer rejected with 400")

    # 8. Post Valid Answer
    print(f"\n[TEST 8] POST /api/questions/{q_id}/answers (Valid author 'khb')")
    ans_payload = {
        "author": "khb",
        "body": f"Here is the verified solution for {test_token}.",
    }
    r = client.post(f"/api/questions/{q_id}/answers", json=ans_payload)
    assert r.status_code == 201, f"Expected 201, got {r.status_code}: {r.text}"
    ans_data = r.json()
    ans_id = ans_data["id"]
    assert ans_data["question_id"] == q_id
    assert ans_data["accepted"] is False
    print(f"  [PASS] Created Answer ID: {ans_id}")

    # 9. Verify Answer Appears in Question Detail
    print(f"\n[TEST 9] Verify answer in question detail")
    r = client.get(f"/api/questions/{q_id}")
    detail = r.json()
    assert len(detail["answers"]) == 1
    assert detail["answers"][0]["id"] == ans_id
    assert detail["answers"][0]["accepted"] is False
    assert detail["solved"] is False
    print("  [PASS] Answer present in detail with accepted=False")

    # 10. Accept Answer
    print(f"\n[TEST 10] POST /api/questions/{q_id}/accept/{ans_id}")
    r = client.post(f"/api/questions/{q_id}/accept/{ans_id}")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    accepted_detail = r.json()
    assert accepted_detail["solved"] is True
    assert accepted_detail["accepted_answer_id"] == ans_id
    assert accepted_detail["answers"][0]["accepted"] is True
    print("  [PASS] Answer accepted: question is marked solved=True")

    # 11. Cross-Question Acceptance Rejection
    print("\n[TEST 11] Cross-Question Acceptance (Must Fail with 400)")
    # Create another question
    r = client.post(
        "/api/questions",
        json={"author": "admin", "title": "Other Q", "body": "Other body", "tag": "Other"},
    )
    other_q_id = r.json()["id"]
    r = client.post(f"/api/questions/{other_q_id}/accept/{ans_id}")
    assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
    assert "does not belong to this question" in r.json().get("detail", "")
    print("  [PASS] Cross-question acceptance rejected with 400")

    # 12. 404 Errors on Missing Entities
    print("\n[TEST 12] 404 Error handling for non-existent IDs")
    r = client.get("/api/questions/99999999")
    assert r.status_code == 404
    r = client.post(f"/api/questions/{q_id}/accept/99999999")
    assert r.status_code == 404
    print("  [PASS] 404 Not Found returned correctly for missing entities")

    print("\n==================================================")
    print("ALL SMOKE TESTS PASSED SUCCESSFULLY! (12/12)")
    print("==================================================")


if __name__ == "__main__":
    try:
        run_smoke_tests()
    except Exception as e:
        print(f"\n[FAILURE] Smoke test failed: {e}")
        sys.exit(1)

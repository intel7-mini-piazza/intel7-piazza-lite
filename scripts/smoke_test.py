"""Automated smoke test suite for Bamboo-Stack (대나무지식인) with BambooChat authentication."""

import os
import sys
import uuid
import httpx

BASE_URL = os.getenv("PIAZZA_BASE_URL", "http://127.0.0.1:8100")


def run_smoke_tests():
    print("=" * 60)
    print(f"Starting Bamboo-Stack (대나무지식인) Auth & API Smoke Tests against {BASE_URL}")
    print("=" * 60)

    # Use a persistent client with cookie jar
    client = httpx.Client(base_url=BASE_URL, timeout=10.0)

    # 1. Health check (Public)
    print("\n[TEST 1] GET /api/health (Public endpoint)")
    r = client.get("/api/health")
    assert r.status_code == 200, f"Health check failed: {r.status_code} - {r.text}"
    health_data = r.json()
    assert health_data["status"] == "ok"
    print(f"  [PASS] Health OK (Users: {health_data['user_count']}, Questions: {health_data['question_count']})")

    # 2. Unauthenticated access to /api/questions (Must return 401)
    print("\n[TEST 2] GET /api/questions without session (Must return 401)")
    r = client.get("/api/questions")
    assert r.status_code == 401, f"Expected 401 but got {r.status_code}"
    print(f"  [PASS] Protected endpoint correctly rejected with 401: {r.json().get('detail')}")

    # 3. Unauthenticated access to /api/auth/me (Must return 401)
    print("\n[TEST 3] GET /api/auth/me without session (Must return 401)")
    r = client.get("/api/auth/me")
    assert r.status_code == 401, f"Expected 401 but got {r.status_code}"
    print("  [PASS] /api/auth/me correctly returned 401")

    # 4. Login with invalid credentials (Must return 401)
    print("\n[TEST 4] POST /api/auth/login with invalid password (Must return 401)")
    r = client.post("/api/auth/login", json={"username": "nonexistent_ghost_user", "password": "wrong_password"})
    assert r.status_code == 401, f"Expected 401 but got {r.status_code}"
    assert r.json().get("detail") == "Invalid username or password"
    print("  [PASS] Invalid login rejected with generic 401")

    # Check test credentials from environment
    test_user = os.getenv("PIAZZA_TEST_USERNAME")
    test_pass = os.getenv("PIAZZA_TEST_PASSWORD")

    if not test_user or not test_pass:
        print("\n" + "=" * 60)
        print("[NOTICE] PIAZZA_TEST_USERNAME and PIAZZA_TEST_PASSWORD not set.")
        print("Skipping authenticated write and acceptance verification steps.")
        print("To run complete authenticated E2E tests, set:")
        print("  $env:PIAZZA_TEST_USERNAME = 'your_username'")
        print("  $env:PIAZZA_TEST_PASSWORD = 'your_password'")
        print("=" * 60)
        return

    # 5. Login with valid credentials
    print(f"\n[TEST 5] POST /api/auth/login with valid user '{test_user}'")
    r = client.post("/api/auth/login", json={"username": test_user, "password": test_pass})
    assert r.status_code == 200, f"Login failed: {r.status_code} - {r.text}"
    login_data = r.json()
    assert login_data.get("authenticated") is True
    user_info = login_data.get("user", {})
    display_name = user_info.get("display_name")
    print(f"  [PASS] Login successful for user '{user_info.get('username')}' (Display: {display_name})")

    # 6. Verify session via /api/auth/me
    print("\n[TEST 6] GET /api/auth/me with active session")
    r = client.get("/api/auth/me")
    assert r.status_code == 200, f"/api/auth/me failed: {r.status_code}"
    me_data = r.json()
    assert me_data["user"]["username"] == test_user
    print(f"  [PASS] Verified active session for user ID {me_data['user']['id']}")

    # 7. Authenticated Question Creation (no author field in payload)
    token_str = uuid.uuid4().hex[:8]
    q_title = f"Auth Smoke Question {token_str}"
    print(f"\n[TEST 7] POST /api/questions as '{test_user}' (No author in payload)")
    q_payload = {
        "title": q_title,
        "body": "Verifying that author is automatically derived from session cookie.",
        "tag": "Python",
    }
    r = client.post("/api/questions", json=q_payload)
    assert r.status_code == 201, f"Create question failed: {r.status_code} - {r.text}"
    q_data = r.json()
    q_id = q_data["id"]
    assert q_data["author"] == display_name
    print(f"  [PASS] Question created (ID: {q_id}, Author: {q_data['author']})")

    # 8. List and Search Questions
    print("\n[TEST 8] GET /api/questions?search=...")
    r = client.get(f"/api/questions?search={token_str}")
    assert r.status_code == 200
    results = r.json()
    assert len(results) == 1
    assert results[0]["id"] == q_id
    print(f"  [PASS] Search returned created question (Total matching: {len(results)})")

    # 9. Get Question Detail and check can_accept_answers
    print(f"\n[TEST 9] GET /api/questions/{q_id}")
    r = client.get(f"/api/questions/{q_id}")
    assert r.status_code == 200
    detail = r.json()
    assert detail["can_accept_answers"] is True
    print(f"  [PASS] Retrieved detail. can_accept_answers={detail['can_accept_answers']}")

    # 10. Post Answer (no author field in payload)
    print(f"\n[TEST 10] POST /api/questions/{q_id}/answers (No author in payload)")
    a_payload = {"body": "Here is an authenticated answer content."}
    r = client.post(f"/api/questions/{q_id}/answers", json=a_payload)
    assert r.status_code == 201, f"Post answer failed: {r.status_code} - {r.text}"
    a_data = r.json()
    a_id = a_data["id"]
    assert a_data["author"] == display_name
    print(f"  [PASS] Answer created (ID: {a_id}, Author: {a_data['author']})")

    # 11. Author accepts answer (Must succeed)
    print(f"\n[TEST 11] POST /api/questions/{q_id}/accept/{a_id} as Question Owner")
    r = client.post(f"/api/questions/{q_id}/accept/{a_id}")
    assert r.status_code == 200, f"Accept answer failed: {r.status_code} - {r.text}"
    updated_detail = r.json()
    assert updated_detail["solved"] is True
    assert updated_detail["accepted_answer_id"] == a_id
    print(f"  [PASS] Answer accepted by owner. Question solved=True")

    # 12. Optional Second User Authorization Check (Must return 403)
    other_user = os.getenv("PIAZZA_TEST_OTHER_USERNAME")
    other_pass = os.getenv("PIAZZA_TEST_OTHER_PASSWORD")
    if other_user and other_pass:
        print(f"\n[TEST 12] Cross-User Acceptance Authorization as '{other_user}' (Must return 403)")
        other_client = httpx.Client(base_url=BASE_URL, timeout=10.0)
        login_other = other_client.post("/api/auth/login", json={"username": other_user, "password": other_pass})
        if login_other.status_code == 200:
            forbidden_r = other_client.post(f"/api/questions/{q_id}/accept/{a_id}")
            assert forbidden_r.status_code == 403, f"Expected 403 but got {forbidden_r.status_code}"
            print("  [PASS] Non-owner acceptance correctly rejected with 403 Forbidden")
        else:
            print("  [SKIP] Other user credentials invalid, skipping 403 check.")

    # 13. Logout
    print("\n[TEST 13] POST /api/auth/logout")
    r = client.post("/api/auth/logout")
    assert r.status_code == 200
    print("  [PASS] Logged out successfully")

    # 14. Verify Session is Invalidated after logout
    print("\n[TEST 14] GET /api/auth/me & /api/questions after logout (Must return 401)")
    r_me = client.get("/api/auth/me")
    assert r_me.status_code == 401
    r_q = client.get("/api/questions")
    assert r_q.status_code == 401
    print("  [PASS] All requests after logout correctly rejected with 401")

    print("\n" + "=" * 60)
    print("ALL AUTHENTICATED SMOKE TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)


if __name__ == "__main__":
    run_smoke_tests()

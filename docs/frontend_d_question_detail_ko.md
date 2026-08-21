# Piazza-lite 프론트엔드 D 핸드오프 — 질문 상세 / 답변 / 답변 채택

## 1. 역할

당신은 4시간짜리 교실 프로젝트 **Piazza-lite**의 프론트엔드 중  
**질문 상세 페이지 / 답변 작성 / 답변 채택 기능**을 담당합니다.

Piazza-lite는 Stack Overflow / Piazza를 단순화한 형태의  
교실용 Q&A 지식 공유 서비스입니다.

백엔드는 별도의 담당자가 FastAPI로 구현하고 있습니다.

당신의 핵심 역할은 다음과 같습니다.

> **URL에서 질문 ID를 읽고, 해당 질문과 답변을 API에서 받아 출력한 뒤, 답변 작성과 채택 기능을 연결한다.**

세 프론트엔드 파트 중 가장 상호작용이 많은 파트입니다.

---

# 2. 먼저 학습할 개념

## A. URL Query Parameter

다음과 같은 URL을 이해해야 합니다.

```text
question.html?id=12
```

학습할 내용:

- query parameter가 무엇인지
- `URLSearchParams`
- URL에서 `id` 값을 읽는 방법

예:

```js
const params = new URLSearchParams(window.location.search);
const id = params.get("id");
```

## B. 특정 데이터 하나 불러오기

다음과 같은 요청을 이해하세요.

```http
GET /api/questions/12
```

질문 목록 전체를 가져오는 것과  
질문 하나의 상세정보를 가져오는 것의 차이를 이해합니다.

## C. 중첩 JSON 구조

질문 상세 응답 안에는 다음이 들어올 수 있습니다.

```text
질문 정보
+
answers[]
```

학습할 내용:

- object property
- object 안의 array
- `.map()`
- `.forEach()`

## D. POST 요청

답변을 등록하기 위해 POST 요청을 사용합니다.

## E. 데이터 갱신 후 다시 렌더링

답변 등록 또는 답변 채택 후:

```text
사용자 동작
 ↓
API 요청
 ↓
질문 데이터 다시 GET
 ↓
화면 다시 출력
```

방식으로 구현하면 됩니다.

---

# 3. 프로젝트 환경

백엔드 주소 예시:

```text
http://HOST_IP:8100
```

개발 중에는:

```text
http://localhost:8100
```

을 사용할 수 있습니다.

백엔드 담당자가 최종 API 명세를 제공합니다.

**필드명이나 API 경로를 임의로 변경하지 마세요.**

---

# 4. 담당 화면

예:

```text
[Python]

FastAPI에서 WebSocket이 왜 끊기나요?

Sean

페이지를 refresh하면 기존 connection이...

────────────────────────────────

답변

✓ 채택된 답변

Minho

페이지 refresh 시 기존 WebSocket connection이
destroy되므로 다시 연결해야 합니다.

────────────────────────────────

Jisu

frontend에 reconnect logic을 추가할 수도 있습니다.

────────────────────────────────

답변 작성

Nickname
[ Sean ]

[                                  ]
[                                  ]

[답변 등록]
```

---

# 5. 질문 상세 불러오기

URL에서 질문 ID를 읽습니다.

예:

```text
question.html?id=12
```

그 다음:

```http
GET /api/questions/12
```

를 호출합니다.

예상 응답:

```json
{
  "id": 12,
  "title": "Servo가 회전하지 않습니다",
  "body": "Servo.write(90)을 사용했지만 진동만 합니다.",
  "tag": "Arduino",
  "author": "Sean",
  "solved": true,
  "accepted_answer_id": 32,
  "created_at": "...",
  "answers": [
    {
      "id": 32,
      "author": "Minho",
      "body": "외부 5V 전원을 확인해보세요.",
      "accepted": true,
      "created_at": "..."
    }
  ]
}
```

화면에 다음을 표시합니다.

- 태그
- 제목
- 작성자
- 질문 내용
- 해결 여부
- 답변 목록

---

# 6. 답변 목록 렌더링

다음 배열을 반복해서 출력합니다.

```js
question.answers
```

각 답변에 최소 표시:

- 작성자
- 답변 내용
- 채택 여부
- 채택 버튼

채택된 답변은 명확하게 표시합니다.

예:

```text
✓ 채택된 답변
```

가능하다면 채택 답변을 맨 위에 보여줘도 좋지만  
필수는 아닙니다.

---

# 7. 답변 작성

입력 항목:

- nickname
- 답변 내용

다음 API를 호출합니다.

```http
POST /api/questions/{question_id}/answers
```

예상 요청:

```json
{
  "nickname": "Minho",
  "body": "USB 전원만으로는 전류가 부족할 수 있습니다."
}
```

성공 후:

1. 답변 입력창 비우기
2. 질문 상세 다시 불러오기
3. 업데이트된 답변 목록 렌더링

가장 단순하게는 전체 페이지 새로고침을 해도 됩니다.

---

# 8. 답변 채택

채택되지 않은 답변에:

```text
[채택]
```

버튼을 표시합니다.

클릭하면:

```http
POST /api/questions/{question_id}/accept/{answer_id}
```

를 호출합니다.

예상 응답:

```json
{
  "success": true,
  "question_id": 12,
  "accepted_answer_id": 32
}
```

성공 후 다시 질문 상세를 불러와:

```text
✓ 채택된 답변
```

상태를 표시합니다.

이 MVP에서는 실제 로그인/권한 검증은 하지 않습니다.

---

# 9. 권장 파일 구성

예:

```text
frontend/
├── question.html
├── question.js
└── styles.css
```

가능하면 프론트엔드 C가 만든 공통 CSS를 재사용합니다.

---

# 10. 권장 구현 순서

## Step 1

가짜 데이터로 정적인 질문 상세 화면을 만듭니다.

## Step 2

URL에서 `id` 값을 읽습니다.

## Step 3

질문 상세를 불러오는 함수를 만듭니다.

```js
async function loadQuestion() {
    // GET 질문 상세
    // 질문 렌더링
    // 답변 렌더링
}
```

## Step 4

답변 배열 렌더링 함수를 만듭니다.

## Step 5

답변 작성 POST를 연결합니다.

## Step 6

답변 채택 POST를 연결합니다.

## Step 7

POST 성공 후 `loadQuestion()`을 다시 호출합니다.

---

# 11. 꼭 처리하면 좋은 상태

## URL에 질문 ID가 없는 경우

```text
question.html
```

처럼 `id`가 없다면:

```text
질문 ID가 없습니다.
```

## 질문을 찾을 수 없는 경우

```text
질문을 찾을 수 없습니다.
```

## 답변이 없는 경우

```text
아직 답변이 없습니다.
첫 답변을 작성해보세요.
```

## 답변 등록 실패

간단한 오류 메시지를 표시합니다.

---

# 12. 구현하지 않아도 되는 것

다음은 담당 범위가 아닙니다.

- DB
- 로그인 / 인증
- 질문 작성
- 전체 질문 검색
- 투표
- 답변 댓글
- WebSocket
- 알림
- AI 기능
- 파일 업로드

---

# 13. PPT 준비 파트

개발과 동시에 아래 내용을 준비합니다.

## Architecture

간단한 구조:

```text
Browser
   │
   │ HTTP / JSON
   ▼
FastAPI
   │
   ▼
SQLite
```

또한:

```text
Chat App     :8000
Piazza-lite  :8100
```

두 서비스는 별도로 동작하지만  
교실 사용자 DB는 공유할 수 있다는 점을 정리합니다.

## Demo Flow

예:

```text
학생 A 질문 작성
        ↓
학생 B 답변 작성
        ↓
답변 채택
        ↓
질문이 해결됨 상태로 변경
        ↓
다른 학생이 나중에 검색 가능
```

가능하면 다음 화면을 스크린샷으로 준비합니다.

- 해결된 질문
- 채택된 답변
- 답변이 2개 이상 달린 상태

---

# 14. 완료 조건

- [ ] URL에서 question ID 읽기
- [ ] 질문 상세 GET 동작
- [ ] 제목 표시
- [ ] 작성자 표시
- [ ] 본문 표시
- [ ] 태그 표시
- [ ] 답변 목록 표시
- [ ] 답변 없음 상태 표시
- [ ] 답변 작성 form 동작
- [ ] 답변 POST 동작
- [ ] 채택 버튼 동작
- [ ] 채택된 답변 표시
- [ ] POST 후 화면 다시 갱신
- [ ] 기본 오류 상태 처리
- [ ] PPT architecture / demo flow 정리

---

# 15. 이 파트에서 이해해야 할 핵심

```text
URL
 ↓
Question ID
 ↓
GET Question
 ↓
질문 + 답변 렌더링
 ↓
사용자 동작
 ↓
POST
 ↓
업데이트된 질문 다시 GET
 ↓
화면 재렌더링
```

이 파트에서 이해해야 할 핵심은:

> **URL을 이용해 특정 데이터를 불러오고, 사용자 동작으로 서버 데이터를 변경한 뒤 화면을 다시 갱신하는 과정**

# Piazza-Lite Frontend D 파트 - 통합 및 연동 주의사항 가이드

이 문서는 Piazza-lite 프로젝트 통합 시 프론트엔드 D 파트(질문 상세/답변/채택)를 연결할 때 반드시 확인해야 할 규격과 주의사항을 정리한 가이드입니다.

---

## 1. 파일 구조 및 경로 규칙
* **파일 분리 유지**: 단일 레포지토리로 병합할 때 CSS 충돌을 방지하기 위해 스타일은 공통용(`common.css`)과 상세 페이지용(`question.css`)으로 분리되어 있습니다.
* **상대 경로 확인**: HTML 파일에서 CSS 및 JS를 불러올 때의 경로(`css/common.css`, `js/question.js`)를 유지해 주세요.

---

## 2. API 연동 및 요청 규격 (필수 준수)

### ① 기본 엔드포인트 및 접속 방식
* **Base URL**: `http://127.0.0.1:8100` (개발 환경 기준)
* **URL 쿼리 파라미터**: 상세 페이지는 반드시 `question.html?id={question_id}` 형태로 접속해야만 정상적으로 데이터를 불러올 수 있습니다[cite: 1, 3]. `id`가 누락된 경우 에러 처리가 동작합니다[cite: 1, 2].

### ② 답변 등록 (`POST /api/questions/{question_id}/answers`)
* **필드명 주의**: 요청 바디(Body)에 닉네임을 보낼 때 기존의 `nickname`이 아닌 **`author`** 필드를 사용해야 합니다.
  ```json
  {
    "author": "사용자닉네임",
    "body": "답변 내용입니다."
  }
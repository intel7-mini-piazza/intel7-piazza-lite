# Piazza-lite 프론트엔드 통합 가이드

## 1. 파일 구조
- `css/common.css`: 전체 프로젝트 공통 스타일 (버튼, 폰트, 섹션 간격)
- `css/question.css`: 상세 페이지 전용 스타일
- `js/question.js`: 질문 상세 데이터 로딩 및 답변 기능 로직
- `question.html`: 화면 구성

## 2. 통합 시 주의사항
- **CSS 충돌 방지**: 모든 스타일은 `common.css`에 정의된 클래스(.btn, .input-field 등)를 최대한 활용하고, 페이지 전용 스타일은 `question.css`에 분리해서 작성했습니다.
- **경로 설정**: 모든 파일은 상대 경로(`css/`, `js/`)를 기준으로 작성되었으니, 합칠 때 폴더 위치를 유지해주세요.
- **API 서버 주소**: `question.js` 상단의 `API_BASE_URL`이 각자의 로컬 환경과 다를 수 있습니다. 합칠 때 최종 배포 주소로 일괄 변경이 필요합니다.

## 3. 핵심 동작 로직
- URL에서 `id`를 읽어오는 `getQuestionIdFromURL()` 함수가 정상 작동해야 페이지가 렌더링됩니다.
- 모든 데이터는 `fetch`를 통해 서버와 JSON 형태로 통신합니다.
// 백엔드 API 서버 주소 (개발 환경 기준)
const API_BASE_URL = "http://localhost:8100";

// 페이지가 로드되자마자 실행
document.addEventListener("DOMContentLoaded", () => {
    const questionId = getQuestionIdFromURL();

    if (!questionId) {
        alert("질문 ID가 없습니다.");
        return;
    }

    // 질문 상세 데이터 불러오기
    loadQuestionDetail(questionId);

    // 답변 등록 버튼 이벤트 리스너 연결
    const submitBtn = document.getElementById("submit-answer");
    if (submitBtn) {
        submitBtn.addEventListener("click", () => submitAnswer(questionId));
    }
});

// 1. URL 쿼리 파라미터에서 id 추출하는 함수
function getQuestionIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

// 2. 질문 상세 및 답변 목록 조회 (GET)
async function loadQuestionDetail(questionId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/questions/${questionId}`);
        
        if (!response.ok) {
            throw new Error("질문을 찾을 수 없습니다.");
        }

        const question = await response.json();
        renderQuestion(question);
        renderAnswers(question.answers, questionId);
    } catch (error) {
        console.error(error);
        document.getElementById("question-container").innerHTML = `<p>${error.message}</p>`;
    }
}

// 3. 질문 내용 화면에 렌더링
function renderQuestion(question) {
    document.getElementById("question-title").textContent = question.title;
    document.getElementById("question-author").textContent = question.author;
    document.getElementById("question-body").textContent = question.body;
}

// 4. 답변 목록 화면에 렌더링
function renderAnswers(answers, questionId) {
    const answerListContainer = document.getElementById("answer-list");
    answerListContainer.innerHTML = "";

    if (!answers || answers.length === 0) {
        answerListContainer.innerHTML = "<p>아직 답변이 없습니다. 첫 답변을 작성해보세요.</p>";
        return;
    }

    answers.forEach(answer => {
        const answerItem = document.createElement("div");
        answerItem.className = "answer-item";
        
        // 채택된 답변인 경우 스타일이나 표시 다르게 처리
        const isAccepted = answer.accepted;
        
        answerItem.innerHTML = `
            <div class="answer-header">
                <strong>${answer.author}</strong>
                ${isAccepted ? '<span class="accepted-badge">✓ 채택된 답변</span>' : ''}
            </div>
            <p class="answer-body">${answer.body}</p>
            ${!isAccepted ? `<button onclick="acceptAnswer(${questionId}, ${answer.id})">채택</button>` : ''}
            <hr>
        `;
        answerListContainer.appendChild(answerItem);
    });
}

// 5. 답변 등록 (POST)
async function submitAnswer(questionId) {
    const nicknameInput = document.getElementById("nickname");
    const bodyInput = document.getElementById("answer-body");

    const nickname = nicknameInput.value.trim();
    const body = bodyInput.value.trim();

    if (!nickname || !body) {
        alert("닉네임과 답변 내용을 모두 입력해주세요.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/questions/${questionId}/answers`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ nickname, body })
        });

        if (!response.ok) {
            throw new Error("답변 등록에 실패했습니다.");
        }

        // 입력창 초기화
        nicknameInput.value = "";
        bodyInput.value = "";

        // 데이터 갱신 후 화면 다시 불러오기
        loadQuestionDetail(questionId);
    } catch (error) {
        alert(error.message);
    }
}

// 6. 답변 채택 (POST)
async function acceptAnswer(questionId, answerId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/questions/${questionId}/accept/${answerId}`, {
            method: "POST"
        });

        if (!response.ok) {
            throw new Error("답변 채택에 실패했습니다.");
        }

        // 채택 성공 후 화면 갱신
        loadQuestionDetail(questionId);
    } catch (error) {
        alert(error.message);
    }
}
// 백엔드 API 서버 주소 (로컬 개발 환경 기준)
const API_BASE_URL = "http://127.0.0.1:8100";

document.addEventListener("DOMContentLoaded", () => {
    const questionId = getQuestionIdFromURL();

    if (!questionId) {
        alert("질문 ID가 없습니다.");
        return;
    }

    // 질문 상세 데이터 불러오기
    loadQuestionDetail(questionId);

    // 답변 등록 버튼 이벤트 리스너
    const submitBtn = document.getElementById("submit-answer");
    if (submitBtn) {
        submitBtn.addEventListener("click", () => submitAnswer(questionId));
    }
});

// 1. URL 쿼리 파라미터에서 id 추출
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

// 3. 질문 내용 화면 렌더링
function renderQuestion(question) {
    document.getElementById("question-title").textContent = question.title;
    document.getElementById("question-author").textContent = `작성자: ${question.author}`;
    document.getElementById("question-tag").textContent = `태그: ${question.tag}`;
    document.getElementById("question-body").textContent = question.body;
}

// 4. 답변 목록 화면 렌더링 (서버가 주는 오래된 순 그대로 출력)
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
        
        const isAccepted = answer.accepted;
        
        answerItem.innerHTML = `
            <div class="answer-header">
                <strong>${answer.author}</strong>
                ${isAccepted ? '<span class="accepted-badge">✓ 채택된 답변</span>' : ''}
            </div>
            <p class="answer-body">${answer.body}</p>
            ${!isAccepted ? `<button class="btn" onclick="acceptAnswer(${questionId}, ${answer.id})">채택</button>` : ''}
            <hr style="margin-top: 10px; border: 0; border-top: 1px solid #eee;">
        `;
        answerListContainer.appendChild(answerItem);
    });
}

// 5. 답변 등록 (POST) - author 필드 사용 및 BambooChat 에러 대응
async function submitAnswer(questionId) {
    const authorInput = document.getElementById("author");
    const bodyInput = document.getElementById("answer-body");

    const author = authorInput.value.trim();
    const body = bodyInput.value.trim();

    if (!author || !body) {
        alert("닉네임과 답변 내용을 모두 입력해주세요.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/questions/${questionId}/answers`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ author, body })
        });

        const data = await response.json();

        if (!response.ok) {
            // BambooChat에 등록되지 않은 닉네임일 경우 서버의 detail 메시지 출력
            throw new Error(data.detail || "답변 등록에 실패했습니다.");
        }

        // 입력창 초기화 후 화면 갱신
        authorInput.value = "";
        bodyInput.value = "";
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
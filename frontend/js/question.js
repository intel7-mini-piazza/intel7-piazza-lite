// 백엔드 API 상대 경로
const API_BASE_URL = "";

document.addEventListener("DOMContentLoaded", () => {
    const questionId = getQuestionIdFromURL();

    if (!questionId) {
        alert("질문 ID가 없습니다.");
        window.location.href = "index.html";
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
    const questionContainer = document.getElementById("question-container");
    try {
        const response = await fetch(`/api/questions/${questionId}`);
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || "질문을 찾을 수 없습니다.");
        }

        const question = await response.json();
        renderQuestion(question);
        renderAnswers(question.answers, questionId, question.accepted_answer_id);
    } catch (error) {
        console.error(error);
        if (questionContainer) {
            questionContainer.innerHTML = `<p style="color: #dc2626; padding: 20px;">${escapeHtml(error.message)}</p>`;
        }
    }
}

// 3. 질문 내용 화면 렌더링 (안전한 textContent 사용)
function renderQuestion(question) {
    const titleEl = document.getElementById("question-title");
    const authorEl = document.getElementById("question-author");
    const tagEl = document.getElementById("question-tag");
    const bodyEl = document.getElementById("question-body");

    if (titleEl) titleEl.textContent = question.title;
    if (authorEl) authorEl.textContent = `작성자: ${question.author}`;
    if (tagEl) tagEl.textContent = `태그: ${question.tag}`;
    if (bodyEl) bodyEl.textContent = question.body;
}

// 4. 답변 목록 화면 렌더링 (XSS 방지 DOM 조립)
function renderAnswers(answers, questionId, acceptedAnswerId) {
    const answerListContainer = document.getElementById("answer-list");
    if (!answerListContainer) return;
    answerListContainer.innerHTML = "";

    if (!answers || answers.length === 0) {
        const emptyMsg = document.createElement("p");
        emptyMsg.textContent = "아직 답변이 없습니다. 첫 답변을 작성해보세요.";
        emptyMsg.style.color = "#666";
        emptyMsg.style.padding = "10px 0";
        answerListContainer.appendChild(emptyMsg);
        return;
    }

    answers.forEach(answer => {
        const answerItem = document.createElement("div");
        answerItem.className = "answer-item";
        
        const isAccepted = answer.accepted || (acceptedAnswerId && answer.id === acceptedAnswerId);
        
        const headerDiv = document.createElement("div");
        headerDiv.className = "answer-header";
        headerDiv.style.display = "flex";
        headerDiv.style.alignItems = "center";
        headerDiv.style.gap = "8px";
        headerDiv.style.marginBottom = "8px";

        const authorStrong = document.createElement("strong");
        authorStrong.textContent = answer.author;
        headerDiv.appendChild(authorStrong);

        if (isAccepted) {
            const acceptedBadge = document.createElement("span");
            acceptedBadge.className = "accepted-badge";
            acceptedBadge.textContent = "✓ 채택된 답변";
            headerDiv.appendChild(acceptedBadge);
        }

        const bodyP = document.createElement("p");
        bodyP.className = "answer-body";
        bodyP.textContent = answer.body;
        bodyP.style.whiteSpace = "pre-wrap";
        bodyP.style.margin = "8px 0";

        answerItem.appendChild(headerDiv);
        answerItem.appendChild(bodyP);

        if (!isAccepted) {
            const actionDiv = document.createElement("div");
            actionDiv.style.marginTop = "8px";

            const acceptBtn = document.createElement("button");
            acceptBtn.className = "btn";
            acceptBtn.textContent = "채택";
            acceptBtn.style.backgroundColor = "#10b981";
            acceptBtn.style.color = "#fff";
            acceptBtn.style.padding = "4px 12px";
            acceptBtn.style.fontSize = "13px";
            acceptBtn.onclick = () => acceptAnswer(questionId, answer.id, acceptBtn);

            actionDiv.appendChild(acceptBtn);
            answerItem.appendChild(actionDiv);
        }

        const hr = document.createElement("hr");
        hr.style.marginTop = "12px";
        hr.style.border = "0";
        hr.style.borderTop = "1px solid #eee";
        answerItem.appendChild(hr);

        answerListContainer.appendChild(answerItem);
    });
}

// 5. 답변 등록 (POST)
async function submitAnswer(questionId) {
    const authorInput = document.getElementById("author");
    const bodyInput = document.getElementById("answer-body");
    const submitBtn = document.getElementById("submit-answer");

    const author = authorInput.value.trim();
    const body = bodyInput.value.trim();

    if (!author || !body) {
        alert("닉네임과 답변 내용을 모두 입력해주세요.");
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "답변 등록 중...";
    }

    try {
        const response = await fetch(`/api/questions/${questionId}/answers`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ author, nickname: author, body })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "답변 등록에 실패했습니다.");
        }

        // 입력창 초기화 후 화면 갱신
        bodyInput.value = "";
        await loadQuestionDetail(questionId);
    } catch (error) {
        alert(error.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "답변 등록";
        }
    }
}

// 6. 답변 채택 (POST)
async function acceptAnswer(questionId, answerId, buttonEl) {
    if (buttonEl) {
        buttonEl.disabled = true;
        buttonEl.textContent = "채택 중...";
    }

    try {
        const response = await fetch(`/api/questions/${questionId}/accept/${answerId}`, {
            method: "POST"
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "답변 채택에 실패했습니다.");
        }

        // 채택 성공 후 화면 갱신
        await loadQuestionDetail(questionId);
    } catch (error) {
        alert(error.message);
        if (buttonEl) {
            buttonEl.disabled = false;
            buttonEl.textContent = "채택";
        }
    }
}

// Helper: Simple HTML escape for fallback strings
function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[m]));
}
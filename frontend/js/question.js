// ==========================================================================
// Piazza-Lite Question Detail & Answers Logic
// ==========================================================================

document.addEventListener("DOMContentLoaded", async () => {
    const user = await requireCurrentUser();
    if (!user) return;

    const answerAuthorDisplay = document.getElementById("answerAuthorDisplay");
    if (answerAuthorDisplay) {
        answerAuthorDisplay.textContent = `답변자: ${user.display_name || user.username}`;
    }

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

        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || "질문을 찾을 수 없습니다.");
        }

        const question = await response.json();
        renderQuestion(question);
        renderAnswers(question.answers, questionId, question.accepted_answer_id, question.can_accept_answers);
    } catch (error) {
        console.error(error);
        if (questionContainer) {
            questionContainer.innerHTML = `<p style="color: var(--piazza-danger); padding: 20px;">${escapeHtml(error.message)}</p>`;
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
    if (tagEl) tagEl.textContent = `[${question.tag}]`;
    if (bodyEl) bodyEl.textContent = question.body;
}

// 4. 답변 목록 화면 렌더링 (XSS 방지 DOM 조립 및 소유자 채택 버튼 표시)
function renderAnswers(answers, questionId, acceptedAnswerId, canAcceptAnswers) {
    const answerListContainer = document.getElementById("answer-list");
    if (!answerListContainer) return;
    answerListContainer.innerHTML = "";

    if (!answers || answers.length === 0) {
        const emptyMsg = document.createElement("p");
        emptyMsg.textContent = "아직 답변이 없습니다. 첫 답변을 작성해보세요.";
        emptyMsg.style.color = "var(--piazza-muted)";
        emptyMsg.style.padding = "10px 0";
        emptyMsg.style.fontSize = "13px";
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
        headerDiv.style.justifyContent = "space-between";
        headerDiv.style.alignItems = "center";

        const authorSpan = document.createElement("span");
        authorSpan.innerHTML = `<strong>${escapeHtml(answer.author)}</strong> <span style="color: var(--piazza-muted); font-size: 11px;">(${answer.created_at})</span>`;
        headerDiv.appendChild(authorSpan);

        if (isAccepted) {
            const acceptedBadge = document.createElement("span");
            acceptedBadge.className = "accepted-badge";
            acceptedBadge.textContent = "✓ 채택된 답변";
            headerDiv.appendChild(acceptedBadge);
        }

        const bodyP = document.createElement("p");
        bodyP.className = "answer-body";
        bodyP.textContent = answer.body;

        answerItem.appendChild(headerDiv);
        answerItem.appendChild(bodyP);

        // 채택 권한이 있고 미채택 상태일 때만 채택 버튼 노출
        if (canAcceptAnswers && !isAccepted) {
            const actionDiv = document.createElement("div");
            actionDiv.style.marginTop = "8px";

            const acceptBtn = document.createElement("button");
            acceptBtn.className = "btn";
            acceptBtn.textContent = "✓ 답변 채택";
            acceptBtn.style.backgroundColor = "var(--piazza-action)";
            acceptBtn.style.color = "#ffffff";
            acceptBtn.style.padding = "4px 12px";
            acceptBtn.style.fontSize = "12px";
            acceptBtn.onclick = () => acceptAnswer(questionId, answer.id, acceptBtn);

            actionDiv.appendChild(acceptBtn);
            answerItem.appendChild(actionDiv);
        }

        answerListContainer.appendChild(answerItem);
    });
}

// 5. 답변 등록 (POST)
async function submitAnswer(questionId) {
    const bodyInput = document.getElementById("answer-body");
    const submitBtn = document.getElementById("submit-answer");

    const body = bodyInput.value.trim();

    if (!body) {
        alert("답변 내용을 입력해주세요.");
        bodyInput.focus();
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
            body: JSON.stringify({ body })
        });

        if (response.status === 401) {
            redirectToLogin();
            return;
        }

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

        if (response.status === 401) {
            redirectToLogin();
            return;
        }

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
            buttonEl.textContent = "✓ 답변 채택";
        }
    }
}
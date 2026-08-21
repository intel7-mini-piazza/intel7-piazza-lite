// ==========================================================================
// Bamboo-Stack (대나무지식인) Unified Home Workspace Logic
// ==========================================================================

const API_BASE_URL = "/api/questions";

// Workspace State
let currentUser = null;
let selectedQuestionId = null;
let previousSelectedId = null;
let cachedQuestions = [];

// DOM Elements
let postFeed = null;
let postDetail = null;
let searchForm = null;
let searchInput = null;
let askButton = null;

// ==========================================================================
// Initialization
// ==========================================================================

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Authenticate user
    currentUser = await requireCurrentUser();
    if (!currentUser) return;

    postFeed = document.querySelector("#postFeed");
    postDetail = document.querySelector("#postDetail");
    searchForm = document.querySelector("#searchForm");
    searchInput = document.querySelector("#searchInput");
    askButton = document.querySelector("#askButton");

    // 2. Attach Top-Level Listeners
    if (askButton) {
        askButton.addEventListener("click", () => openQuestionComposer(true));
    }

    if (searchForm) {
        searchForm.addEventListener("submit", (e) => {
            e.preventDefault();
            loadQuestions(searchInput.value.trim());
        });
    }

    window.addEventListener("popstate", handlePopState);

    // 3. Load Questions Feed and Route Initial Workspace State
    await loadQuestions();
    handleInitialRoute();
});

// ==========================================================================
// Feed Management
// ==========================================================================

async function loadQuestions(searchTerm = "") {
    try {
        let url = API_BASE_URL;
        if (searchTerm) {
            url += `?search=${encodeURIComponent(searchTerm)}`;
        }

        const response = await fetch(url);
        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        if (!response.ok) {
            throw new Error("질문 목록을 불러오지 못했습니다.");
        }

        cachedQuestions = await response.json();
        renderFeed(cachedQuestions);
    } catch (error) {
        console.error("Feed loading error:", error);
        if (postFeed) {
            postFeed.innerHTML = `<div class="status-message error">${escapeHtml(error.message)}</div>`;
        }
    }
}

function renderFeed(questions) {
    if (!postFeed) return;
    postFeed.innerHTML = "";

    if (!questions || questions.length === 0) {
        postFeed.innerHTML = `<div class="status-message">검색 결과가 없습니다.</div>`;
        return;
    }

    questions.forEach(q => {
        const card = document.createElement("article");
        card.className = "post-card";
        card.id = `feed-card-${q.id}`;
        if (selectedQuestionId && q.id === selectedQuestionId) {
            card.classList.add("active");
        }

        const tag = document.createElement("span");
        tag.className = "post-tag";
        tag.textContent = `[${q.tag || "일반"}]`;

        const title = document.createElement("h3");
        title.className = "post-title";
        title.textContent = q.title;

        const meta = document.createElement("div");
        meta.className = "post-meta";

        const author = document.createElement("span");
        author.textContent = q.author || "익명";

        const sep1 = document.createElement("span");
        sep1.className = "post-meta-separator";
        sep1.textContent = "·";

        const ansCount = document.createElement("span");
        ansCount.id = `feed-ans-count-${q.id}`;
        ansCount.textContent = `답변 ${q.answer_count || 0}`;

        const sep2 = document.createElement("span");
        sep2.className = "post-meta-separator";
        sep2.textContent = "·";

        const solved = document.createElement("span");
        solved.id = `feed-solved-${q.id}`;
        if (q.solved) {
            solved.className = "solved";
            solved.textContent = "✓ 해결됨";
        } else {
            solved.className = "unsolved";
            solved.textContent = "미해결";
        }

        meta.appendChild(author);
        meta.appendChild(sep1);
        meta.appendChild(ansCount);
        meta.appendChild(sep2);
        meta.appendChild(solved);

        card.appendChild(tag);
        card.appendChild(title);
        card.appendChild(meta);

        card.addEventListener("click", () => selectQuestion(q.id, true));

        postFeed.appendChild(card);
    });
}

function updateFeedCardSelection() {
    const cards = document.querySelectorAll(".post-card");
    cards.forEach(card => card.classList.remove("active"));

    if (selectedQuestionId) {
        const activeCard = document.getElementById(`feed-card-${selectedQuestionId}`);
        if (activeCard) {
            activeCard.classList.add("active");
        }
    }
}

// ==========================================================================
// Question Selection & Detail Workspace
// ==========================================================================

async function selectQuestion(questionId, updateHistory = true) {
    if (!questionId) return;

    previousSelectedId = selectedQuestionId;
    selectedQuestionId = Number(questionId);

    if (updateHistory) {
        history.pushState({ post: selectedQuestionId }, "", `/?post=${selectedQuestionId}`);
    }

    updateFeedCardSelection();
    renderQuestionLoading();

    try {
        const response = await fetch(`${API_BASE_URL}/${selectedQuestionId}`);
        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || "질문을 찾을 수 없습니다.");
        }

        const question = await response.json();
        renderQuestionDetail(question);
    } catch (error) {
        console.error("Detail loading error:", error);
        renderWorkspaceError(error.message);
    }
}

function renderQuestionLoading() {
    if (!postDetail) return;
    postDetail.innerHTML = `
        <div class="workspace-loading">
            <p>질문 상세 정보를 불러오는 중입니다...</p>
        </div>
    `;
}

function renderWorkspaceError(message) {
    if (!postDetail) return;
    postDetail.innerHTML = `
        <div class="status-message error" style="margin: 20px 0;">
            <p style="font-weight: 600; margin-bottom: 8px;">오류가 발생했습니다</p>
            <p style="font-size: 13px;">${escapeHtml(message)}</p>
            <button class="btn btn-primary" style="margin-top: 14px;" onclick="renderWelcome(true)">
                홈으로 돌아가기
            </button>
        </div>
    `;
}

function renderQuestionDetail(q) {
    if (!postDetail) return;
    postDetail.innerHTML = "";

    // 1. Header & Metadata
    const header = document.createElement("div");
    header.className = "workspace-detail-header";

    const title = document.createElement("h2");
    title.className = "workspace-title";
    title.textContent = q.title;

    const meta = document.createElement("div");
    meta.className = "workspace-meta";

    const tag = document.createElement("span");
    tag.className = "post-tag";
    tag.textContent = `[${q.tag}]`;

    const author = document.createElement("span");
    author.innerHTML = `작성자: <b>${escapeHtml(q.author)}</b>`;

    const date = document.createElement("span");
    date.textContent = `작성일: ${q.created_at}`;

    const solvedBadge = document.createElement("span");
    if (q.solved) {
        solvedBadge.className = "solved";
        solvedBadge.textContent = "✓ 해결됨 (채택 완료)";
    } else {
        solvedBadge.className = "unsolved";
        solvedBadge.textContent = "미해결";
    }

    meta.appendChild(tag);
    meta.appendChild(author);
    meta.appendChild(date);
    meta.appendChild(solvedBadge);

    header.appendChild(title);
    header.appendChild(meta);

    // 2. Question Body
    const body = document.createElement("div");
    body.className = "workspace-body";
    body.textContent = q.body;

    // 3. Answers List Section
    const answersSection = document.createElement("div");
    answersSection.className = "workspace-answers-section";

    const answersTitle = document.createElement("h3");
    answersTitle.className = "workspace-section-title";
    answersTitle.textContent = `답변 (${q.answers ? q.answers.length : 0})`;
    answersSection.appendChild(answersTitle);

    const answerList = document.createElement("div");
    answerList.className = "workspace-answer-list";

    if (!q.answers || q.answers.length === 0) {
        const emptyAnswers = document.createElement("div");
        emptyAnswers.className = "workspace-empty-answers";
        emptyAnswers.textContent = "아직 등록된 답변이 없습니다. 첫 번째 답변을 작성해보세요!";
        answerList.appendChild(emptyAnswers);
    } else {
        q.answers.forEach(a => {
            const answerItem = document.createElement("div");
            answerItem.className = `workspace-answer-item ${a.accepted ? "accepted" : ""}`;

            const aHeader = document.createElement("div");
            aHeader.className = "answer-header";

            const aAuthor = document.createElement("div");
            const authorName = document.createElement("span");
            authorName.className = "answer-author";
            authorName.textContent = a.author;

            const aDate = document.createElement("span");
            aDate.className = "answer-date";
            aDate.textContent = `(${a.created_at})`;

            aAuthor.appendChild(authorName);
            aAuthor.appendChild(aDate);
            aHeader.appendChild(aAuthor);

            if (a.accepted) {
                const acceptedBadge = document.createElement("span");
                acceptedBadge.className = "accepted-badge";
                acceptedBadge.textContent = "✓ 채택된 답변";
                aHeader.appendChild(acceptedBadge);
            }

            const aBody = document.createElement("p");
            aBody.className = "answer-body";
            aBody.textContent = a.body;

            answerItem.appendChild(aHeader);
            answerItem.appendChild(aBody);

            // 질문 작성자이고 미채택 상태인 경우 채택 버튼 렌더링
            if (q.can_accept_answers && !a.accepted) {
                const acceptBtn = document.createElement("button");
                acceptBtn.className = "accept-btn";
                acceptBtn.textContent = "✓ 답변 채택";
                acceptBtn.addEventListener("click", () => acceptAnswer(q.id, a.id, acceptBtn));
                answerItem.appendChild(acceptBtn);
            }

            answerList.appendChild(answerItem);
        });
    }

    answersSection.appendChild(answerList);

    // 4. Inline Reply Composer
    const replyCard = document.createElement("div");
    replyCard.className = "workspace-reply-card";

    const replyHeader = document.createElement("div");
    replyHeader.className = "reply-header";

    const replyTitle = document.createElement("h4");
    replyTitle.style.margin = "0";
    replyTitle.style.fontSize = "14px";
    replyTitle.style.color = "var(--piazza-heading)";
    replyTitle.textContent = "답변 작성하기";

    const replyUserBadge = document.createElement("span");
    replyUserBadge.className = "reply-author-badge";
    replyUserBadge.textContent = `${currentUser.display_name || currentUser.username}(으)로 답변 작성`;

    replyHeader.appendChild(replyTitle);
    replyHeader.appendChild(replyUserBadge);

    const replyTextarea = document.createElement("textarea");
    replyTextarea.className = "input-field";
    replyTextarea.rows = 4;
    replyTextarea.placeholder = "도움이 되는 답변과 문제 해결 코드를 작성해주세요.";
    replyTextarea.style.marginBottom = "10px";

    const replyError = document.createElement("p");
    replyError.className = "form-message";
    replyError.style.color = "var(--piazza-danger)";
    replyError.style.fontSize = "12px";
    replyError.style.margin = "0 0 8px 0";

    const replyActions = document.createElement("div");
    replyActions.style.display = "flex";
    replyActions.style.justifyContent = "flex-end";

    const replySubmitBtn = document.createElement("button");
    replySubmitBtn.className = "btn btn-primary";
    replySubmitBtn.textContent = "답변 등록";

    replySubmitBtn.addEventListener("click", () => {
        const text = replyTextarea.value.trim();
        if (!text) {
            replyError.textContent = "답변 내용을 입력해주세요.";
            replyTextarea.focus();
            return;
        }
        submitAnswer(q.id, text, replySubmitBtn, replyError, replyTextarea);
    });

    replyActions.appendChild(replySubmitBtn);

    replyCard.appendChild(replyHeader);
    replyCard.appendChild(replyTextarea);
    replyCard.appendChild(replyError);
    replyCard.appendChild(replyActions);

    answersSection.appendChild(replyCard);

    // Assemble Workspace
    postDetail.appendChild(header);
    postDetail.appendChild(body);
    postDetail.appendChild(answersSection);
}

// ==========================================================================
// Answer Actions
// ==========================================================================

async function submitAnswer(questionId, bodyText, btnEl, errorEl, textareaEl) {
    if (btnEl) {
        btnEl.disabled = true;
        btnEl.textContent = "등록 중...";
    }
    if (errorEl) errorEl.textContent = "";

    try {
        const response = await fetch(`${API_BASE_URL}/${questionId}/answers`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ body: bodyText }),
        });

        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || "답변 등록에 실패했습니다.");
        }

        if (textareaEl) textareaEl.value = "";

        // 질문 상세 다시 로드
        await selectQuestion(questionId, false);

        // 좌측 피드의 답변 개수 갱신
        const feedCountEl = document.getElementById(`feed-ans-count-${questionId}`);
        if (feedCountEl) {
            const currentCountMatch = feedCountEl.textContent.match(/\d+/);
            const currentCount = currentCountMatch ? parseInt(currentCountMatch[0], 10) : 0;
            feedCountEl.textContent = `답변 ${currentCount + 1}`;
        }
    } catch (error) {
        if (errorEl) errorEl.textContent = error.message;
    } finally {
        if (btnEl) {
            btnEl.disabled = false;
            btnEl.textContent = "답변 등록";
        }
    }
}

async function acceptAnswer(questionId, answerId, btnEl) {
    if (btnEl) {
        btnEl.disabled = true;
        btnEl.textContent = "채택 중...";
    }

    try {
        const response = await fetch(`${API_BASE_URL}/${questionId}/accept/${answerId}`, {
            method: "POST",
        });

        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.detail || "답변 채택에 실패했습니다.");
        }

        // 질문 상세 다시 로드
        await selectQuestion(questionId, false);

        // 좌측 피드의 해결 상태 갱신
        const feedSolvedEl = document.getElementById(`feed-solved-${questionId}`);
        if (feedSolvedEl) {
            feedSolvedEl.className = "solved";
            feedSolvedEl.textContent = "✓ 해결됨";
        }
    } catch (error) {
        alert(error.message);
        if (btnEl) {
            btnEl.disabled = false;
            btnEl.textContent = "✓ 답변 채택";
        }
    }
}

// ==========================================================================
// Question Composer Workspace
// ==========================================================================

function openQuestionComposer(updateHistory = true) {
    previousSelectedId = selectedQuestionId;
    selectedQuestionId = null;

    if (updateHistory) {
        history.pushState({ compose: true }, "", "/?compose=question");
    }

    updateFeedCardSelection();
    renderNewQuestionForm();
}

function closeComposer() {
    if (previousSelectedId) {
        selectQuestion(previousSelectedId, true);
    } else {
        renderWelcome(true);
    }
}

function renderNewQuestionForm() {
    if (!postDetail) return;
    postDetail.innerHTML = "";

    const card = document.createElement("div");
    card.className = "composer-card";

    const header = document.createElement("div");
    header.className = "composer-header";

    const title = document.createElement("h2");
    title.className = "composer-title";
    title.textContent = "새 질문 작성";

    const userBadge = document.createElement("span");
    userBadge.style.fontSize = "13px";
    userBadge.style.color = "var(--piazza-muted)";
    userBadge.textContent = `${currentUser.display_name || currentUser.username}(으)로 질문 작성`;

    header.appendChild(title);
    header.appendChild(userBadge);

    const form = document.createElement("form");
    form.id = "inlineQuestionForm";

    // Title Field
    const titleGroup = document.createElement("div");
    titleGroup.className = "form-group";
    const titleLabel = document.createElement("label");
    titleLabel.className = "form-label";
    titleLabel.textContent = "질문 제목";
    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.className = "input-field";
    titleInput.placeholder = "질문의 핵심 내용을 요약해주세요";
    titleGroup.appendChild(titleLabel);
    titleGroup.appendChild(titleInput);

    // Tag Field
    const tagGroup = document.createElement("div");
    tagGroup.className = "form-group";
    const tagLabel = document.createElement("label");
    tagLabel.className = "form-label";
    tagLabel.textContent = "카테고리 태그";
    const tagSelect = document.createElement("select");
    tagSelect.className = "input-field";

    const tags = ["Python", "Arduino", "Network", "PLC", "FastAPI", "Docker", "Other"];
    tags.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        tagSelect.appendChild(opt);
    });
    tagGroup.appendChild(tagLabel);
    tagGroup.appendChild(tagSelect);

    // Body Field
    const bodyGroup = document.createElement("div");
    bodyGroup.className = "form-group";
    const bodyLabel = document.createElement("label");
    bodyLabel.className = "form-label";
    bodyLabel.textContent = "질문 상세 내용";
    const bodyTextarea = document.createElement("textarea");
    bodyTextarea.className = "input-field";
    bodyTextarea.rows = 8;
    bodyTextarea.placeholder = "문제 상황, 발생한 오류 코드 및 시도해본 해결책을 상세히 작성해주세요.";
    bodyGroup.appendChild(bodyLabel);
    bodyGroup.appendChild(bodyTextarea);

    // Error Message
    const errorMsg = document.createElement("p");
    errorMsg.className = "form-message";
    errorMsg.style.color = "var(--piazza-danger)";
    errorMsg.style.fontSize = "13px";
    errorMsg.style.margin = "8px 0";

    // Action Buttons
    const actions = document.createElement("div");
    actions.className = "composer-actions";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn btn-secondary";
    cancelBtn.textContent = "취소";
    cancelBtn.addEventListener("click", closeComposer);

    const submitBtn = document.createElement("button");
    submitBtn.type = "submit";
    submitBtn.className = "btn btn-primary";
    submitBtn.textContent = "질문 등록";

    actions.appendChild(cancelBtn);
    actions.appendChild(submitBtn);

    form.appendChild(titleGroup);
    form.appendChild(tagGroup);
    form.appendChild(bodyGroup);
    form.appendChild(errorMsg);
    form.appendChild(actions);

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const tVal = titleInput.value.trim();
        const bVal = bodyTextarea.value.trim();
        const tagVal = tagSelect.value;

        errorMsg.textContent = "";

        if (!tVal) {
            errorMsg.textContent = "질문 제목을 입력해주세요.";
            titleInput.focus();
            return;
        }

        if (!bVal) {
            errorMsg.textContent = "질문 상세 내용을 입력해주세요.";
            bodyTextarea.focus();
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "등록 중...";

        try {
            const response = await fetch(API_BASE_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: tVal,
                    body: bVal,
                    tag: tagVal,
                }),
            });

            if (response.status === 401) {
                redirectToLogin();
                return;
            }

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.detail || "질문 등록에 실패했습니다.");
            }

            // 피드 갱신 후 새로 생성된 질문 자동 선택
            await loadQuestions();
            selectQuestion(result.id, true);
        } catch (err) {
            errorMsg.textContent = err.message || "질문 등록 중 오류가 발생했습니다.";
            submitBtn.disabled = false;
            submitBtn.textContent = "질문 등록";
        }
    });

    card.appendChild(header);
    card.appendChild(form);
    postDetail.appendChild(card);
}

// ==========================================================================
// Welcome State
// ==========================================================================

function renderWelcome(updateHistory = false) {
    selectedQuestionId = null;
    if (updateHistory) {
        history.pushState({}, "", "/");
    }
    updateFeedCardSelection();

    if (!postDetail) return;
    postDetail.innerHTML = `
        <div class="initial-message">
            <h3>교수님과 학생들이 좋아하는 대나무지식인(Bamboo-Stack)의 주요 기능:</h3>
            <ul>
                <li>
                    <span class="step-icon">1</span>
                    <span><b>질문 검색 및 피드</b>를 통해 실시간 질문 목록을 빠르게 확인하세요.</span>
                </li>
                <li>
                    <span class="step-icon">2</span>
                    <span><b>상세 및 답변하기</b>: 질문 카드를 클릭하여 오른쪽 워크스페이스에서 바로 답변을 작성하세요.</span>
                </li>
                <li>
                    <span class="step-icon">3</span>
                    <span><b>채택 시스템</b>: 질문 작성자는 가장 유용한 답변을 해결책으로 채택할 수 있습니다.</span>
                </li>
                <li>
                    <span class="step-icon">4</span>
                    <span><b>통합 질문 작성</b>: 상단 [질문하기] 버튼을 눌러 화면 이동 없이 즉시 새 질문을 등록하세요.</span>
                </li>
                <li>
                    <span class="step-icon">5</span>
                    <span><b>BambooChat 연동</b>: 채팅 앱 계정으로 안전하게 로그인하고 질문을 공유하세요.</span>
                </li>
            </ul>
        </div>
    `;
}

// ==========================================================================
// History & Route Handling
// ==========================================================================

function handlePopState(event) {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get("post");
    const compose = params.get("compose");

    if (postId) {
        selectQuestion(postId, false);
    } else if (compose === "question") {
        openQuestionComposer(false);
    } else {
        renderWelcome(false);
    }
}

function handleInitialRoute() {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get("post");
    const compose = params.get("compose");

    if (postId) {
        selectQuestion(postId, false);
    } else if (compose === "question") {
        openQuestionComposer(false);
    } else {
        renderWelcome(false);
    }
}

// Helper: Simple HTML escape
function escapeHtml(text) {
    if (!text) return "";
    return String(text).replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[m]));
}
// =========================
// Piazza-Lite Home & Search Logic
// =========================

const API_URL = "/api/questions";

// HTML 요소 가져오기
const postFeed = document.querySelector("#postFeed");
const postDetail = document.querySelector("#postDetail");
const searchForm = document.querySelector("#searchForm");
const searchInput = document.querySelector("#searchInput");
const askButton = document.querySelector("#askButton");

// =========================
// 질문 목록 불러오기 (실제 백엔드 API 연동)
// =========================
async function loadQuestions(search = "") {
    try {
        let url = API_URL;
        if (search.trim() !== "") {
            url += `?search=${encodeURIComponent(search.trim())}`;
        }

        const response = await fetch(url);
        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        if (!response.ok) {
            throw new Error("질문 목록을 불러오지 못했습니다.");
        }

        const questions = await response.json();
        renderQuestions(questions);
    } catch (error) {
        console.error("질문 로딩 실패:", error);
        showError(error.message);
    }
}

// =========================
// 질문 목록 화면에 출력 (XSS 방지 safe textContent)
// =========================
function renderQuestions(questions) {
    if (!postFeed) return;
    postFeed.innerHTML = "";

    if (!questions || questions.length === 0) {
        showEmpty();
        return;
    }

    questions.forEach(function(question) {
        const card = document.createElement("article");
        card.className = "post-card";
        card.id = `post-card-${question.id}`;

        const tag = document.createElement("span");
        tag.className = "post-tag";
        tag.textContent = `[${question.tag || "일반"}]`;

        const title = document.createElement("h3");
        title.className = "post-title";
        title.textContent = question.title;

        const meta = document.createElement("div");
        meta.className = "post-meta";

        const author = document.createElement("span");
        author.textContent = question.author || "익명";

        const answerCount = document.createElement("span");
        answerCount.textContent = `답변 ${question.answer_count || 0}`;

        const solved = document.createElement("span");
        if (question.solved) {
            solved.textContent = "✓ 해결됨";
            solved.className = "solved";
        } else {
            solved.textContent = "미해결";
            solved.className = "unsolved";
        }

        const separator1 = document.createElement("span");
        separator1.className = "post-meta-separator";
        separator1.textContent = "·";

        const separator2 = document.createElement("span");
        separator2.className = "post-meta-separator";
        separator2.textContent = "·";

        meta.appendChild(author);
        meta.appendChild(separator1);
        meta.appendChild(answerCount);
        meta.appendChild(separator2);
        meta.appendChild(solved);

        card.appendChild(tag);
        card.appendChild(title);
        card.appendChild(meta);

        // 카드 클릭 시 우측 영역에 상세 미리보기 및 페이지 이동 안내
        card.addEventListener("click", function() {
            const currentActive = document.querySelector(".post-card.active");
            if (currentActive) {
                currentActive.classList.remove("active");
            }
            card.classList.add("active");

            showDetail(question.id);
        });

        postFeed.appendChild(card);
    });
}

// =========================
// 우측 패널 상세 내용 표시 (API 호출)
// =========================
async function showDetail(questionId) {
    if (!postDetail) return;

    postDetail.innerHTML = `
        <div style="padding: 40px 20px; text-align: center; color: #6b7280;">
            <p>질문 상세 내용을 불러오는 중입니다...</p>
        </div>
    `;

    try {
        const response = await fetch(`/api/questions/${questionId}`);
        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        if (!response.ok) {
            throw new Error("질문 정보를 불러오지 못했습니다.");
        }
        const q = await response.json();

        const solvedBadge = q.solved
            ? `<span style="color: #16a34a; font-weight: 600; font-size: 13px;">✓ 해결됨 (채택 완료)</span>`
            : `<span style="color: #dc2626; font-size: 13px;">미해결</span>`;

        postDetail.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px;">
                <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #111827;">${escapeHtml(q.title)}</h2>
                <a href="question.html?id=${q.id}" class="search-button" style="text-decoration: none; display: inline-flex; align-items: center; justify-content: center; white-space: nowrap; height: 32px; font-size: 12px;">
                    상세 및 답변하기 →
                </a>
            </div>
            <p class="post-author" style="font-size: 12px; color: #6b7280; margin-bottom: 16px;">
                <b>${escapeHtml(q.author)}</b> · 태그: [${escapeHtml(q.tag)}] · ${solvedBadge}
            </p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 16px 0;">
            <div class="post-text" style="font-size: 14px; line-height: 1.7; color: #374151; white-space: pre-wrap; word-break: break-word;">${escapeHtml(q.body)}</div>
            
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                <h4 style="margin: 0 0 12px; font-size: 14px; color: #111827;">답변 (${q.answers ? q.answers.length : 0}개)</h4>
                ${
                    q.answers && q.answers.length > 0
                        ? q.answers.map(a => `
                            <div style="padding: 10px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 8px;">
                                <div style="display: flex; justify-content: space-between; font-size: 12px; color: #4b5563; margin-bottom: 4px;">
                                    <strong>${escapeHtml(a.author)}</strong>
                                    ${a.accepted ? `<span style="color: #16a34a; font-weight: 600;">✓ 채택된 답변</span>` : ''}
                                </div>
                                <div style="font-size: 13px; color: #1f2937; white-space: pre-wrap;">${escapeHtml(a.body)}</div>
                            </div>
                        `).join('')
                        : `<p style="font-size: 13px; color: #9ca3af;">아직 등록된 답변이 없습니다.</p>`
                }
            </div>
        `;
    } catch (err) {
        postDetail.innerHTML = `
            <div class="status-message error" style="padding: 30px; text-align: center;">
                <p>${escapeHtml(err.message)}</p>
                <button onclick="window.location.href='question.html?id=${questionId}'" class="search-button" style="margin-top: 10px;">
                    질문 페이지 직접 이동
                </button>
            </div>
        `;
    }
}

// =========================
// 질문하기 버튼 클릭 시 이동
// =========================
if (askButton) {
    askButton.addEventListener("click", function() {
        window.location.href = "ask.html";
    });
}

// =========================
// 검색 이벤트
// =========================
if (searchForm) {
    searchForm.addEventListener("submit", function(event) {
        event.preventDefault();
        loadQuestions(searchInput.value);
    });
}

// =========================
// 빈 상태 / 오류 상태
// =========================
function showEmpty() {
    if (postFeed) {
        postFeed.innerHTML = `<div class="status-message">검색 결과가 없습니다.</div>`;
    }
}

function showError(msg) {
    if (postFeed) {
        postFeed.innerHTML = `<div class="status-message error">질문을 불러오지 못했습니다: ${escapeHtml(msg)}</div>`;
    }
}

// 초기화: 인증 상태 확인 후 질문 목록 로드
document.addEventListener("DOMContentLoaded", async () => {
    const user = await requireCurrentUser();
    if (user) {
        loadQuestions();
    }
});
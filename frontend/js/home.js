// =========================
// 테스트용 가짜 데이터 (더미 데이터)
// =========================
const mockQuestions = [
    {
        id: 1,
        tag: "hw1",
        title: "급수 급속 수렴 여부 질문입니다.",
        author: "김철수",
        answer_count: 3,
        solved: true,
        created_at: "2026-08-21",
        content: "1n^(3/2) 형태로 바꿨는데 수렴하는 게 맞나요? 계산 과정을 모르겠습니다."
    },
    {
        id: 2,
        tag: "hw2",
        title: "기말고사 대비 파이널 8번 문제 질문",
        author: "이영희",
        answer_count: 1,
        solved: false,
        created_at: "2026-08-20",
        content: "8번 문제 풀이 접근을 어떻게 해야 할지 감이 안 잡힙니다. 힌트 부탁드려요!"
    },
    {
        id: 3,
        tag: "project",
        title: "팀 프로젝트 브랜치 생성 및 푸시 방법",
        author: "박민수",
        answer_count: 5,
        solved: true,
        created_at: "2026-08-19",
        content: "각자 브랜치를 만들어서 push한 뒤 PR을 보내는 순서가 맞는지 확인 부탁드립니다."
    }
];

// =========================
// HTML 요소 가져오기
// =========================
const postFeed = document.querySelector("#postFeed");
const postDetail = document.querySelector("#postDetail");
const searchForm = document.querySelector("#searchForm");
const searchInput = document.querySelector("#searchInput");
const askButton = document.querySelector("#askButton");

// =========================
// 질문 목록 불러오기 (더미 데이터 사용)
// =========================
function loadQuestions(search = "") {
    let filtered = mockQuestions;

    if (search.trim() !== "") {
        filtered = mockQuestions.filter(q => 
            q.title.includes(search) || q.content.includes(search)
        );
    }

    renderQuestions(filtered);
}

// =========================
// 질문 목록 화면에 출력
// =========================
function renderQuestions(questions) {
    postFeed.innerHTML = "";

    if (questions.length === 0) {
        showEmpty();
        return;
    }

    questions.forEach(function(question) {
        const card = document.createElement("article");
        card.className = "post-card";

        const tag = document.createElement("span");
        tag.className = "post-tag";
        tag.textContent = `[${question.tag}]`;

        const title = document.createElement("h3");
        title.className = "post-title";
        title.textContent = question.title;

        const meta = document.createElement("div");
        meta.className = "post-meta";

        const author = document.createElement("span");
        author.textContent = question.author;

        const answerCount = document.createElement("span");
        answerCount.textContent = `답변 ${question.answer_count}`;

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

        // 카드 클릭 시 상세 내용 변경
        card.addEventListener("click", function() {
            const currentActive = document.querySelector(".post-card.active");
            if (currentActive) {
                currentActive.classList.remove("active");
            }
            card.classList.add("active");

            showDetail(question);
        });

        postFeed.appendChild(card);
    });
}

// =========================
// 상세 내용 표시
// =========================
function showDetail(question) {
    postDetail.innerHTML = `
        <h2>${question.title}</h2>
        <p class="post-author">${question.author} · ${question.created_at}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 16px 0;">
        <p class="post-text">${question.content}</p>
    `;
}

// =========================
// 질문하기 버튼 클릭 시 API 연결 확인 및 에러 출력
// =========================
askButton.addEventListener("click", async function() {
    try {
        // 질문 등록 페이지용 백엔드 API 엔드포인트 호출 시도
        const response = await fetch("/api/questions/check-status");

        if (!response.ok) {
            throw new Error(`API 응답 오류 (상태 코드: ${response.status})`);
        }

        // API 연결 성공 시 질문 작성 페이지로 이동
        window.location.href = "ask.html";

    } catch (error) {
        console.error("질문하기 API 연결 실패:", error);

        // 오른쪽 상세 영역(postDetail)에 눈으로 바로 보이는 에러 메시지 표시
        postDetail.innerHTML = `
            <div class="status-message error" style="padding: 40px 20px; text-align: center;">
                <h2 style="color: #dc2626; margin-bottom: 12px;">⚠️ 백엔드 API 연결 실패</h2>
                <p style="font-size: 15px; color: #374151; margin-bottom: 8px;">
                    <b>[질문하기]</b> 기능에 필요한 API 서버에 연결할 수 없습니다.
                </p>
                <code style="background-color: #f3f4f6; padding: 6px 12px; border-radius: 4px; color: #e11d48; font-size: 13px;">
                    ${error.message} (엔드포인트: /api/questions/check-status)
                </code>
                <p style="font-size: 13px; color: #6b7280; margin-top: 20px;">
                    현재 프론트엔드(Live Server)만 실행 중이거나 백엔드 서버가 열려있지 않은 상태입니다.
                </p>
            </div>
        `;
    }
});

// =========================
// 검색 이벤트
// =========================
searchForm.addEventListener("submit", function(event) {
    event.preventDefault();
    loadQuestions(searchInput.value);
});

// =========================
// 빈 상태
// =========================
function showEmpty() {
    postFeed.innerHTML = `<div class="status-message">검색 결과가 없습니다.</div>`;
}

loadQuestions();
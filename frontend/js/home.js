// =========================
// 설정
// =========================

const API_URL = "/api/questions";


// =========================
// HTML 요소 가져오기
// =========================

const questionList = document.querySelector("#questionList");
const searchForm = document.querySelector("#searchForm");
const searchInput = document.querySelector("#searchInput");
const askButton = document.querySelector("#askButton");


// =========================
// 질문 목록 가져오기
// =========================

async function loadQuestions(search = "") {

    try {

        let url = API_URL;

        if (search.trim() !== "") {
            url += `?search=${encodeURIComponent(search.trim())}`;
        }


        const response = await fetch(url);


        if (!response.ok) {
            throw new Error("질문 목록을 불러오지 못했습니다.");
        }


        const questions = await response.json();


        renderQuestions(questions);

    } catch (error) {

        console.error(error);

        showError();

    }
}


// =========================
// 질문 목록 화면에 출력
// =========================

function renderQuestions(questions) {

    questionList.innerHTML = "";


    // 질문이 없는 경우
    if (questions.length === 0) {

        showEmpty();

        return;
    }


    questions.forEach(function(question) {

        const card = document.createElement("article");

        card.className = "question-card";


        // 태그
        const tag = document.createElement("span");

        tag.className = "question-tag";

        tag.textContent = `[${question.tag}]`;


        // 제목
        const title = document.createElement("h3");

        title.className = "question-title";

        title.textContent = question.title;


        // 메타 정보
        const meta = document.createElement("div");

        meta.className = "question-meta";


        // 작성자
        const author = document.createElement("span");

        author.textContent = question.author;


        // 답변 개수
        const answerCount = document.createElement("span");

        answerCount.textContent =
            `답변 ${question.answer_count}개`;


        // 해결 여부
        const solved = document.createElement("span");


        if (question.solved) {

            solved.textContent = "✓ 해결됨";
            solved.className = "solved";

        } else {

            solved.textContent = "미해결";
            solved.className = "unsolved";
        }


        // 메타 정보 사이 구분자
        const separator1 = document.createElement("span");

        separator1.className = "question-meta-separator";

        separator1.textContent = "·";


        const separator2 = document.createElement("span");

        separator2.className = "question-meta-separator";

        separator2.textContent = "·";


        // 메타 정보 조립
        meta.appendChild(author);

        meta.appendChild(separator1);

        meta.appendChild(answerCount);

        meta.appendChild(separator2);

        meta.appendChild(solved);


        // 카드 조립
        card.appendChild(tag);

        card.appendChild(title);

        card.appendChild(meta);


        // 질문 상세 페이지 이동
        card.addEventListener("click", function() {

            window.location.href =
                `question.html?id=${question.id}`;

        });


        // 화면에 카드 추가
        questionList.appendChild(card);

    });
}


// =========================
// 검색
// =========================

searchForm.addEventListener("submit", function(event) {

    event.preventDefault();

    const query = searchInput.value;

    loadQuestions(query);

});


// =========================
// 질문하기
// =========================

askButton.addEventListener("click", function() {

    window.location.href = "ask.html";

});


// =========================
// 빈 상태
// =========================

function showEmpty() {

    questionList.innerHTML = `
        <div class="status-message">
            검색 결과가 없습니다.
        </div>
    `;

}


// =========================
// 오류 상태
// =========================

function showError() {

    questionList.innerHTML = `
        <div class="status-message error">
            질문을 불러오지 못했습니다.
        </div>
    `;

}


loadQuestions();
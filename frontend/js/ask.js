const form = document.getElementById("questionForm");

const nicknameInput = document.getElementById("nickname");
const titleInput = document.getElementById("title");
const bodyInput = document.getElementById("body");
const tagInput = document.getElementById("tag");
const submitBtn = document.getElementById("submitBtn") || form.querySelector("button[type='submit']");
const message = document.getElementById("message");


form.addEventListener("submit", async (event) => {

    // 기본 form 제출 방지
    event.preventDefault();


    // 입력값 가져오기
    const nickname = nicknameInput.value.trim();
    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();
    const tag = tagInput.value;


    // 기존 메시지 초기화
    message.textContent = "";
    message.style.color = "#dc2626";


    // 입력값 검증
    if (nickname === "") {
        message.textContent = "닉네임을 입력해주세요.";
        nicknameInput.focus();
        return;
    }

    if (title === "") {
        message.textContent = "제목을 입력해주세요.";
        titleInput.focus();
        return;
    }

    if (body === "") {
        message.textContent = "질문 내용을 입력해주세요.";
        bodyInput.focus();
        return;
    }


    // 서버로 보낼 JSON 데이터 (author 및 nickname 호환 지원)
    const data = {
        author: nickname,
        nickname: nickname,
        title: title,
        body: body,
        tag: tag
    };

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "질문 등록 중...";
    }

    try {
        // 상대 경로 POST 요청
        const response = await fetch("/api/questions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        // 서버 응답 실패
        if (!response.ok) {
            const errorMsg = result?.detail || "질문 등록 실패";
            throw new Error(errorMsg);
        }

        // 생성된 질문 상세 페이지로 이동
        window.location.href = `question.html?id=${result.id}`;

    } catch (error) {
        console.error(error);
        message.textContent = error.message || "질문 등록에 실패했습니다. 다시 시도해주세요.";
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "질문 등록";
        }
    }

});
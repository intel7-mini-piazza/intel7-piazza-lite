const form = document.getElementById("questionForm");

const nicknameInput = document.getElementById("nickname");
const titleInput = document.getElementById("title");
const bodyInput = document.getElementById("body");
const tagInput = document.getElementById("tag");

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


    // 입력값 검증
    if (nickname === "") {
        message.textContent = "닉네임을 입력해주세요.";
        return;
    }

    if (title === "") {
        message.textContent = "제목을 입력해주세요.";
        return;
    }

    if (body === "") {
        message.textContent = "질문 내용을 입력해주세요.";
        return;
    }


    // 서버로 보낼 JSON 데이터
    const data = {
        nickname: nickname,
        title: title,
        body: body,
        tag: tag
    };


    try {

        // POST 요청
        const response = await fetch(
            "http://localhost:8100/api/questions",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(data)
            }
        );


        // 서버 응답 실패
        if (!response.ok) {
            throw new Error("질문 등록 실패");
        }


        // 서버가 반환한 JSON 받기
        const result = await response.json();


        console.log(result);


        // 생성된 질문 상세 페이지로 이동
        window.location.href =
            `question.html?id=${result.id}`;


    } catch (error) {

        console.error(error);

        message.textContent =
            "질문 등록에 실패했습니다. 다시 시도해주세요.";
    }

});
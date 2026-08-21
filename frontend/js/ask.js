// ==========================================================================
// Piazza-Lite Ask Question Logic
// ==========================================================================

document.addEventListener("DOMContentLoaded", async () => {
    const user = await requireCurrentUser();
    if (!user) return;

    const authorDisplay = document.getElementById("authorDisplay");
    if (authorDisplay) {
        authorDisplay.textContent = `작성자: ${user.display_name || user.username}`;
    }

    const form = document.getElementById("questionForm");
    const titleInput = document.getElementById("title");
    const bodyInput = document.getElementById("body");
    const tagInput = document.getElementById("tag");
    const submitBtn = document.getElementById("submitBtn");
    const message = document.getElementById("message");

    if (!form) return;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const title = titleInput.value.trim();
        const body = bodyInput.value.trim();
        const tag = tagInput.value;

        message.textContent = "";
        message.style.color = "var(--piazza-danger)";

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

        // 서버로 보낼 JSON 데이터 (작성자는 세션에서 자동 결정)
        const data = {
            title: title,
            body: body,
            tag: tag
        };

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "질문 등록 중...";
        }

        try {
            const response = await fetch("/api/questions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            });

            if (response.status === 401) {
                redirectToLogin();
                return;
            }

            const result = await response.json();

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
});
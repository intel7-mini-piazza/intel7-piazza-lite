// ==========================================================================
// Bamboo-Stack (대나무지식인) Login Logic
// ==========================================================================

document.addEventListener("DOMContentLoaded", async () => {
    // 1. 이미 로그인되어 있는지 확인
    const user = await fetchCurrentUser();
    if (user) {
        redirectToNext();
        return;
    }

    const loginForm = document.getElementById("loginForm");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const submitBtn = document.getElementById("submitBtn");
    const errorMessage = document.getElementById("errorMessage");

    if (!loginForm) return;

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value;

        errorMessage.textContent = "";

        if (!username) {
            errorMessage.textContent = "아이디를 입력해주세요.";
            usernameInput.focus();
            return;
        }

        if (!password) {
            errorMessage.textContent = "비밀번호를 입력해주세요.";
            passwordInput.focus();
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "로그인 중...";

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                throw new Error("아이디 또는 비밀번호가 올바르지 않습니다.");
            }

            // 성공 시 리다이렉트
            redirectToNext();
        } catch (error) {
            errorMessage.textContent = error.message || "로그인에 실패했습니다.";
            passwordInput.value = "";
            passwordInput.focus();
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = "로그인";
        }
    });
});

function getSafeNextUrl() {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (!next) return "/";

    // 안전한 로컬 경로 검증 (단일 /로 시작하고 //로 시작하지 않음)
    if (next.startsWith("/") && !next.startsWith("//")) {
        return next;
    }
    return "/";
}

function redirectToNext() {
    window.location.href = getSafeNextUrl();
}

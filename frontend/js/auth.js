// ==========================================================================
// Bamboo-Stack (대나무지식인) Shared Frontend Authentication Helper
// ==========================================================================

async function fetchCurrentUser() {
    try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) {
            return null;
        }
        const data = await response.json();
        return data.user || null;
    } catch (e) {
        return null;
    }
}

async function requireCurrentUser() {
    const user = await fetchCurrentUser();
    if (!user) {
        redirectToLogin();
        return null;
    }
    renderAuthHeader(user);
    return user;
}

function redirectToLogin() {
    const currentPath = window.location.pathname + window.location.search;
    const loginUrl = `login.html?next=${encodeURIComponent(currentPath)}`;
    window.location.href = loginUrl;
}

async function logout() {
    try {
        await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
        console.error("Logout error:", e);
    } finally {
        window.location.href = "login.html";
    }
}

function renderAuthHeader(user) {
    const headerInner = document.querySelector(".header-inner");
    if (!headerInner) return;

    let authContainer = document.getElementById("auth-header-container");
    if (!authContainer) {
        authContainer = document.createElement("div");
        authContainer.id = "auth-header-container";
        authContainer.style.display = "flex";
        authContainer.style.alignItems = "center";
        authContainer.style.gap = "14px";

        // Insert before or next to existing action buttons
        const askButton = document.getElementById("askButton");
        if (askButton) {
            headerInner.insertBefore(authContainer, askButton);
        } else {
            headerInner.appendChild(authContainer);
        }
    }

    authContainer.innerHTML = `
        <span style="color: #ffffff; font-size: 13px; font-weight: 500;">
            <b>${escapeHtml(user.display_name || user.username)}</b> 님
        </span>
        <button id="logoutBtn" class="btn" style="background: rgba(255,255,255,0.15); color: #ffffff; padding: 4px 10px; font-size: 12px; border: 1px solid rgba(255,255,255,0.3);">
            로그아웃
        </button>
    `;

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.onclick = logout;
    }
}

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

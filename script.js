console.log("🔥 `script.js` 已載入");

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, get, update, child } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const firebaseConfig = {
    databaseURL: "https://access-7a3c3-default-rtdb.firebaseio.com/"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ✅ 取得 Firebase 使用者參照
async function getUserRef() {
    const username = localStorage.getItem('loggedInUser');
    if (!username) return null;
    return ref(db, `users/${username}`);
}

// ✅ 驗證登入狀態
function checkLoginStatus() {
    const username = localStorage.getItem('loggedInUser');
    const token = localStorage.getItem('sessionToken');
    if (!username || !token) {
        console.log("⛔ 未登入，跳轉登入頁");
        window.location.href = 'index.html';
    }
}

// ✅ 登出功能
async function logout() {
    const username = localStorage.getItem('loggedInUser');
    const token = localStorage.getItem('sessionToken');
    if (!username || !token) return;

    try {
        const userRef = await getUserRef();
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            const user = snapshot.val();
            if (user.sessionToken === token) {
                await update(userRef, { isLoggedIn: false, sessionToken: "" });
                console.log(`✅ 使用者 ${username} 成功登出`);
            }
        }
    } catch (err) {
        console.error("❌ 登出錯誤：", err);
    }

    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('currentPDF');
    localStorage.removeItem('currentPDFName');
}

// ✅ 同步登出（pagehide 時用）
function logoutSync() {
    const username = localStorage.getItem("loggedInUser");
    const token = localStorage.getItem("sessionToken");
    if (!username || !token) return;

    const url = `https://access-7a3c3-default-rtdb.firebaseio.com/users/${username}.json`;
    const payload = JSON.stringify({ isLoggedIn: false, sessionToken: "" });

    const blob = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon(url, blob);

    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("sessionToken");
    localStorage.removeItem("currentPDF");
    localStorage.removeItem("currentPDFName");
}

// ✅ 登出函式供 HTML 使用
window.logout = async function () {
    await logout();
    window.location.href = 'index.html';
};

// ✅ 標記點擊跳轉，避免 pagehide 誤判
window.addEventListener("DOMContentLoaded", () => {
    const allLinks = document.querySelectorAll("a, button");
    allLinks.forEach(el => {
        el.addEventListener("click", () => {
            sessionStorage.setItem("pageNavigation", "true");
        });
    });
});

// ✅ pagehide：若不是跳轉，觸發同步登出
window.addEventListener("pagehide", () => {
    const navigating = sessionStorage.getItem("pageNavigation");
    if (navigating) {
        sessionStorage.removeItem("pageNavigation");
    } else {
        console.log("👋 離開頁面，自動登出");
        logoutSync();
    }
});

// ✅ 閒置登出邏輯（pdf-select / pdf-viewer）
if (window.location.pathname.includes("pdf-select") || window.location.pathname.includes("pdf-viewer")) {
    checkLoginStatus();

    let idleTimeout;
    let timeLeft = 30 * 60; // 30 分鐘
    const timerDisplay = document.getElementById("timer");

    function updateTimer() {
        if (timerDisplay) {
            const min = Math.floor(timeLeft / 60);
            const sec = timeLeft % 60;
            timerDisplay.innerText = `${min}:${sec < 10 ? "0" : ""}${sec}`;
        }
    }

    function startIdleTimer() {
        clearInterval(idleTimeout);
        timeLeft = 30 * 60;
        updateTimer();

        idleTimeout = setInterval(async () => {
            timeLeft--;
            updateTimer();

            if (timeLeft <= 0) {
                clearInterval(idleTimeout);
                console.log("⏰ 閒置時間到，強制登出");
                await logout();
                window.location.href = 'index.html';
            }
        }, 1000);
    }

    document.addEventListener("mousemove", startIdleTimer);
    document.addEventListener("keydown", startIdleTimer);
    document.addEventListener("touchstart", startIdleTimer);
    startIdleTimer();
}

console.log("🔥 `script.js` 已載入");

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const firebaseConfig = {
    databaseURL: "https://access-7a3c3-default-rtdb.firebaseio.com/"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ✅ 取得使用者 Firebase 參照
async function getUserRef() {
    const username = localStorage.getItem('loggedInUser');
    if (!username) return null;
    return ref(db, `users/${username}`);
}

// ✅ 確認是否登入
function checkLoginStatus() {
    const user = localStorage.getItem('loggedInUser');
    const token = localStorage.getItem('sessionToken');
    if (!user || !token) {
        console.log("⛔ 未登入，跳轉登入頁");
        window.location.href = 'index.html';
    }
}

// ✅ 登出：Firebase 清空、localStorage 清空
async function logout() {
    const username = localStorage.getItem('loggedInUser');
    if (!username) return;

    try {
        const userRef = await getUserRef();
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            const user = snapshot.val();
            await update(userRef, { isLoggedIn: false, sessionToken: "", password: user.password });
        }
    } catch (err) {
        console.error("❌ 登出錯誤：", err);
    }

    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('currentPDF');
    localStorage.removeItem('currentPDFName');
}

// ✅ 同步登出，給 pagehide 用
function logoutSync() {
    const username = localStorage.getItem("loggedInUser");
    const token = localStorage.getItem("sessionToken");
    if (!username || !token) return;

    const url = `https://access-7a3c3-default-rtdb.firebaseio.com/users/${username}.json`;
    const payload = JSON.stringify({ isLoggedIn: false, sessionToken: "" });
    navigator.sendBeacon(url, payload);

    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("sessionToken");
    localStorage.removeItem("currentPDF");
    localStorage.removeItem("currentPDFName");
}

// ✅ 登出可在 HTML 呼叫
window.logout = async function () {
    await logout();
    window.location.href = 'index.html';
};

// ✅ 標記點擊跳轉（避免誤判）
document.addEventListener("DOMContentLoaded", () => {
    const elements = document.querySelectorAll("a, button");
    elements.forEach(el => {
        el.addEventListener("click", () => {
            sessionStorage.setItem("pageNavigation", "true");
        });
    });
});

// ✅ 判斷是否跳出頁面（非跳轉行為）→ 自動登出
window.addEventListener("pagehide", () => {
    const navigating = sessionStorage.getItem("pageNavigation");
    sessionStorage.removeItem("pageNavigation");

    if (!navigating) {
        console.log("🛑 偵測離開頁面，自動登出");
        logoutSync();
    }
});

// ✅ 閒置 30 分鐘登出倒數邏輯
if (window.location.pathname.includes("pdf-select") || window.location.pathname.includes("pdf-viewer")) {
    checkLoginStatus();

    let idleTimeout;
    let timeLeft = 30 * 60;
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
                console.log("⏰ 閒置自動登出");
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

console.log("🔥 `script.js` 已載入");

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const firebaseConfig = {
    databaseURL: "https://access-7a3c3-default-rtdb.firebaseio.com/"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ✅ 取得當前登入使用者的 Firebase 參照
async function getUserRef() {
    const username = localStorage.getItem('loggedInUser');
    if (!username) return null;
    return ref(db, `users/${username}`);
}

// ✅ 確保用戶已登入
function checkLoginStatus() {
    if (!localStorage.getItem('loggedInUser') || !localStorage.getItem('sessionToken')) {
        console.log("⛔ 未登入，跳轉至登入頁面");
        window.location.href = 'index.html';
    }
}

// ✅ 同步版登出函式（for beforeunload）
function logoutSync() {
    const username = localStorage.getItem('loggedInUser');
    if (!username) return;

    const sessionToken = localStorage.getItem('sessionToken');
    if (!sessionToken) return;

    const url = `https://access-7a3c3-default-rtdb.firebaseio.com/users/${username}.json`;
    const payload = {
        isLoggedIn: false,
        sessionToken: ""
    };

    fetch(url, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        keepalive: true
    });

    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('currentPDF');
    localStorage.removeItem('currentPDFName');
}

// ✅ 登出功能（一般 async）
async function logout(preserveNavigation = false) {
    const username = localStorage.getItem('loggedInUser');
    if (!username) return;

    try {
        const userRef = await getUserRef();
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            const userData = snapshot.val();

            await fetch(`https://access-7a3c3-default-rtdb.firebaseio.com/users/${username}.json`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    isLoggedIn: false,
                    sessionToken: "",
                    password: userData.password
                })
            });
        }
    } catch (error) {
        console.error("❌ 登出錯誤：", error);
    }

    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('currentPDF');
    localStorage.removeItem('currentPDFName');

    if (!preserveNavigation) {
        window.location.href = 'index.html';
    }
}

// ✅ 提供 HTML 使用的登出函式
window.logout = async function () {
    await logout();
};

// ✅ beforeunload：關閉頁面時同步登出
window.addEventListener("beforeunload", () => {
    if (!sessionStorage.getItem("pageNavigation")) {
        logoutSync();
    } else {
        sessionStorage.removeItem("pageNavigation");
    }
});

// ✅ 點擊連結或按鈕時標記為頁面跳轉
document.addEventListener("DOMContentLoaded", function () {
    const links = document.querySelectorAll("a, button");
    links.forEach(link => {
        link.addEventListener("click", function () {
            sessionStorage.setItem("pageNavigation", "true");
        });
    });
});

// ✅ 閒置 30 分鐘自動登出
if (window.location.pathname.includes("pdf-select") || window.location.pathname.includes("pdf-viewer")) {
    checkLoginStatus();

    let idleTimeout;
    let timeLeft = 30 * 60; // 30 分鐘
    const timerDisplay = document.getElementById("timer");

    function updateTimer() {
        if (timerDisplay) {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerDisplay.innerText = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
        }
    }

    async function startIdleTimer() {
        clearTimeout(idleTimeout);
        timeLeft = 30 * 60;
        updateTimer();

        idleTimeout = setInterval(async () => {
            timeLeft--;
            updateTimer();

            if (timeLeft <= 0) {
                console.log("⏰ 閒置時間已到，執行登出...");
                await logout();
            }
        }, 1000);
    }

    document.addEventListener("mousemove", startIdleTimer);
    document.addEventListener("keydown", startIdleTimer);
    startIdleTimer();

    window.addEventListener("beforeunload", () => {
        localStorage.setItem("lastActivity", Date.now());
    });
}

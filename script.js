console.log("🔥 `script.js` 已載入");

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const firebaseConfig = {
    databaseURL: "https://access-7a3c3-default-rtdb.firebaseio.com/"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ✅ **取得當前登入使用者的 Firebase 參照**
function getUserRef() {
    const username = localStorage.getItem('loggedInUser');
    if (!username) return null;
    return ref(db, `users/${username}`);  // 🔥 根據登入的使用者更新
}

// ✅ 確保用戶已登入
function checkLoginStatus() {
    if (!localStorage.getItem('loggedInUser') || !localStorage.getItem('sessionToken')) {
        console.log("⛔ 未登入，跳轉至登入頁面");
        window.location.href = 'index.html';
    }
}

// 🚀 **登出功能**
async function logout() {
    const userRef = getUserRef();
    if (!userRef) return;

    try {
        console.log(`🚪 正在登出 ${localStorage.getItem('loggedInUser')}...`);
        await update(userRef, { isLoggedIn: false, sessionToken: "" });
        console.log(`✅ ${localStorage.getItem('loggedInUser')} 已成功登出！`);
    } catch (error) {
        console.error("❌ 登出錯誤：", error);
    }

    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('sessionToken');
}

// ✅ 讓 HTML 登出按鈕可以呼叫 logout()
window.logout = async function() {
    await logout();
    window.location.href = 'index.html';
};

// 🚀 **監測分頁關閉，確保登出**
window.addEventListener("beforeunload", function(event) {
    const userRef = getUserRef();
    if (!userRef) return;

    const logoutData = JSON.stringify({ isLoggedIn: false, sessionToken: "" });
    navigator.sendBeacon(`https://access-7a3c3-default-rtdb.firebaseio.com/users/${localStorage.getItem('loggedInUser')}.json`, logoutData);
});

// ✅ 只有 `pdf-select.html` 和 `pdf-viewer.html` 需要這些功能
if (window.location.pathname.includes("pdf-select") || window.location.pathname.includes("pdf-viewer")) {
    checkLoginStatus();

    let idleTimeout;
    let timeLeft = 30 * 60; // 30 分鐘 = 1800 秒
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
        timeLeft = 30 * 60; // 30 分鐘重設
        updateTimer();

        idleTimeout = setInterval(async () => {
            timeLeft--;
            updateTimer();

            if (timeLeft <= 0) {
                console.log("⏰ 閒置時間已到，執行登出...");
                await logout();
                window.location.href = 'index.html';
            }
        }, 1000);
    }

    document.addEventListener("mousemove", startIdleTimer);
    document.addEventListener("keydown", startIdleTimer);
    startIdleTimer();

    // 🚀 更新 `localStorage` 記錄最後的活動時間
    window.addEventListener("beforeunload", () => {
        localStorage.setItem("lastActivity", Date.now());
    });
}

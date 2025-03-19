console.log("🔥 `script.js` 已載入");

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const firebaseConfig = {
    databaseURL: "https://access-7a3c3-default-rtdb.firebaseio.com/"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ✅ 確保用戶已登入
function checkLoginStatus() {
    const username = localStorage.getItem('loggedInUser');
    const sessionToken = localStorage.getItem('sessionToken');

    if (!username || !sessionToken) {
        console.log("⛔ 未登入，跳轉至登入頁面");
        window.location.href = 'index.html';
    }
}

// 🚀 **登出功能**
async function logout() {
    const username = localStorage.getItem('loggedInUser');
    const storedToken = localStorage.getItem('sessionToken');

    if (!username) return;

    try {
        const userRef = ref(db, "users/" + username);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            const user = snapshot.val();

            if (user.sessionToken === storedToken) {
                console.log(`🚪 ${username} 正在登出...`);
                await update(userRef, { isLoggedIn: false, sessionToken: "" });
                console.log(`✅ ${username} 已成功登出！`);
            }
        }
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
window.addEventListener("beforeunload", async function(event) {
    // 確保只有在真正關閉瀏覽器或分頁時才登出
    if (!sessionStorage.getItem('navigated')) {
        await logout();
    }
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

    // ✅ 跳轉到 `pdf-viewer.html` 時避免誤登出
    if (sessionStorage.getItem('navigated')) {
        console.log("跳轉後，不執行登出");
        sessionStorage.removeItem('navigated');
    } else {
        document.addEventListener("mousemove", startIdleTimer);
        document.addEventListener("keydown", startIdleTimer);
        startIdleTimer();
    }

    // 🚀 設定跳轉標誌
    window.sessionStorage.setItem('navigated', true);

    // 🚀 更新 `localStorage` 記錄最後的活動時間
    window.addEventListener("beforeunload", () => {
        localStorage.setItem("lastActivity", Date.now());
    });
}

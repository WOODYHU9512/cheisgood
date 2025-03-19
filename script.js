console.log("🔥 `script.js` 已載入");

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const firebaseConfig = {
    databaseURL: "https://access-7a3c3-default-rtdb.firebaseio.com/"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ✅ **取得當前登入使用者的 Firebase 參照**
async function getUserRef() {
    const username = localStorage.getItem('loggedInUser');
    if (!username) return null;
    return ref(db, `users/${username}`);
}

// ✅ **確保用戶已登入**
function checkLoginStatus() {
    if (!localStorage.getItem('loggedInUser') || !localStorage.getItem('sessionToken')) {
        console.log("⛔ 未登入，跳轉至登入頁面");
        window.location.href = 'index.html';
    }
}

// 🚀 **登出功能（不刪除密碼）**
async function logout() {
    const username = localStorage.getItem('loggedInUser');
    if (!username) return;

    try {
        console.log(`🚪 正在登出 ${username}...`);
        const userRef = await getUserRef();
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            const userData = snapshot.val();
            await update(userRef, { isLoggedIn: false, sessionToken: "", password: userData.password });
        }
        console.log(`✅ ${username} 已成功登出！`);
    } catch (error) {
        console.error("❌ 登出錯誤：", error);
    }

    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('sessionToken');
}

// ✅ **讓 HTML 登出按鈕可以呼叫 logout**
window.logout = async function() {
    await logout();
    window.location.href = 'index.html';
};

// 🚀 **監測分頁/瀏覽器關閉，確保登出**
window.addEventListener("beforeunload", async function(event) {
    const username = localStorage.getItem('loggedInUser');
    if (!username) return;

    if (!sessionStorage.getItem("pageNavigation")) {
        console.log("🚪 瀏覽器/分頁關閉，執行登出");
        const userRef = await getUserRef();
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            const userData = snapshot.val();
            await fetch(`https://access-7a3c3-default-rtdb.firebaseio.com/users/${username}.json`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isLoggedIn: false, sessionToken: "", password: userData.password })
            });
        }
    } else {
        console.log("🔄 偵測到頁面跳轉，不執行登出");
        sessionStorage.removeItem("pageNavigation");
    }
});

// ✅ **標記頁面跳轉，避免誤登出**
document.addEventListener("DOMContentLoaded", function () {
    const links = document.querySelectorAll("a, button");
    links.forEach(link => {
        link.addEventListener("click", function() {
            sessionStorage.setItem("pageNavigation", "true");
        });
    });
});

// ✅ **閒置 30 分鐘自動登出**
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

    // 🚀 **更新 `localStorage` 記錄最後的活動時間**
    window.addEventListener("beforeunload", () => {
        localStorage.setItem("lastActivity", Date.now());
    });
}

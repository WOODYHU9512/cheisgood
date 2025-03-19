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
                await update(userRef, { isLoggedIn: false, sessionToken: "" });
                console.log(`🚪 ${username} 已登出！`);
            }
        }
    } catch (error) {
        console.error("❌ 登出錯誤：", error);
    }

    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('sessionToken');
    window.location.href = 'index.html';
}

window.logout = logout;

if (window.location.pathname.includes("pdf-select") || window.location.pathname.includes("pdf-viewer")) {
    checkLoginStatus();

    let idleTimeout;
    let timeLeft = 10;
    const timerDisplay = document.getElementById("timer");

    function updateTimer() {
        if (timerDisplay) {
            timerDisplay.innerText = timeLeft;
        }
    }

    function startIdleTimer() {
        clearTimeout(idleTimeout);
        timeLeft = 10;
        updateTimer();

        idleTimeout = setInterval(() => {
            timeLeft--;
            updateTimer();

            if (timeLeft <= 0) {
                logout();
            }
        }, 1000);
    }

    document.addEventListener("mousemove", startIdleTimer);
    document.addEventListener("keydown", startIdleTimer);
    startIdleTimer();
}

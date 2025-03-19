console.log("🔥 自動登出機制啟動");

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// 🚀 Firebase 設定
const firebaseConfig = {
    databaseURL: "https://access-7a3c3-default-rtdb.firebaseio.com/"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ⏳ 閒置登出計時器
let idleTimeout;
const IDLE_TIME_LIMIT = 10 * 60 * 1000;  // 10 分鐘

function startIdleTimer() {
    console.log("⏳ 閒置計時器啟動...");
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => {
        console.log("⏰ 閒置超過 10 分鐘，自動登出！");
        alert("您已閒置 10 分鐘，將自動登出！");
        logout();
    }, IDLE_TIME_LIMIT);
}

// 🔥 監聽使用者活動
document.addEventListener("mousemove", startIdleTimer);
document.addEventListener("keydown", startIdleTimer);
document.addEventListener("touchstart", startIdleTimer);

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

            // 只有當前 sessionToken 相符時，才允許登出
            if (user.sessionToken === storedToken) {
                await update(userRef, {
                    isLoggedIn: false,
                    sessionToken: ""
                });
                console.log(`🚪 ${username} 已登出！`);
            }
        }
    } catch (error) {
        console.error("❌ 登出時發生錯誤：", error);
    }

    // 清除本機儲存
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('sessionToken');
    window.location.href = 'index.html'; // 回到登入頁
}

// ✅ 啟動計時器
startIdleTimer();
window.addEventListener("beforeunload", logout);

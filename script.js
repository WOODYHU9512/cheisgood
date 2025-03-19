console.log("🔥 `script.js` 已載入");

// 🚀 初始化 Firebase
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

// ✅ 讓 HTML 登出按鈕可以呼叫 logout()
window.logout = logout;

// ✅ 只有 `pdf-select.html` & `pdf-viewer.html` 需要這些功能
if (window.location.pathname.includes("pdf-select") || window.location.pathname.includes("pdf-viewer")) {
    checkLoginStatus();

    // 🕒 閒置計時器 (10 秒)
    let idleTimeout;
    const IDLE_TIME_LIMIT = 10 * 1000;  // 10 秒測試

    function startIdleTimer() {
        console.log("⏳ 閒置計時器重設...");
        clearTimeout(idleTimeout);

        // ✅ 記錄時間到 localStorage，讓所有頁面同步計時
        localStorage.setItem("lastActivity", Date.now());

        idleTimeout = setTimeout(() => {
            console.log("⏰ 閒置超過 10 秒，自動登出！");
            alert("您已閒置 10 秒，將自動登出！");
            logout();
        }, IDLE_TIME_LIMIT);
    }

    // 🔥 監聽使用者活動來重設計時器
    document.addEventListener("mousemove", startIdleTimer);
    document.addEventListener("keydown", startIdleTimer);
    document.addEventListener("touchstart", startIdleTimer);

    // ✅ 監聽 localStorage 變化，確保其他頁面有活動時也會重設計時器
    window.addEventListener("storage", (event) => {
        if (event.key === "lastActivity") {
            console.log("🔄 偵測到其他頁面有活動，重設計時器！");
            startIdleTimer();
        }
    });

    // ✅ 啟動計時器
    startIdleTimer();
}

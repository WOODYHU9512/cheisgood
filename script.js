console.log("🔥 script.js loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// ✅ Firebase 初始化
const firebaseConfig = {
  databaseURL: "https://access-7a3c3-default-rtdb.firebaseio.com/"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ✅ 登出功能（用於按鈕與自動登出）
async function logoutUser(showLog = true) {
  const username = localStorage.getItem("loggedInUser");
  const sessionToken = localStorage.getItem("sessionToken");
  if (!username || !sessionToken) return;

  try {
    const userRef = ref(db, `users/${username}`);
    const snapshot = await get(userRef);
    if (snapshot.exists() && snapshot.val().sessionToken === sessionToken) {
      await update(userRef, {
        isLoggedIn: false,
        sessionToken: ""
      });
      if (showLog) console.log(`✅ ${username} 已從 Firebase 登出`);
    }
  } catch (err) {
    console.error("❌ 自動登出失敗：", err);
  }

  localStorage.removeItem("loggedInUser");
  localStorage.removeItem("sessionToken");
  localStorage.removeItem("currentPDF");
  localStorage.removeItem("currentPDFName");
}

// ✅ 登出按鈕會觸發這裡
window.logout = async function () {
  await logoutUser();
  window.location.href = "index.html";
};

// ✅ 驗證登入狀態
async function validateSession() {
  const username = localStorage.getItem("loggedInUser");
  const sessionToken = localStorage.getItem("sessionToken");
  if (!username || !sessionToken) return false;

  try {
    const userRef = ref(db, `users/${username}`);
    const snapshot = await get(userRef);
    return snapshot.exists() && snapshot.val().sessionToken === sessionToken;
  } catch (err) {
    console.error("❌ 驗證登入失敗：", err);
    return false;
  }
}

// ✅ 關閉頁面自動登出（非跳轉）
function autoLogoutIfNotNavigating() {
  // ⏳ 等待 100ms 確保新頁面能標記 pageNavigation
  setTimeout(() => {
    const isNavigating = sessionStorage.getItem("pageNavigation");
    sessionStorage.removeItem("pageNavigation");
    if (isNavigating) return;

    const username = localStorage.getItem("loggedInUser");
    if (!username) return;

    fetch(`https://access-7a3c3-default-rtdb.firebaseio.com/users/${username}.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isLoggedIn: false,
        sessionToken: ""
      }),
      keepalive: true
    });

    console.log("📤 fetch + keepalive 自動登出已發送");
  }, 100); // ⏰ 延遲 100ms 再判斷跳轉標記
}

// ✅ 註冊自動登出事件
window.addEventListener("pagehide", autoLogoutIfNotNavigating);
window.addEventListener("beforeunload", autoLogoutIfNotNavigating);

// ✅ 點擊按鈕與連結時標記跳轉
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("a, button").forEach(el => {
    el.addEventListener("click", () => {
      sessionStorage.setItem("pageNavigation", "true");
    });
  });

  // ✅ 初次載入也視為跳轉（避免載入時立即判定關閉）
  sessionStorage.setItem("pageNavigation", "true");
});

// ✅ 返回上一頁也補標記
window.addEventListener("pageshow", (e) => {
  if (e.persisted || performance.getEntriesByType("navigation")[0]?.type === "back_forward") {
    sessionStorage.setItem("pageNavigation", "true");
  }
});

// ✅ 自動登出倒數邏輯（限 select 與 viewer）
if (window.location.pathname.includes("pdf-select") || window.location.pathname.includes("pdf-viewer")) {
  validateSession().then(valid => {
    if (!valid) {
      console.warn("⛔ 無效 session，跳轉登入頁面");
      window.location.href = "index.html";
    }
  });

  let timeLeft = 1800; // 30 分鐘
  let idleTimer;
  const timerDisplay = document.getElementById("timer");

  function updateTimer() {
    if (!timerDisplay) return;
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    timerDisplay.innerText = `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  function resetTimer() {
    timeLeft = 1800;
    updateTimer();
  }

  function startCountdown() {
    clearInterval(idleTimer);
    idleTimer = setInterval(async () => {
      timeLeft--;
      updateTimer();
      if (timeLeft <= 0) {
        clearInterval(idleTimer);
        alert("⏰ 閒置超過 30 分鐘，自動登出！");
        await logoutUser();
        window.location.href = "index.html";
      }
    }, 1000);
  }

  document.addEventListener("mousemove", resetTimer);
  document.addEventListener("keydown", resetTimer);
  document.addEventListener("touchstart", resetTimer);

  resetTimer();
  startCountdown();
}

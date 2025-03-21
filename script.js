console.log("🔥 script.js loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const firebaseConfig = {
  databaseURL: "https://access-7a3c3-default-rtdb.firebaseio.com/"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ✅ 登出核心功能
async function logoutUser(showLog = true) {
  const username = localStorage.getItem("loggedInUser");
  const sessionToken = localStorage.getItem("sessionToken");
  if (!username || !sessionToken) return;

  try {
    const userRef = ref(db, `users/${username}`);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      const user = snapshot.val();
      if (user.sessionToken === sessionToken) {
        await update(userRef, {
          isLoggedIn: false,
          sessionToken: ""
        });
        if (showLog) console.log(`✅ ${username} 已從 Firebase 登出`);
      }
    }
  } catch (err) {
    console.error("❌ 自動登出失敗：", err);
  }

  localStorage.removeItem("loggedInUser");
  localStorage.removeItem("sessionToken");
  localStorage.removeItem("currentPDF");
  localStorage.removeItem("currentPDFName");
}

// ✅ 給登出按鈕用
window.logout = async function () {
  await logoutUser();
  window.location.href = "index.html";
};

// ✅ 驗證 session 合法性
async function validateSession() {
  const username = localStorage.getItem("loggedInUser");
  const sessionToken = localStorage.getItem("sessionToken");
  if (!username || !sessionToken) return false;

  try {
    const userRef = ref(db, `users/${username}`);
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      const user = snapshot.val();
      return user.sessionToken === sessionToken;
    }
  } catch (err) {
    console.error("❌ 驗證登入失敗：", err);
  }

  return false;
}

// ✅ 關閉分頁／瀏覽器／網路斷線 → sendBeacon 登出
window.addEventListener("pagehide", function () {
  const isNavigating = sessionStorage.getItem("pageNavigation");
  sessionStorage.removeItem("pageNavigation");

  if (isNavigating) return; // 是跳轉，不登出

  const username = localStorage.getItem("loggedInUser");
  const sessionToken = localStorage.getItem("sessionToken");
  if (!username || !sessionToken) return;

  const data = JSON.stringify({
    isLoggedIn: false,
    sessionToken: ""
  });

  const url = `https://access-7a3c3-default-rtdb.firebaseio.com/users/${username}.json`;
  navigator.sendBeacon(url, data);
  console.log("📤 sendBeacon 已發送自動登出");
});

// ✅ 點擊跳轉紀錄 navigation
document.addEventListener("DOMContentLoaded", () => {
  const interactiveElements = document.querySelectorAll("a, button");
  interactiveElements.forEach(el => {
    el.addEventListener("click", () => {
      sessionStorage.setItem("pageNavigation", "true");
    });
  });
});

// ✅ 自動登出倒數（限 select / viewer）
if (window.location.pathname.includes("pdf-select") || window.location.pathname.includes("pdf-viewer")) {
  validateSession().then(valid => {
    if (!valid) {
      console.warn("⛔ 無效 session，跳轉登入頁");
      window.location.href = "index.html";
    }
  });

  let timeLeft = 30 * 60;
  let idleTimer;
  const timerDisplay = document.getElementById("timer");

  function updateTimer() {
    if (!timerDisplay) return;
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    timerDisplay.innerText = `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  function resetTimer() {
    timeLeft = 30 * 60;
    updateTimer();
  }

  function startIdleCountdown() {
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
  startIdleCountdown();
} else {
  // 非 viewer/select 頁面 → 不綁定 sessionStorage（避免污染）
  sessionStorage.removeItem("pageNavigation");
}

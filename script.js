console.log("🔥 script.js loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// ✅ 初始化 Firebase
const firebaseConfig = {
  databaseURL: "https://access-7a3c3-default-rtdb.firebaseio.com/"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ✅ 登出功能（用於按鈕或自動登出）
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
    console.error("❌ 登出失敗：", err);
  }

  localStorage.removeItem("loggedInUser");
  localStorage.removeItem("sessionToken");
  localStorage.removeItem("currentPDF");
  localStorage.removeItem("currentPDFName");
}

// ✅ 登出按鈕可用
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
    if (snapshot.exists()) {
      const user = snapshot.val();
      return user.sessionToken === sessionToken;
    }
  } catch (err) {
    console.error("❌ 驗證登入失敗：", err);
  }

  return false;
}

// ✅ 自動登出（pagehide）
window.addEventListener("pagehide", (event) => {
  const username = localStorage.getItem("loggedInUser");
  const token = localStorage.getItem("sessionToken");
  const isNavigating = sessionStorage.getItem("pageNavigation");
  sessionStorage.removeItem("pageNavigation");

  if (!username || !token || isNavigating) return;

  const logoutPayload = {
    isLoggedIn: false,
    sessionToken: ""
  };

  fetch(`https://access-7a3c3-default-rtdb.firebaseio.com/users/${username}.json`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(logoutPayload),
    keepalive: true
  }).then(() => {
    console.log("📤 自動登出已發送 (fetch+keepalive)");
  }).catch(err => {
    console.warn("❌ 自動登出失敗：", err);
  });
});

// ✅ 點擊跳轉時設標記，避免誤登出
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("a, button").forEach(el => {
    el.addEventListener("click", () => {
      sessionStorage.setItem("pageNavigation", "true");
    });
  });
});

// ✅ 自動登出倒數功能（pdf-select / pdf-viewer）
if (window.location.pathname.includes("pdf-select") || window.location.pathname.includes("pdf-viewer")) {
  validateSession().then(valid => {
    if (!valid) {
      console.warn("⛔ Session 無效，跳轉登入頁");
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
        alert("⏰ 閒置時間過久，自動登出！");
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
}

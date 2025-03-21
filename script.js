// ✅ script.js
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

// ✅ 手動點擊登出按鈕
window.logout = async function () {
  await logoutUser();
  window.location.href = "index.html";
};

// ✅ session 驗證（供 select / viewer 檢查）
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

// ✅ 自動登出 on pagehide（支援 GitHub Pages）
window.addEventListener("pagehide", (e) => {
  const isNavigating = sessionStorage.getItem("pageNavigation");
  sessionStorage.removeItem("pageNavigation");
  if (isNavigating) return;

  const username = localStorage.getItem("loggedInUser");
  const token = localStorage.getItem("sessionToken");
  if (!username || !token) return;

  const payload = { isLoggedIn: false, sessionToken: "" };

  fetch(`https://access-7a3c3-default-rtdb.firebaseio.com/users/${username}.json`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  })
    .then(() => console.log("📤 自動登出成功 (fetch+keepalive)"))
    .catch((err) => console.error("❌ 自動登出失敗：", err));
});

// ✅ 點擊任何頁面內部連結時標記跳轉
window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("a, button").forEach(el => {
    el.addEventListener("click", () => {
      sessionStorage.setItem("pageNavigation", "true");
    });
  });
});

// ✅ 自動登出倒數（限 select / viewer 頁面）
if (window.location.pathname.includes("pdf-select") || window.location.pathname.includes("pdf-viewer")) {
  validateSession().then(valid => {
    if (!valid) {
      console.warn("⛔ 無效 session，跳轉登入頁面");
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
}

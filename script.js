// ✅ script.js - 最終修正版：避開跳轉誤判並確保關閉分頁會登出
console.log("🔥 script.js loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const firebaseConfig = {
  databaseURL: "https://access-7a3c3-default-rtdb.firebaseio.com/"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ✅ 登出功能
async function logoutUser(showLog = true) {
  const username = localStorage.getItem("loggedInUser");
  const sessionToken = localStorage.getItem("sessionToken");
  if (!username || !sessionToken) return;

  try {
    const userRef = ref(db, `users/${username}`);
    const snapshot = await get(userRef);
    if (snapshot.exists() && snapshot.val().sessionToken === sessionToken) {
      await update(userRef, { isLoggedIn: false, sessionToken: "" });
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

window.logout = async function () {
  await logoutUser();
  window.location.href = "index.html";
};

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

// ✅ 自動登出邏輯（考慮跳轉延遲 + 手機瀏覽器）
function triggerAutoLogout() {
  setTimeout(() => {
    const isNavigating = sessionStorage.getItem("pageNavigation");
    sessionStorage.removeItem("pageNavigation");
    if (isNavigating) {
      console.log("➡️ 偵測到跳轉，不自動登出");
      return;
    }

    const username = localStorage.getItem("loggedInUser");
    if (!username) return;

    fetch(`https://access-7a3c3-default-rtdb.firebaseio.com/users/${username}.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isLoggedIn: false, sessionToken: "" }),
      keepalive: true
    });

    console.log("📤 非跳轉，自動登出發送完畢");
  }, 150);
}

// ✅ 自動登出觸發點
window.addEventListener("pagehide", triggerAutoLogout);
window.addEventListener("beforeunload", triggerAutoLogout);

let hiddenTimer;
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    hiddenTimer = setTimeout(triggerAutoLogout, 500);
  } else {
    clearTimeout(hiddenTimer);
  }
});

// ✅ 標記跳轉的操作（只在互動時）
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("a, button").forEach(el => {
    el.addEventListener("click", () => sessionStorage.setItem("pageNavigation", "true"));
  });
});

window.addEventListener("pageshow", (e) => {
  if (e.persisted || performance.getEntriesByType("navigation")[0]?.type === "back_forward") {
    sessionStorage.setItem("pageNavigation", "true");
  }
});

// ✅ 自動登出倒數邏輯（pdf-select / pdf-viewer）
if (window.location.pathname.includes("pdf-select") || window.location.pathname.includes("pdf-viewer")) {
  validateSession().then(valid => {
    if (!valid) {
      console.warn("⛔ 無效 session，跳轉登入頁面");
      window.location.href = "index.html";
    }
  });

  let timeLeft = 1800;
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

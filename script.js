console.log("🔥 script.js loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const firebaseConfig = {
  databaseURL: "https://access-7a3c3-default-rtdb.firebaseio.com/"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

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

// ✅ 標記跳轉
function markNavigation() {
  sessionStorage.setItem("pageNavigation", "true");
}

// ✅ 自動登出邏輯（加入延遲判斷）
function triggerAutoLogout() {
  const shouldIgnore = sessionStorage.getItem("pageNavigation");
  sessionStorage.removeItem("pageNavigation");

  const navType = performance.getEntriesByType("navigation")[0]?.type;
  const isReload = navType === "reload";
  const isNavigate = navType === "navigate";

  if (shouldIgnore || isReload || isNavigate) {
    console.log("⏩ 跳轉或重新整理，略過登出");
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

  console.log("📤 自動登出已發送（非跳轉）");
}

// ✅ 可見性監聽
let hiddenTimer;
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    hiddenTimer = setTimeout(triggerAutoLogout, 300);
  } else {
    clearTimeout(hiddenTimer);
  }
});

window.addEventListener("beforeunload", () => {
  setTimeout(triggerAutoLogout, 100); // 保留一點時間讓跳轉有機會標記
});
window.addEventListener("pagehide", () => {
  setTimeout(triggerAutoLogout, 100);
});

// ✅ DOM 載入標記跳轉
document.addEventListener("DOMContentLoaded", () => {
  markNavigation();
  document.querySelectorAll("a, button").forEach(el => {
    el.addEventListener("click", markNavigation);
  });
});

// ✅ pageshow（Safari Back/Forward）
window.addEventListener("pageshow", (e) => {
  const navType = performance.getEntriesByType("navigation")[0]?.type;
  if (e.persisted || navType === "back_forward") {
    markNavigation();
  }
});

// ✅ 自動登出倒數邏輯
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

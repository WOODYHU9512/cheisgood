console.log("🔥 script.js loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  update,
  onDisconnect
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

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
    console.error("❌ 登出失敗：", err);
  }

  localStorage.clear();
}

window.logout = async function () {
  await logoutUser();
  window.location.href = "index.html";
};

// ✅ onDisconnect 註冊
async function setupOnDisconnect(username) {
  try {
    const userRef = ref(db, `users/${username}`);
    await onDisconnect(userRef).update({
      isLoggedIn: false,
      sessionToken: ""
    });
    console.log("📡 onDisconnect 設定完成");
  } catch (err) {
    console.error("❌ onDisconnect 設定失敗：", err);
  }
}

// ✅ session 驗證
async function validateSession() {
  const username = localStorage.getItem("loggedInUser");
  const sessionToken = localStorage.getItem("sessionToken");
  if (!username || !sessionToken) return false;

  try {
    const userRef = ref(db, `users/${username}`);
    const snapshot = await get(userRef);
    const isValid = snapshot.exists() && snapshot.val().sessionToken === sessionToken;
    if (isValid) await setupOnDisconnect(username);
    return isValid;
  } catch (err) {
    console.error("❌ 驗證失敗：", err);
    return false;
  }
}

// ✅ 自動登出條件判斷
function triggerAutoLogout() {
  const navFlag = sessionStorage.getItem("pageNavigation");
  sessionStorage.removeItem("pageNavigation");

  if (navFlag) {
    console.log("🛑 偵測跳轉或重新整理，不登出");
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

  console.log("📤 自動登出已送出（視為關閉頁面）");
}

// ✅ 延遲註冊登出事件（避免 script 載入太早）
setTimeout(() => {
  window.addEventListener("beforeunload", triggerAutoLogout);
  window.addEventListener("pagehide", triggerAutoLogout);
}, 50);

// ✅ hidden 狀態下補救（針對部分手機）
let hiddenTimer;
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    hiddenTimer = setTimeout(triggerAutoLogout, 500);
  } else {
    clearTimeout(hiddenTimer);
  }
});

// ✅ 標記跳轉行為
function markNavigation() {
  sessionStorage.setItem("pageNavigation", "true");
}

window.addEventListener("pageshow", e => {
  if (
    e.persisted ||
    performance.getEntriesByType("navigation")[0]?.type === "back_forward"
  ) {
    markNavigation();
  }
});

// ✅ 重新整理、初始載入都先標記
document.addEventListener("DOMContentLoaded", () => {
  markNavigation();
  document.querySelectorAll("a, button").forEach(el => {
    el.addEventListener("click", markNavigation);
  });
});

// ✅ 自動登出倒數邏輯
if (
  window.location.pathname.includes("pdf-select") ||
  window.location.pathname.includes("pdf-viewer")
) {
  validateSession().then(valid => {
    if (!valid) {
      console.warn("⛔ 無效 session，返回登入頁");
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

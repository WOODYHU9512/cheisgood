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

// ✅ 登出按鈕綁定
window.logout = async function () {
  await logoutUser();
  window.location.href = "index.html";
};

// ✅ onDisconnect 設定
async function setupOnDisconnect(username) {
  const userRef = ref(db, `users/${username}`);
  try {
    await onDisconnect(userRef).update({
      isLoggedIn: false,
      sessionToken: ""
    });
    console.log("📡 onDisconnect 已設定");
  } catch (err) {
    console.error("❌ onDisconnect 設定失敗：", err);
  }
}

// ✅ 驗證登入狀態
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

// ✅ 判斷是否需要自動登出
function triggerAutoLogout() {
  const isNavigating = sessionStorage.getItem("pageNavigation");
  sessionStorage.removeItem("pageNavigation");

  if (isNavigating) {
    console.log("🛑 跳轉或重新整理，略過登出");
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

  console.log("📤 自動登出已發送（未標記跳轉）");
}

// ✅ 避免太早綁定 unload（確保跳轉標記先建立）
setTimeout(() => {
  window.addEventListener("beforeunload", triggerAutoLogout);
  window.addEventListener("pagehide", triggerAutoLogout);
}, 100);

// ✅ hidden 狀態（切 App、切分頁）補一份登出判斷
let hiddenTimer;
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    hiddenTimer = setTimeout(triggerAutoLogout, 500);
  } else {
    clearTimeout(hiddenTimer);
  }
});

// ✅ 標記跳轉（供後續登出判斷使用）
function markNavigation() {
  sessionStorage.setItem("pageNavigation", "true");
}

// ✅ 初始時與所有點擊事件都設跳轉標記
document.addEventListener("DOMContentLoaded", () => {
  markNavigation(); // 初始進來就設
  document.querySelectorAll("a, button").forEach(el =>
    el.addEventListener("click", markNavigation)
  );
});

// ✅ 返回歷史頁面補上標記
window.addEventListener("pageshow", e => {
  if (
    e.persisted ||
    performance.getEntriesByType("navigation")[0]?.type === "back_forward"
  ) {
    markNavigation();
  }
});

// ✅ 自動登出倒數（pdf-select / pdf-viewer 頁面）
if (
  window.location.pathname.includes("pdf-select") ||
  window.location.pathname.includes("pdf-viewer")
) {
  validateSession().then(valid => {
    if (!valid) {
      console.warn("⛔ 無效 session，自動跳轉登入頁");
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
#新版

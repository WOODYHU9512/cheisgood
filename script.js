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

// ✅ 登出 function
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

// ✅ 登出觸發（非跳轉才送）
function triggerAutoLogout() {
  const isNavigating = sessionStorage.getItem("pageNavigation");
  sessionStorage.removeItem("pageNavigation");

  if (isNavigating) {
    console.log("🛑 偵測到跳轉／刷新，略過登出");
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

// ✅ 延遲觸發（避免 pageNavigation 尚未設置）
function delayedAutoLogout() {
  setTimeout(triggerAutoLogout, 200); // 200ms 讓標記完成
}

// ✅ onDisconnect（手機關閉 App 用）
async function setupOnDisconnect(username) {
  const userRef = ref(db, `users/${username}`);
  try {
    await onDisconnect(userRef).update({
      isLoggedIn: false,
      sessionToken: ""
    });
    console.log("📡 onDisconnect 已設定");
  } catch (err) {
    console.error("❌ 設定 onDisconnect 失敗：", err);
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
    const valid = snapshot.exists() && snapshot.val().sessionToken === sessionToken;
    if (valid) await setupOnDisconnect(username);
    return valid;
  } catch (err) {
    console.error("❌ 驗證登入失敗：", err);
    return false;
  }
}

// ✅ 跳轉標記
function markNavigation() {
  sessionStorage.setItem("pageNavigation", "true");
}

// ✅ 初始設置：掛載 click、手動跳轉標記
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("a, button").forEach(el => {
    el.addEventListener("click", markNavigation);
  });
  markNavigation(); // 初始也標記一次
});

// ✅ 回上一頁補標記
window.addEventListener("pageshow", (e) => {
  if (
    e.persisted ||
    performance.getEntriesByType("navigation")[0]?.type === "back_forward"
  ) {
    markNavigation();
  }
});

// ✅ 延遲註冊關閉事件（等待 pageNavigation 建立）
setTimeout(() => {
  window.addEventListener("beforeunload", delayedAutoLogout);
  window.addEventListener("pagehide", delayedAutoLogout);
}, 100);

// ✅ visibility 隱藏也可能是關閉／切換 App
let visibilityTimer;
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    visibilityTimer = setTimeout(triggerAutoLogout, 500);
  } else {
    clearTimeout(visibilityTimer);
  }
});

// ✅ 自動登出倒數（select / viewer）
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

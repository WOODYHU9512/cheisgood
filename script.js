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

// ✅ 登出函式
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

// ✅ onDisconnect：防止強制關閉未登出
async function setupOnDisconnect(username) {
  const userRef = ref(db, `users/${username}`);
  try {
    await onDisconnect(userRef).update({
      isLoggedIn: false,
      sessionToken: ""
    });
    console.log("📡 onDisconnect 設定完成");
  } catch (err) {
    console.error("❌ 設定 onDisconnect 失敗：", err);
  }
}

// ✅ 驗證 session
async function validateSession() {
  const username = localStorage.getItem("loggedInUser");
  const sessionToken = localStorage.getItem("sessionToken");
  if (!username || !sessionToken) return false;

  try {
    const userRef = ref(db, `users/${username}`);
    const snapshot = await get(userRef);
    const valid = snapshot.exists() && snapshot.val().sessionToken === sessionToken;
    if (valid) {
      await setupOnDisconnect(username);
    }
    return valid;
  } catch (err) {
    console.error("❌ 驗證登入失敗：", err);
    return false;
  }
}

// ✅ 自動登出主邏輯
function triggerAutoLogout() {
  const isNavigating = sessionStorage.getItem("pageNavigation");
  const navType = performance.getEntriesByType("navigation")[0]?.type;

  sessionStorage.removeItem("pageNavigation");

  if (isNavigating || navType === "navigate" || navType === "reload") {
    console.log("🛑 偵測到跳轉或重新整理，略過登出");
    return;
  }

  const username = localStorage.getItem("loggedInUser");
  if (!username) return;

  navigator.sendBeacon(
    `https://access-7a3c3-default-rtdb.firebaseio.com/users/${username}.json`,
    JSON.stringify({ isLoggedIn: false, sessionToken: "" })
  );

  console.log("📤 自動登出封包已送出（非跳轉）");
}

// ✅ 頁面關閉或隱藏時觸發（防止 race condition）
let hiddenTimer = null;

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    hiddenTimer = setTimeout(() => {
      triggerAutoLogout();
    }, 300); // 稍作延遲確保 pageNavigation 先設好
  } else {
    clearTimeout(hiddenTimer);
  }
});

window.addEventListener("pagehide", () => {
  triggerAutoLogout();
});
window.addEventListener("beforeunload", () => {
  triggerAutoLogout();
});

// ✅ 所有跳轉前的標記
function markNavigation() {
  sessionStorage.setItem("pageNavigation", "true");
}

// ✅ 初始載入與點擊都設置標記
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("a, button").forEach(el => {
    el.addEventListener("click", markNavigation);
  });

  setTimeout(() => {
    sessionStorage.setItem("pageNavigation", "true");
  }, 0);
});

// ✅ 返回頁面時也補標記
window.addEventListener("pageshow", e => {
  if (e.persisted || performance.getEntriesByType("navigation")[0]?.type === "back_forward") {
    markNavigation();
  }
});

// ✅ 自動倒數登出（select、viewer 頁面限定）
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

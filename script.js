console.log("🔥 script.js loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  update
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const firebaseConfig = {
  databaseURL: "https://access-7a3c3-default-rtdb.firebaseio.com/"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let heartbeatTimer = null;
const HEARTBEAT_INTERVAL = 8 * 60 * 1000;
const AUTO_LOGOUT_TIME = 30 * 60 * 1000;
const CHECK_INTERVAL = 60 * 1000;
const OFFLINE_CHECK_INTERVAL = 10 * 1000;

let lastActivityTime = Date.now();
let lastFocusTime = Date.now();
let isPageActive = true;
let isHBRunning = false;
let isOffline = false;
let isManualLogout = false;
let isAutoLogout = false;

function resetActivityTimer() {
  lastActivityTime = Date.now();
}
["mousemove", "keydown", "touchstart", "touchmove"].forEach(event => {
  document.addEventListener(event, resetActivityTimer);
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    console.log("👀 回到前景");
    lastFocusTime = Date.now();
    isPageActive = true;
  } else {
    console.log("📄 進入背景");
    isPageActive = false;
  }
});

async function clearSession(username, fullLogout = true) {
  if (username) {
    await update(ref(db, `users/${username}`), {
      sessionToken: fullLogout ? "" : null, // 設為 "" 代表正常登出，null 代表強制登出
      isLoggedIn: fullLogout ? false : true
    });
    console.log(`✅ Firebase sessionToken & isLoggedIn 已更新 (${username})`);
  }
  localStorage.removeItem("sessionToken");
  sessionStorage.clear();
}

async function logoutUser(showLog = true) {
  if (isManualLogout || isAutoLogout) return;

  const username = localStorage.getItem("loggedInUser");
  const sessionToken = localStorage.getItem("sessionToken");
  if (!username || !sessionToken) return;

  try {
    await clearSession(username);
    if (showLog) console.log(`✅ ${username} 已從 Firebase 登出`);
  } catch (err) {
    console.error("❌ 登出失敗：", err);
  }
}

async function forceLogout(message = "⚠️ 您已被強制登出") {
  if (isManualLogout || isAutoLogout) return;
  await logoutUser(false);
  clearSession(localStorage.getItem("loggedInUser"), false);
  alert(message);
  window.location.href = "index.html";
}

async function autoLogout() {
  if (isAutoLogout) return;
  isAutoLogout = true;
  console.warn("🚪 30 分鐘未操作，自動登出");
  const username = localStorage.getItem("loggedInUser");
  await clearSession(username);
  alert("📴 30 分鐘未操作，請重新登入！");
  window.location.href = "index.html";
}

async function manualLogout() {
  if (isManualLogout) return;
  isManualLogout = true;
  console.log("🚪 手動登出中...");
  const username = localStorage.getItem("loggedInUser");
  if (!username) {
    console.warn("⚠️ 找不到使用者資訊，直接跳轉");
    window.location.href = "index.html";
    return;
  }

  try {
    await clearSession(username);
    console.log("✅ Firebase sessionToken 已清除");
  } catch (err) {
    console.error("❌ 登出時發生錯誤", err);
  }

  alert("👋 您已成功登出");
  window.location.href = "index.html";
}

async function offlineLogout() {
  if (isManualLogout || isAutoLogout) return;
  await logoutUser(false);
  clearSession(localStorage.getItem("loggedInUser"));
  alert("📴 網路中斷，請重新登入！");
  window.location.href = "index.html";
}

async function sendHeartbeat() {
  if (!navigator.onLine || isManualLogout) return;
  const username = localStorage.getItem("loggedInUser");
  const sessionToken = localStorage.getItem("sessionToken");
  if (!username || !sessionToken) return;

  try {
    const res = await fetch("https://us-central1-access-7a3c3.cloudfunctions.net/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, sessionToken })
    });

    if (!res.ok) {
      console.warn("❌ Heartbeat 驗證失敗，登出");
      await forceLogout();
    } else {
      console.log("💓 Heartbeat 傳送成功");
    }
  } catch (err) {
    console.error("❌ 連線錯誤，無法送出 heartbeat：", err);
    await offlineLogout();
  }
}

function startHeartbeatLoop() {
  if (isHBRunning) return;
  isHBRunning = true;
  sendHeartbeat();
  heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
}

function listenSessionTokenChanges() {
  const username = localStorage.getItem("loggedInUser");
  if (!username) return;
  const tokenRef = ref(db, `users/${username}/sessionToken`);
  onValue(tokenRef, (snapshot) => {
    const latestToken = snapshot.val();
    const currentToken = localStorage.getItem("sessionToken");
    if (!isManualLogout && !isAutoLogout && latestToken !== currentToken) {
      console.warn("👥 sessionToken 發生變更，可能被從其他裝置登入");
      forceLogout("⚠️ 此帳號已在其他裝置登入，請重新登入");
    }
  });
}

setInterval(() => {
  if (!navigator.onLine && !isOffline) {
    console.warn("📴 網路中斷，登出");
    isOffline = true;
    offlineLogout();
  } else if (navigator.onLine && isOffline) {
    console.log("📶 網路恢復");
    isOffline = false;
  }
}, OFFLINE_CHECK_INTERVAL);

setInterval(() => {
  const now = Date.now();
  if (now - lastFocusTime >= AUTO_LOGOUT_TIME || now - lastActivityTime >= AUTO_LOGOUT_TIME) {
    autoLogout();
  }
}, CHECK_INTERVAL);

if (window.location.pathname.includes("pdf-select") || window.location.pathname.includes("pdf-viewer")) {
  startHeartbeatLoop();
  listenSessionTokenChanges();
}

document.getElementById("logout-btn").addEventListener("click", manualLogout);
window.logout = manualLogout;

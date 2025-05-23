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
let lastHeartbeat = 0;
const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // ✅ 改為每 5 分鐘
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
let isSessionMismatchHandled = false;
let failedHBCount = 0;
const MAX_HB_FAILURES = 6; // ✅ 最多容忍 6 次錯誤（約 30 分鐘）

// ✅ 記錄滑鼠/鍵盤/觸控活動
function resetActivityTimer() {
  lastActivityTime = Date.now();
}
["mousemove", "keydown", "touchstart", "touchmove"].forEach(event => {
  document.addEventListener(event, resetActivityTimer);
});

// ✅ 背景偵測
// 切換至背景與前景時更新焦點狀態，並於回到前景時補送 heartbeat


// ✅ 清理 session
async function clearSession(username) {
  if (username) {
    await update(ref(db, `users/${username}`), {
      sessionToken: "",
      isLoggedIn: false
    });
    console.log(`✅ Firebase sessionToken & isLoggedIn 已清除 (${username})`);
  }
  localStorage.removeItem("sessionToken");
  sessionStorage.clear();
}

// ✅ 登出功能（適用於手動登出、自動登出）
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

// ✅ 強制登出（不同裝置登入 A -> B）
async function forceLogout(message = "⚠️ 您已被強制登出") {
  if (isManualLogout || isAutoLogout || isOffline || isSessionMismatchHandled) return;
  isSessionMismatchHandled = true;
  alert(message);
  window.location.href = "index.html";
}

// ✅ 30 分鐘自動登出
async function autoLogout() {
  if (isAutoLogout) return;
  isAutoLogout = true;
  console.warn("🚪 30 分鐘未操作，自動登出");
  const username = localStorage.getItem("loggedInUser");
  await clearSession(username);
  alert("📴 30 分鐘未操作，請重新登入！");
  window.location.href = "index.html";
}

// ✅ 手動登出
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

// ✅ 網路中斷登出
async function offlineLogout() {
  if (isManualLogout || isAutoLogout || isOffline) return;
  isOffline = true;
  console.warn("📴 網路斷線，立即跳轉...");
  alert("📴 網路中斷，請重新登入！");
  window.location.href = "index.html";
}

// ✅ 單次 Heartbeat，加入互動期限與容錯判斷
async function sendHeartbeat() {
  const now = Date.now();
  if (now - lastActivityTime > 30 * 60 * 1000) {
    console.log("⏸️ 超過 30 分鐘沒操作，不送 Heartbeat");
    return;
  }

  if (!navigator.onLine || isManualLogout) return;
  lastHeartbeat = now;

  const username = localStorage.getItem("loggedInUser");
  const sessionToken = localStorage.getItem("sessionToken");
  if (!username || !sessionToken) return;

  try {
    const res = await fetch("https://us-central1-access-7a3c3.cloudfunctions.net/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, sessionToken }),
      cache: "no-store"
    });

    if (!res.ok) {
      failedHBCount++;
      console.warn(`❌ Heartbeat 驗證失敗 (${failedHBCount}/${MAX_HB_FAILURES})`);
      if (failedHBCount >= MAX_HB_FAILURES) {
        await forceLogout("⚠️ 多次 Heartbeat 驗證失敗，請重新登入");
      }
    } else {
      failedHBCount = 0;
      console.log("💓 Heartbeat 傳送成功");
    }
  } catch (err) {
    failedHBCount++;
    console.error(`❌ Heartbeat 傳輸錯誤 (${failedHBCount}/${MAX_HB_FAILURES})：`, err);
    if (failedHBCount >= MAX_HB_FAILURES) {
      await offlineLogout();
    }
  }
}

// ✅ 啟動 Heartbeat
function startHeartbeatLoop() {
  if (isHBRunning) return;
  isHBRunning = true;
  sendHeartbeat();
  heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
}

// ✅ 監聽 sessionToken 變更（不同裝置登入）
function listenSessionTokenChanges() {
  const username = localStorage.getItem("loggedInUser");
  if (!username) return;

  const tokenRef = ref(db, `users/${username}/sessionToken`);
  onValue(tokenRef, (snapshot) => {
    const latestToken = snapshot.val();
    const currentToken = localStorage.getItem("sessionToken");

    if (!navigator.onLine) {
      console.warn("📴 偵測到網路離線，不執行 sessionToken 監聽");
      return;
    }

    if (!isManualLogout && !isAutoLogout && latestToken !== currentToken) {
      console.warn("👥 sessionToken 變更，可能被從其他裝置登入");
      forceLogout("⚠️ 此帳號已在其他裝置登入，請重新登入");
    }
  });
}

// ✅ 監聽網路狀態
setInterval(() => {
  if (!navigator.onLine && !isOffline) {
    offlineLogout();
  } else if (navigator.onLine && isOffline) {
    console.log("📶 網路恢復");
    isOffline = false;
  }
}, OFFLINE_CHECK_INTERVAL);

// ✅ 1 分鐘檢查登出
setInterval(() => {
  const now = Date.now();
  if (now - lastFocusTime >= AUTO_LOGOUT_TIME || now - lastActivityTime >= AUTO_LOGOUT_TIME) {
    autoLogout();
  }
}, CHECK_INTERVAL);

// ✅ 啟動條件判斷
if (window.location.pathname.includes("pdf-select") || window.location.pathname.includes("pdf-viewer")) {
  startHeartbeatLoop();
  listenSessionTokenChanges();
}

document.getElementById("logout-btn").addEventListener("click", manualLogout);
window.logout = manualLogout;
// ✅ 202505231640

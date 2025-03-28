console.log("🔥 script.js loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const firebaseConfig = {
  databaseURL: "https://access-7a3c3-default-rtdb.firebaseio.com/"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let heartbeatTimer = null;
let lastHeartbeat = 0;
const HEARTBEAT_INTERVAL = 8 * 60 * 1000; // ✅ 8 分鐘送一次 Heartbeat
const AUTO_LOGOUT_TIME = 30 * 60 * 1000; // ✅ 30 分鐘無操作或未回前景登出
const CHECK_INTERVAL = 60 * 1000; // ✅ 每 1 分鐘檢查一次
const OFFLINE_CHECK_INTERVAL = 10 * 1000; // ✅ 10 秒檢查一次網路

let lastActivityTime = Date.now();
let lastFocusTime = Date.now();
let isPageActive = true; // ✅ 是否在前景

// ✅ 記錄滑鼠/鍵盤/觸控活動
function resetActivityTimer() {
  lastActivityTime = Date.now();
}

// ✅ 監聽滑鼠、鍵盤、觸控事件
["mousemove", "keydown", "touchstart", "touchmove"].forEach(event => {
  document.addEventListener(event, resetActivityTimer);
});

// ✅ 登出功能
async function logoutUser(showLog = true) {
  const username = localStorage.getItem("loggedInUser");
  const sessionToken = localStorage.getItem("sessionToken");
  if (!username || !sessionToken) return;

  try {
    const res = await fetch("https://us-central1-access-7a3c3.cloudfunctions.net/logoutUser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, sessionToken })
    });

    if (res.ok && showLog) {
      console.log(`✅ ${username} 已從 Firebase 登出`);
    }
  } catch (err) {
    console.error("❌ 登出失敗：", err);
  }
}

// ✅ 被踢出後登出並跳轉
async function forceLogout(message = "⚠️ 您已被強制登出") {
  await logoutUser(false);
  alert(message);
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = "index.html";
}

// ✅ 自動登出
async function autoLogout() {
  await logoutUser(false);
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = "index.html";
}

// ✅ 單次 Heartbeat
async function sendHeartbeat() {
  const now = Date.now();
  lastHeartbeat = now;

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
    await forceLogout();
  }
}

// ✅ 啟動 Heartbeat
function startHeartbeatLoop() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  sendHeartbeat();
  heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
}

function stopHeartbeatLoop() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
}

// ✅ 背景切換監聽
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    console.log("👀 回到前景");
    lastFocusTime = Date.now();
    isPageActive = true; // ✅ 記錄頁面回到前景
  } else {
    console.log("📄 背景頁面，仍然保持 Heartbeat 運行");
    isPageActive = false;
  }
});

// ✅ 網路偵測（每 10 秒檢查一次）
setInterval(() => {
  if (!navigator.onLine) {
    console.warn("📴 網路中斷，登出");
    forceLogout();
  }
}, OFFLINE_CHECK_INTERVAL);

// ✅ sessionToken 即時監聽
function listenSessionTokenChanges() {
  const username = localStorage.getItem("loggedInUser");
  if (!username) return;

  const tokenRef = ref(db, `users/${username}/sessionToken`);
  onValue(tokenRef, (snapshot) => {
    const latestToken = snapshot.val();
    const currentToken = localStorage.getItem("sessionToken");

    if (latestToken !== currentToken) {
      console.warn("👥 sessionToken 發生變更，可能被從其他裝置登入");
      forceLogout("⚠️ 此帳號已在其他裝置登入，您已被強制登出\n\n若非本人操作，請立即變更密碼。");
    }
  });
}

// ✅ 1 分鐘檢查一次是否需要登出
setInterval(() => {
  const now = Date.now();

  if (now - lastFocusTime >= AUTO_LOGOUT_TIME) {
    console.warn("🚪 長時間未回來頁面，登出");
    forceLogout("📴 30 分鐘未回來，請重新登入！");
  } else if (now - lastActivityTime >= AUTO_LOGOUT_TIME) {
    console.warn("🚪 長時間未操作，登出");
    forceLogout("📴 30 分鐘未操作，請重新登入！");
  }
}, CHECK_INTERVAL);

// ✅ 確保登出按鈕正常運作
const logoutBtn = document.getElementById("logout-btn");
logoutBtn.addEventListener("click", async () => {
  console.log("🚪 手動登出按鈕被點擊");
  await autoLogout();
});

// ✅ 啟動 Heartbeat + 監聽
if (
  window.location.pathname.includes("pdf-select") ||
  window.location.pathname.includes("pdf-viewer")
) {
  startHeartbeatLoop();
  listenSessionTokenChanges();
}

// ✅ 提供登出按鈕用
window.logout = async function () {
  await autoLogout();
};
// ✅ 20250328

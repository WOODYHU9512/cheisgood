console.log("🔥 script.js loaded");

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getDatabase,
  ref,
  update
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const firebaseConfig = {
  databaseURL: "https://access-7a3c3-default-rtdb.firebaseio.com/"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ✅ 登出功能（透過 Cloud Function 完整處理）
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

  localStorage.clear();
}

// ✅ 被踢出後登出並跳轉
async function forceLogout(message = "⚠️ 帳號已在其他裝置登入，您已被登出") {
  await logoutUser(false);
  alert(message);
  window.location.href = "index.html";
}

// ✅ 定期驗證 sessionToken 與網路狀態
async function startSessionChecker() {
  const username = localStorage.getItem("loggedInUser");
  const sessionToken = localStorage.getItem("sessionToken");
  if (!username || !sessionToken) return;

  setInterval(async () => {
    if (!navigator.onLine) {
      console.warn("📴 網路已中斷，自動登出");
      await forceLogout("📴 網路已中斷，請重新登入！");
      return;
    }

    try {
      const res = await fetch("https://us-central1-access-7a3c3.cloudfunctions.net/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, sessionToken })
      });

      if (!res.ok) {
        console.warn("🔁 session 驗證失敗，觸發登出");
        await forceLogout();
      }
    } catch (err) {
      console.error("❌ 驗證失敗：", err);
    }
  }, 10000); // 每 10 秒檢查一次
}

// ✅ 啟動 session 驗證（viewer / select 專用）
if (
  window.location.pathname.includes("pdf-select") ||
  window.location.pathname.includes("pdf-viewer")
) {
  startSessionChecker();
}

// ✅ 提供登出按鈕用
window.logout = async function () {
  await logoutUser();
  window.location.href = "index.html";
};

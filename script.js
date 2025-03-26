// ✅ script.js with refined heartbeat management (minimal changes, preserves original)

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

let heartbeatTimer = null;
let lastHeartbeat = 0;
const MIN_HEARTBEAT_INTERVAL = 60 * 1000; // 最小間隔 1 分鐘

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
async function forceLogout(message = "⚠️ 帳號已在其他裝置登入，您已被登出") {
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

// ✅ 單次 heartbeat
async function sendHeartbeat() {
  const now = Date.now();
  if (now - lastHeartbeat < MIN_HEARTBEAT_INTERVAL) return;
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

    const result = await res.json();

    if (!res.ok) {
      const code = result?.code;
      if (code === "SESSION_EXPIRED") {
        console.warn("⏳ 閒置過久，自動登出");
        await forceLogout("📴 閒置時間過久，請重新登入");
      } else if (code === "SESSION_CONFLICT") {
        console.warn("👥 被他人登入取代，強制登出");
        await forceLogout("⚠️ 帳號已在其他裝置登入，您已被登出");
      } else {
        console.warn("❌ 驗證失敗，觸發登出");
        await forceLogout("❌ 驗證失敗，請重新登入！");
      }
    } else {
      console.log("💓 Heartbeat 傳送成功");
    }
  } catch (err) {
    console.error("❌ 連線錯誤，無法送出 heartbeat：", err);
    await forceLogout("📴 網路中斷，請重新登入！");
  }
}

// ✅ 啟動與停止 heartbeat
function startHeartbeatLoop() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  sendHeartbeat();
  heartbeatTimer = setInterval(sendHeartbeat, 3 * 60 * 1000);
}

function stopHeartbeatLoop() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
}

// ✅ 背景切換管理
let visibilityTimer = null;
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    console.log("👀 回到前景");
    clearTimeout(visibilityTimer);
    visibilityTimer = setTimeout(() => {
      sendHeartbeat();
      startHeartbeatLoop();
    }, 100);
  } else {
    console.log("💤 背景頁面，暫停 heartbeat");
    stopHeartbeatLoop();
  }
});

// ✅ 網路偵測
setInterval(() => {
  if (!navigator.onLine) {
    console.warn("📴 離線，登出");
    forceLogout("📴 網路已中斷，請重新登入！");
  }
}, 10000);

// ✅ 取得學校清單
async function getPurchasedSchools() {
  const username = localStorage.getItem("loggedInUser");
  const sessionToken = localStorage.getItem("sessionToken");
  if (!username || !sessionToken) return;

  try {
    const res = await fetch("https://us-central1-access-7a3c3.cloudfunctions.net/getPurchasedSubjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, sessionToken })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw data;
    purchased = data.purchased || {};
    populateSchoolOptions();
  } catch (err) {
    console.error("getPurchasedSubjects 錯誤：", err);
    await autoLogout();
  }
}

// ✅ 取得科目清單
async function fetchSubjectsForSchool(school) {
  const username = localStorage.getItem("loggedInUser");
  const sessionToken = localStorage.getItem("sessionToken");
  if (!username || !sessionToken || !school) return;

  try {
    const res = await fetch("https://us-central1-access-7a3c3.cloudfunctions.net/getSubjectsBySchool", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, sessionToken, school })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw data;

    currentSubjects = data.subjects || {};
    subjectSelect.innerHTML = '<option value="">請選擇科目</option>';
    Object.entries(currentSubjects).forEach(([subject, fileId]) => {
      const option = document.createElement("option");
      option.value = fileId;
      option.textContent = subject;
      subjectSelect.appendChild(option);
    });
  } catch (err) {
    console.error("getSubjectsBySchool 錯誤：", err);
    await autoLogout();
  }
}

// ✅ DOM 綁定與邏輯
const schoolSelect = document.getElementById("schoolSelect");
const subjectSelect = document.getElementById("subjectSelect");
const viewBtn = document.getElementById("viewBtn");
const logoutBtn = document.getElementById("logout-btn");

let purchased = {};
let currentSubjects = {};

schoolSelect.addEventListener("change", () => {
  const school = schoolSelect.value;
  if (school) fetchSubjectsForSchool(school);
});

viewBtn.addEventListener("click", () => {
  const subjectId = subjectSelect.value;
  const subjectText = subjectSelect.options[subjectSelect.selectedIndex]?.text;
  if (!subjectId) {
    alert("❌ 請選擇科目！");
    return;
  }
  localStorage.setItem("currentPDF", subjectId);
  localStorage.setItem("currentPDFName", subjectText);
  sessionStorage.setItem("pageNavigation", "true");
  window.location.href = "pdf-viewer.html";
});

logoutBtn.addEventListener("click", async () => {
  await autoLogout();
});

window.logout = async function () {
  await autoLogout();
};

window.addEventListener("DOMContentLoaded", getPurchasedSchools);

// ✅ 初始化 heartbeat
if (
  window.location.pathname.includes("pdf-select") ||
  window.location.pathname.includes("pdf-viewer")
) {
  if (document.visibilityState === "visible") {
    startHeartbeatLoop();
  }
}

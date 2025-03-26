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
 <script type="module">
   import "./script.js";
 
   const schoolSelect = document.getElementById("schoolSelect");
   const subjectSelect = document.getElementById("subjectSelect");
   const viewBtn = document.getElementById("viewBtn");
   const logoutBtn = document.getElementById("logout-btn");
 
   let purchased = {};
   let currentSubjects = {};
 
   // ✅ 自動心跳：每 30 秒觸發，若驗證失敗就強制登出
   setInterval(async () => {
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
         console.warn("⚠️ 心跳驗證失敗，即將登出");
         await autoLogout();
       }
     } catch (err) {
       console.error("⚠️ 心跳失敗，可能是斷線", err);
       await autoLogout();
     }
   } catch (err) {
     console.error("❌ 登出失敗：", err);
   }, 30000); // 每 30 秒驗證一次
 
   // ✅ 自動登出並跳回登入頁
   async function autoLogout() {
     const username = localStorage.getItem("loggedInUser");
     const sessionToken = localStorage.getItem("sessionToken");
     if (username && sessionToken) {
       await fetch("https://us-central1-access-7a3c3.cloudfunctions.net/logoutUser", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ username, sessionToken })
       }).catch(() => {});
     }
     localStorage.clear();
     sessionStorage.clear();
     window.location.href = "index.html";
   }
 
   localStorage.clear();
 }
 
 // ✅ 被踢出後登出並跳轉
 async function forceLogout(message = "⚠️ 帳號已在其他裝置登入，您已被登出") {
   await logoutUser(false);
   alert(message);
   window.location.href = "index.html";
 }
 
 // ✅ 單次 heartbeat 傳送並驗證 sessionToken
 async function sendHeartbeat() {
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
   // ✅ 原本的 getPurchasedSubjects
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
 
       if (!res.ok) throw new Error("驗證失敗");
 
       const data = await res.json();
       purchased = data.purchased || {};
       populateSchoolOptions();
     } catch (err) {
       console.error("getPurchasedSubjects 錯誤：", err);
       await autoLogout();
     }
   } catch (err) {
     console.error("❌ 連線錯誤，無法送出 heartbeat：", err);
     await forceLogout("📴 網路中斷，請重新登入！");
   }
 }
 
 // ✅ 啟動 heartbeat
 function startHeartbeatLoop() {
   if (heartbeatTimer) clearInterval(heartbeatTimer);
   sendHeartbeat(); // 回到畫面時立即送一次
   heartbeatTimer = setInterval(sendHeartbeat, 3 * 60 * 1000); // 每 3 分鐘
 }
 
 // ✅ 停止 heartbeat（切到背景用）
 function stopHeartbeatLoop() {
   if (heartbeatTimer) clearInterval(heartbeatTimer);
   heartbeatTimer = null;
 }
 
 // ✅ 背景切換偵測
 document.addEventListener("visibilitychange", () => {
   if (document.visibilityState === "visible") {
     console.log("👀 回到前景，啟動 heartbeat");
     startHeartbeatLoop();
   } else {
     console.log("💤 背景頁面，暫停 heartbeat");
     stopHeartbeatLoop();
   }
 });
 
 // ✅ 額外加上每 10 秒偵測網路狀態（即時登出）
 setInterval(() => {
   if (!navigator.onLine) {
     console.warn("📴 偵測到離線狀態，登出");
     forceLogout("📴 網路已中斷，請重新登入！");
   function populateSchoolOptions() {
     schoolSelect.innerHTML = '<option value="">請選擇學校</option>';
     Object.keys(purchased).forEach(school => {
       const option = document.createElement("option");
       option.value = school;
       option.textContent = school;
       schoolSelect.appendChild(option);
     });
   }
 }, 10000);
 
 // ✅ 啟動 session 驗證（viewer / select 專用）
 if (
   window.location.pathname.includes("pdf-select") ||
   window.location.pathname.includes("pdf-viewer")
 ) {
   if (document.visibilityState === "visible") {
     startHeartbeatLoop();
 
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
 
       if (!res.ok) throw new Error("未授權或錯誤");
 
       const data = await res.json();
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
 }
 
 // ✅ 提供登出按鈕用
 window.logout = async function () {
   await logoutUser();
   window.location.href = "index.html";
 };
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
 
   window.addEventListener("DOMContentLoaded", getPurchasedSchools);
 </script>

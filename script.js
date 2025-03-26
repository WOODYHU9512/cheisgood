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
  }

  function populateSchoolOptions() {
    schoolSelect.innerHTML = '<option value="">請選擇學校</option>';
    Object.keys(purchased).forEach(school => {
      const option = document.createElement("option");
      option.value = school;
      option.textContent = school;
      schoolSelect.appendChild(option);
    });
  }

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

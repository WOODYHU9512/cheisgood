<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <script type="module" src="script.js"></script>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>選擇學校與科目</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      text-align: center;
      margin: 20px;
    }
    select, button {
      margin: 10px;
      padding: 10px;
      font-size: 16px;
    }
    #countdown {
      position: fixed;
      top: 10px;
      left: 10px;
      font-size: 18px;
      background: rgba(255, 0, 0, 0.8);
      color: white;
      padding: 10px 15px;
      border-radius: 10px;
      font-weight: bold;
    }
    #logout-warning {
      position: fixed;
      bottom: 5px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(255, 0, 0, 0.8);
      color: white;
      padding: 5px 15px;
      font-size: 14px;
      font-weight: bold;
      border-radius: 5px;
      z-index: 1000;
      box-shadow: 0px 2px 5px rgba(0, 0, 0, 0.2);
    }
    #logout-btn {
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 10px 15px;
      background-color: red;
      color: white;
      border: none;
      cursor: pointer;
      font-size: 16px;
    }
  </style>
</head>
<body>
  <h2>請選擇學校與科目</h2>
  <div id="countdown">⏳ 自動登出倒數：<span id="timer">30:00</span></div>

  <label for="schoolSelect">選擇學校：</label>
  <select id="schoolSelect">
    <option value="">請選擇學校</option>
  </select>

  <label for="subjectSelect">選擇科目：</label>
  <select id="subjectSelect">
    <option value="">請先選擇學校</option>
  </select>

  <button id="viewBtn">觀看 PDF</button>

  <div id="logout-warning">⚠️ **請務必透過登出鈕登出！**</div>
  <button id="logout-btn">🚪 登出</button>

  <script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
    import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

    const firebaseConfig = {
      databaseURL: "https://access-7a3c3-default-rtdb.firebaseio.com/"
    };
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);

    const schoolSelect = document.getElementById("schoolSelect");
    const subjectSelect = document.getElementById("subjectSelect");
    const viewBtn = document.getElementById("viewBtn");
    const logoutBtn = document.getElementById("logout-btn");

    const subjects = {
      "台大": {
        "106~114 台大單操輸送": "1-8YNZiVw81RjqLPPWmzbC0ng4PAIa53a",
        "106~114 台大化熱化反": "1V1xIOMRl04VJORV4fdKN9Bot76XRnv7A",
        "106~114 台大工數": "1twqzBEGA7A3YEzYLRf-kDcLqBkOS4ujD"
      },
      "清大": {
        "106~114 清大單操輸送": "1oDoN0B7hpQEvy9MGDrZvkv7v2ow6NRoj",
        "106~114 清大化熱化反": "14LTMKQmev5gKYjy84RceAq6b-AK_9hTE"
      },
      "成大": {
        "106-114 成大單操輸送": "1Z6dWhVPKlpjQVQLOMl73QCNmLYod7CtY",
        "106-114 成大化熱": "1YlWIhNIbxILLLSyU0cH9NL6-6oUeWBpu",
        "106-114 成大化反": "1DFrKbo-9uD-i4e4ipeh3XbX-tgeVEb1Y"
      },
      "中央": {
        "106~114 中央單操輸送": "1sKb01AvjaKl4z-Ch0TyqXKahVhMUA1iE",
        "106~114 中央化熱化反": "1yN5N4_0B64YtvTmdobnOuJs1mXASH5Xd"
      },
      "台科大": {
        "106-114 台科大工數與單操輸送": "1dq3RAcKUkR4LvZTjDIE1fMFRJ3Vc4346",
        "106~114 台科大化熱化反": "1rDYx5rR6an3Xg8FQaWan-zqjhovWsn-H"
      },
      "中興": {
        "106-114 中興工程數學與輸送現象": "1AREZvc7hVtVHGpG7qwoZkRVD96ljlcXt",
        "106-114 中興化熱化反": "1uYHa87G9aoc9VnyVjeXJPgVnVKPI_ujS"
      }
    };

    let authorizedSchools = [];

    async function loadUserPermissions() {
      const username = localStorage.getItem("loggedInUser");
      if (!username) return;
      const snapshot = await get(ref(db, `users/${username}/purchased`));
      if (snapshot.exists()) {
        authorizedSchools = Object.keys(snapshot.val());
        populateSchoolOptions();
      }
    }

    function populateSchoolOptions() {
      schoolSelect.innerHTML = "<option value=''>請選擇學校</option>";
      authorizedSchools.forEach(school => {
        const option = document.createElement("option");
        option.value = school;
        option.textContent = school;
        schoolSelect.appendChild(option);
      });
    }

    schoolSelect.addEventListener("change", () => {
      const school = schoolSelect.value;
      subjectSelect.innerHTML = "<option value=''>請選擇科目</option>";
      if (subjects[school]) {
        Object.entries(subjects[school]).forEach(([subject, fileId]) => {
          const option = document.createElement("option");
          option.value = fileId;
          option.textContent = subject;
          subjectSelect.appendChild(option);
        });
      }
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

      // ✅ 標記跳轉行為
      sessionStorage.setItem("pageNavigation", "true");
      window.location.href = "pdf-viewer.html";
    });

    logoutBtn.addEventListener("click", () => {
      window.logout();
    });

    // ✅ 初次載入時補標記（確保 reload 不被誤判）
    window.addEventListener("DOMContentLoaded", () => {
      setTimeout(() => sessionStorage.setItem("pageNavigation", "true"), 0);
      loadUserPermissions();
    });

    // ✅ 從歷史返回也補標記
    window.addEventListener("pageshow", e => {
      if (e.persisted || performance.getEntriesByType("navigation")[0]?.type === "back_forward") {
        sessionStorage.setItem("pageNavigation", "true");
      }
    });
  </script>
</body>
</html>

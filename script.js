// ✅ pagehide：改用 fetch + keepalive，避免 Firebase 結構異常
window.addEventListener("pagehide", async function () {
  const isNavigating = sessionStorage.getItem("pageNavigation");
  sessionStorage.removeItem("pageNavigation");

  if (isNavigating) return; // 不是真的離開，跳轉不登出

  const username = localStorage.getItem("loggedInUser");
  const sessionToken = localStorage.getItem("sessionToken");
  if (!username || !sessionToken) return;

  const data = {
    isLoggedIn: false,
    sessionToken: ""
  };

  try {
    await fetch(
      `https://access-7a3c3-default-rtdb.firebaseio.com/users/${username}.json`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json"
        },
        keepalive: true
      }
    );
    console.log("📤 自動登出成功（fetch + keepalive）");
  } catch (error) {
    console.error("❌ 自動登出失敗：", error);
  }
});

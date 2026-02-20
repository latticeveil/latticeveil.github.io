(function () {
  const signedOutBox = document.getElementById("launcherLinkSignedOut");
  const usernameRequiredBox = document.getElementById("launcherLinkUsernameRequired");
  const readyBox = document.getElementById("launcherLinkReady");
  const statusEl = document.getElementById("launcherLinkStatus");
  const signInBtn = document.getElementById("launcherLinkSignInBtn");
  const pickUsernameBtn = document.getElementById("launcherLinkPickUsernameBtn");
  const issueCodeBtn = document.getElementById("launcherIssueCodeBtn");
  const codeBlock = document.getElementById("launcherCodeBlock");
  const codeText = document.getElementById("launcherCodeText");
  const copyCodeBtn = document.getElementById("launcherCopyCodeBtn");
  const launchGameBtn = document.getElementById("launcherLaunchGameBtn");
  const launchHint = document.getElementById("launcherLaunchHint");
  const codeTimer = document.getElementById("launcherCodeTimer");
  const usernameText = document.getElementById("launcherLinkUsernameText");

  if (
    !signedOutBox ||
    !usernameRequiredBox ||
    !readyBox ||
    !statusEl ||
    !signInBtn ||
    !pickUsernameBtn ||
    !issueCodeBtn ||
    !codeBlock ||
    !codeText ||
    !copyCodeBtn ||
    !launchGameBtn ||
    !launchHint ||
    !codeTimer ||
    !usernameText
  ) {
    return;
  }

  const FUNCTIONS_BASE = `${String(VEILNET_CONFIG?.SUPABASE_URL || "").replace(/\/+$/, "")}/functions/v1`;
  const ISSUE_URL = `${FUNCTIONS_BASE}/launcher-issue`;
  const LAUNCHER_FALLBACK_URL = (() => {
    if ((window.location.pathname || "").includes("/veilnet/")) return "/veilnet/";
    return "/";
  })();

  let countdownInterval = null;
  let expiresAtMs = 0;
  let activeCode = "";

  function setStatus(message, isError) {
    statusEl.textContent = message || "";
    statusEl.style.color = isError ? "#ff8f8f" : "";
  }

  function setSection(section) {
    signedOutBox.style.display = section === "signed_out" ? "flex" : "none";
    usernameRequiredBox.style.display = section === "username_required" ? "flex" : "none";
    readyBox.style.display = section === "ready" ? "flex" : "none";
  }

  function clearCodeBlock() {
    activeCode = "";
    codeText.textContent = "";
    codeBlock.style.display = "none";
    launchHint.style.display = "none";
    stopCountdown();
    codeTimer.textContent = "";
  }

  function stopCountdown() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  function formatRemaining(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  function updateCountdown() {
    if (!expiresAtMs) {
      codeTimer.textContent = "";
      return;
    }
    const remaining = expiresAtMs - Date.now();
    if (remaining <= 0) {
      codeTimer.textContent = "Expired";
      stopCountdown();
      return;
    }
    codeTimer.textContent = `Expires in ${formatRemaining(remaining)}`;
  }

  function startCountdown(expiresAtIso) {
    const parsed = Date.parse(expiresAtIso || "");
    expiresAtMs = Number.isFinite(parsed) ? parsed : 0;
    stopCountdown();
    updateCountdown();
    if (expiresAtMs > Date.now()) {
      countdownInterval = setInterval(updateCountdown, 1000);
    }
  }

  function openLoginModal() {
    if (typeof window.__openVeilnetLoginModal === "function") {
      window.__openVeilnetLoginModal();
      return;
    }
    const ddLogin = document.querySelector("[data-veil-login]");
    if (ddLogin) ddLogin.click();
  }

  function openUsernameModal() {
    if (typeof window.__openVeilnetUsernameModal === "function") {
      window.__openVeilnetUsernameModal();
    }
  }

  function mapIssueError(res, payload) {
    const key = String(payload?.error || "");
    if (res.status === 409 && key === "username_required") {
      return "You must set a username before linking.";
    }
    if (res.status === 429 && (key === "active_code_exists" || key === "rate_limited")) {
      return "You already have an active code. Use it or wait for it to expire.";
    }
    if (res.status === 401) {
      return "Session expired; sign in again.";
    }
    if (res.status === 404) {
      return "Link service not deployed yet.";
    }
    if (key === "launcher_link_codes_schema_mismatch") {
      return "Server setup incomplete (DB table).";
    }
    if (key === "table_missing" || key === "launcher_link_codes_table_missing") {
      return "Server setup incomplete (DB table).";
    }
    if (key === "misconfigured_env") {
      return "Launcher link service is misconfigured on the server.";
    }
    if (key === "db_error" || key === "code_issue_failed") {
      return "Link code generation failed. Please try again.";
    }
    return key || "Failed to generate code.";
  }

  async function issueCode(event) {
    if (event && typeof event.preventDefault === "function") {
      event.preventDefault();
      event.stopPropagation();
    }
    issueCodeBtn.disabled = true;
    setStatus("Generating code...", false);
    try {
      const token = await VeilnetAuth.getToken();
      if (!token) {
        setSection("signed_out");
        throw new Error("Please sign in first.");
      }

      const res = await fetch(ISSUE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: VEILNET_CONFIG.SUPABASE_ANON_KEY,
          "Content-Type": "application/json"
        },
        body: "{}"
      });

      const rawText = await res.text().catch(() => "");
      let payload = {};
      try {
        payload = rawText ? JSON.parse(rawText) : {};
      } catch {
        payload = {};
      }
      if (!res.ok) {
        const snippet = String(rawText || payload || "").slice(0, 500);
        console.error("[launcher-link] launcher-issue failed body:", snippet);
        console.error("[launcher-link] launcher-issue failed", {
          status: res.status,
          body: snippet
        });
        if (res.status === 409 && payload?.error === "username_required") {
          setSection("username_required");
          openUsernameModal();
        }
        throw new Error(mapIssueError(res, payload));
      }

      const code = String(payload?.code || "").trim();
      const expiresAt = String(payload?.expires_at || "");
      if (!code) {
        console.error("[launcher-link] launcher-issue invalid payload", payload);
        throw new Error("Link code response was invalid.");
      }

      activeCode = code;
      codeText.textContent = code;
      codeBlock.style.display = "flex";
      launchHint.style.display = "block";
      setStatus("Code ready. Paste it into the launcher.", false);
      startCountdown(expiresAt);
    } catch (err) {
      setStatus(err?.message || "Failed to generate code.", true);
    } finally {
      issueCodeBtn.disabled = false;
    }
  }

  async function refreshState() {
    try {
      const user = await VeilnetAuth.getUser();
      if (!user) {
        clearCodeBlock();
        setSection("signed_out");
        return;
      }

      const profile = await VeilnetAuth.getMyProfile().catch(() => null);
      const username = String(profile?.username || "").trim();
      if (!username) {
        clearCodeBlock();
        setSection("username_required");
        setStatus("Choose a username to continue linking.", true);
        openUsernameModal();
        return;
      }

      usernameText.textContent = username;
      setSection("ready");
      setStatus("", false);
    } catch (err) {
      setSection("signed_out");
      setStatus(err?.message || "Failed to load session.", true);
    }
  }

  signInBtn.addEventListener("click", () => {
    setStatus("", false);
    openLoginModal();
  });

  pickUsernameBtn.addEventListener("click", () => {
    openUsernameModal();
  });

  issueCodeBtn.addEventListener("click", issueCode);

  copyCodeBtn.addEventListener("click", async () => {
    const code = codeText.textContent || "";
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setStatus("Code copied.", false);
    } catch {
      setStatus("Unable to copy. Copy it manually.", true);
    }
  });

  launchGameBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const launchUrl = "latticeveil://launch";
    const probe = document.createElement("iframe");
    probe.style.display = "none";
    probe.setAttribute("aria-hidden", "true");
    probe.src = launchUrl;
    document.body.appendChild(probe);
    setTimeout(() => {
      try { probe.remove(); } catch {}
    }, 1500);
    setStatus("Trying to open LatticeVeil Launcher...", false);
  });

  const fallbackLink = launchHint.querySelector("a");
  if (fallbackLink) {
    fallbackLink.setAttribute("href", LAUNCHER_FALLBACK_URL);
  }

  window.addEventListener("focus", refreshState);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshState();
  });
  setInterval(refreshState, 3000);

  refreshState();
})();

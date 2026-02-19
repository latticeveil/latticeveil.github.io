(function () {
  const base = `${String(VEILNET_CONFIG?.SUPABASE_URL || "").replace(/\/+$/, "")}/functions/v1`;
  const getUrl = `${base}/game-hashes-get`;
  const setUrl = `${base}/admin-set-build`;
  const hashRe = /^[0-9a-f]{64}$/i;

  const authStateEl = document.getElementById("adminAuthState");
  const statusEl = document.getElementById("adminStatus");
  const loginBox = document.getElementById("adminLoginBox");
  const unauthorizedBox = document.getElementById("adminUnauthorizedBox");
  const mainEl = document.getElementById("adminMain");
  const loginBtn = document.getElementById("adminLoginBtn");

  const devCurrentHash = document.getElementById("devCurrentHash");
  const devCurrentUpdated = document.getElementById("devCurrentUpdated");
  const devCopyBtn = document.getElementById("devCopyBtn");
  const devHashInput = document.getElementById("devHashInput");
  const devUpdateBtn = document.getElementById("devUpdateBtn");

  const releaseCurrentHash = document.getElementById("releaseCurrentHash");
  const releaseCurrentUpdated = document.getElementById("releaseCurrentUpdated");
  const releaseCopyBtn = document.getElementById("releaseCopyBtn");
  const releaseHashInput = document.getElementById("releaseHashInput");
  const releaseUpdateBtn = document.getElementById("releaseUpdateBtn");

  if (
    !authStateEl ||
    !statusEl ||
    !loginBox ||
    !unauthorizedBox ||
    !mainEl ||
    !loginBtn ||
    !devCurrentHash ||
    !devCurrentUpdated ||
    !devCopyBtn ||
    !devHashInput ||
    !devUpdateBtn ||
    !releaseCurrentHash ||
    !releaseCurrentUpdated ||
    !releaseCopyBtn ||
    !releaseHashInput ||
    !releaseUpdateBtn
  ) {
    return;
  }

  let isAdmin = false;

  function setStatus(message, isError = false) {
    statusEl.textContent = message || "";
    statusEl.style.color = isError ? "#ff8f8f" : "";
  }

  function setLoggedOutState() {
    loginBox.style.display = "";
    unauthorizedBox.style.display = "none";
    mainEl.style.display = "none";
    authStateEl.textContent = "You must log in to continue.";
  }

  function setLoggedInState() {
    loginBox.style.display = "none";
    mainEl.style.display = "flex";
  }

  function setAdminUiEnabled(enabled) {
    isAdmin = !!enabled;
    unauthorizedBox.style.display = enabled ? "none" : "";
    devHashInput.disabled = !enabled;
    devUpdateBtn.disabled = !enabled;
    releaseHashInput.disabled = !enabled;
    releaseUpdateBtn.disabled = !enabled;
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
  }

  function normalizeHash(value) {
    return String(value || "").trim().toLowerCase();
  }

  async function copyText(value) {
    const text = String(value || "").trim();
    if (!text || text === "-") return;

    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied.");
    } catch {
      setStatus("Copy failed. Copy manually.", true);
    }
  }

  async function openLogin() {
    if (typeof window.__openVeilnetLoginModal === "function") {
      await window.__openVeilnetLoginModal();
      return;
    }
    document.querySelector("[data-veil-login]")?.dispatchEvent(new MouseEvent("click"));
  }

  async function fetchHashes() {
    const res = await fetch(getUrl, { method: "GET" });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload) {
      throw new Error(payload?.error || "Failed to load hashes.");
    }

    const dev = payload.dev || {};
    const release = payload.release || {};

    devCurrentHash.textContent = dev.sha256 || "-";
    devCurrentUpdated.textContent = formatDate(dev.updated_at);

    releaseCurrentHash.textContent = release.sha256 || "-";
    releaseCurrentUpdated.textContent = formatDate(release.updated_at);
  }

  async function checkAdmin(token) {
    const res = await fetch(setUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: VEILNET_CONFIG.SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action: "check" })
    });

    if (res.status === 403) return false;
    if (!res.ok) return false;

    const payload = await res.json().catch(() => null);
    return !!payload?.is_admin;
  }

  async function updateChannel(channel) {
    if (!isAdmin) {
      setStatus("Not authorized.", true);
      return;
    }

    const input = channel === "dev" ? devHashInput : releaseHashInput;
    const button = channel === "dev" ? devUpdateBtn : releaseUpdateBtn;
    const hash = normalizeHash(input.value);

    if (!hashRe.test(hash)) {
      setStatus("Hash must be exactly 64 hex characters.", true);
      return;
    }

    try {
      button.disabled = true;
      setStatus(`Updating ${channel.toUpperCase()}...`);

      const token = await VeilnetAuth.getToken();
      if (!token) throw new Error("Session expired. Log in again.");

      const res = await fetch(setUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: VEILNET_CONFIG.SUPABASE_ANON_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          channel,
          hash_sha256: hash
        })
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 403) {
          setAdminUiEnabled(false);
          throw new Error("Not authorized.");
        }
        throw new Error(payload?.error || "Update failed.");
      }

      setStatus(`${channel.toUpperCase()} hash updated.`);
      await fetchHashes();
    } catch (error) {
      setStatus(error?.message || "Update failed.", true);
    } finally {
      button.disabled = !isAdmin;
    }
  }

  async function refresh() {
    try {
      const user = await VeilnetAuth.getUser();
      if (!user) {
        setLoggedOutState();
        return;
      }

      setLoggedInState();
      authStateEl.textContent = `Signed in: ${user.email || user.id}`;

      await fetchHashes();

      const token = await VeilnetAuth.getToken();
      if (!token) {
        setAdminUiEnabled(false);
        setStatus("Session expired. Log in again.", true);
        return;
      }

      const admin = await checkAdmin(token);
      setAdminUiEnabled(admin);

      if (!admin) {
        setStatus("Not authorized.", true);
      } else {
        setStatus("");
      }
    } catch (error) {
      setAdminUiEnabled(false);
      setStatus(error?.message || "Failed to load admin panel.", true);
    }
  }

  loginBtn.addEventListener("click", async () => {
    await openLogin();
    await refresh();
  });

  devCopyBtn.addEventListener("click", async () => {
    await copyText(devCurrentHash.textContent);
  });

  releaseCopyBtn.addEventListener("click", async () => {
    await copyText(releaseCurrentHash.textContent);
  });

  devUpdateBtn.addEventListener("click", async () => {
    await updateChannel("dev");
  });

  releaseUpdateBtn.addEventListener("click", async () => {
    await updateChannel("release");
  });

  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refresh();
  });

  refresh();
})();

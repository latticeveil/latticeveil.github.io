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
  let hardBlocked = false;

  function authHeaders(token) {
    const anonKey = String(VEILNET_CONFIG?.SUPABASE_ANON_KEY || "").trim();
    const bearer = String(token || anonKey).trim();
    return {
      apikey: anonKey,
      Authorization: `Bearer ${bearer}`
    };
  }

  async function parseResponse(res, context, requestMeta) {
    const raw = await res.text();
    let payload = null;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      payload = null;
    }

    if (requestMeta) {
      console.debug(`[admin] response ${context}`, {
        url: requestMeta.url,
        method: requestMeta.method,
        status: res.status
      });
    }

    if (!res.ok) {
      console.error(`[admin] ${context} failed`, {
        url: requestMeta?.url,
        method: requestMeta?.method,
        status: res.status,
        body: raw
      });
    }
    return { payload, raw };
  }

  function setStatus(message, isError = false) {
    statusEl.textContent = message || "";
    statusEl.style.color = isError ? "#ff8f8f" : "";
  }

  function setLoggedOutState() {
    if (hardBlocked) return;
    loginBox.style.display = "";
    unauthorizedBox.style.display = "none";
    mainEl.style.display = "none";
    authStateEl.textContent = "You must log in to continue.";
  }

  function setLoggedInState() {
    if (hardBlocked) return;
    loginBox.style.display = "none";
    mainEl.style.display = "none";
  }

  function setAdminUiEnabled(enabled) {
    if (hardBlocked) return;
    isAdmin = !!enabled;
    unauthorizedBox.style.display = enabled ? "none" : "";
    devHashInput.disabled = !enabled;
    devUpdateBtn.disabled = !enabled;
    releaseHashInput.disabled = !enabled;
    releaseUpdateBtn.disabled = !enabled;
    mainEl.style.display = enabled ? "flex" : "none";
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

  function renderUnauthorizedOnlyPage() {
    hardBlocked = true;
    document.body.style.margin = "0";
    document.body.innerHTML = `
      <main style="
        min-height:100vh;
        display:flex;
        align-items:center;
        justify-content:center;
        text-align:center;
        padding:24px;
        background:#090d14;
        color:#ffffff;
        font-family:system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      ">
        <div style="font-size:clamp(26px,4vw,52px); font-weight:900; letter-spacing:0.02em;">
          YOU ARE NOT AUTHORIZED TO VIEW THIS PAGE
        </div>
      </main>
    `;
  }

  async function fetchHashes(token) {
    console.debug("[admin] request fetch hashes", { url: getUrl, method: "GET" });
    const res = await fetch(getUrl, {
      method: "GET",
      headers: authHeaders(token)
    });
    const { payload } = await parseResponse(res, "fetch hashes", { url: getUrl, method: "GET" });
    if (!res.ok || !payload) {
      throw new Error(payload?.error || "Failed to load hashes.");
    }

    const dev = payload.dev || {};
    const release = payload.release || {};

    devCurrentHash.textContent = dev.hash || dev.sha256 || "-";
    devCurrentUpdated.textContent = formatDate(dev.updated_at);

    releaseCurrentHash.textContent = release.hash || release.sha256 || "-";
    releaseCurrentUpdated.textContent = formatDate(release.updated_at);
  }

  async function checkAdmin(token) {
    console.debug("[admin] request admin check", { url: setUrl, method: "POST" });
    const res = await fetch(setUrl, {
      method: "POST",
      headers: {
        ...authHeaders(token),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action: "check" })
    });

    const { payload } = await parseResponse(res, "admin check", { url: setUrl, method: "POST" });
    if (res.status === 401) {
      throw new Error("Session expired. Log in again.");
    }
    if (res.status === 403) return false;
    if (!res.ok) {
      throw new Error(payload?.error || "Admin check failed.");
    }
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

      console.debug("[admin] request update hash", {
        url: setUrl,
        method: "POST",
        channel
      });
      const res = await fetch(setUrl, {
        method: "POST",
        headers: {
          ...authHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          channel,
          hash
        })
      });

      const { payload } = await parseResponse(res, `update ${channel}`, { url: setUrl, method: "POST" });
      if (!res.ok) {
        if (res.status === 403) {
          renderUnauthorizedOnlyPage();
          return;
        }
        throw new Error(payload?.error || "Update failed.");
      }

      setStatus(`${channel.toUpperCase()} hash updated.`);
      await fetchHashes(token);
    } catch (error) {
      setStatus(error?.message || "Update failed.", true);
    } finally {
      button.disabled = !isAdmin;
    }
  }

  async function refresh() {
    if (hardBlocked) return;

    try {
      const user = await VeilnetAuth.getUser();
      if (!user) {
        setLoggedOutState();
        return;
      }

      setLoggedInState();
      authStateEl.textContent = `Signed in: ${user.email || user.id}`;

      const token = await VeilnetAuth.getToken();
      if (!token) {
        setAdminUiEnabled(false);
        setStatus("Session expired. Log in again.", true);
        return;
      }

      const admin = await checkAdmin(token);
      if (!admin) {
        renderUnauthorizedOnlyPage();
        return;
      }

      setAdminUiEnabled(true);
      setStatus("");
      await fetchHashes(token);
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

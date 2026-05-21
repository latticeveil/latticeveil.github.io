(function () {
  const base = `${String(VEILNET_CONFIG?.SUPABASE_URL || "").replace(/\/+$/, "")}/functions/v1`;
  const getUrl = `${base}/game-hashes-get`;
  const setUrl = `${base}/admin-set-build`;
  const devAccessUrl = `${base}/dev-access`;
  const hashRe = /^[0-9a-f]{64}$/i;
  const platforms = ["windows", "android"];
  const channels = ["dev", "release"];
  const state = {
    platform: "windows",
    channel: "dev",
    hashes: {},
    isAdmin: false,
    hardBlocked: false,
    isComputingHash: false,
    accessKind: "tester"
  };
  const MAX_HASH_FILE_BYTES = Math.floor(1.8 * 1024 * 1024 * 1024);

  const els = {
    authState: document.getElementById("adminAuthState"),
    status: document.getElementById("adminStatus"),
    loginBox: document.getElementById("adminLoginBox"),
    unauthorizedBox: document.getElementById("adminUnauthorizedBox"),
    main: document.getElementById("adminMain"),
    loginBtn: document.getElementById("adminLoginBtn"),
    sectionTabs: Array.from(document.querySelectorAll("[data-admin-section]")),
    sections: Array.from(document.querySelectorAll("[data-admin-section-panel]")),
    channelTabs: Array.from(document.querySelectorAll("[data-hash-channel]")),
    platformTabs: Array.from(document.querySelectorAll("[data-hash-platform]")),
    currentTitle: document.getElementById("hashCurrentTitle"),
    currentHash: document.getElementById("hashCurrentValue"),
    currentUpdated: document.getElementById("hashCurrentUpdated"),
    copyBtn: document.getElementById("hashCopyBtn"),
    hashInput: document.getElementById("hashInput"),
    updateBtn: document.getElementById("hashUpdateBtn"),
    dropZone: document.getElementById("hashDropZone"),
    fileInput: document.getElementById("hashFileInput"),
    computeStatus: document.getElementById("hashComputeStatus"),
    autoSubmit: document.getElementById("hashAutoSubmitToggle"),
    selectedLabel: document.getElementById("hashSelectedLabel"),
    fileHint: document.getElementById("hashFileHint"),
    usersPanel: document.getElementById("adminUsersPanel"),
    accessKindTabs: Array.from(document.querySelectorAll("[data-access-kind]")),
    accessUserInput: document.getElementById("devAccessUserInput"),
    accessNoteInput: document.getElementById("devAccessNoteInput"),
    accessAddBtn: document.getElementById("devAccessAddBtn"),
    accessRefreshBtn: document.getElementById("devAccessRefreshBtn"),
    adminsList: document.getElementById("devAdminsList"),
    testersList: document.getElementById("devTestersList")
  };

  if (!els.authState || !els.status || !els.loginBox || !els.main || !els.loginBtn || !els.hashInput || !els.updateBtn) return;

  function authHeaders(token) {
    const anonKey = String(VEILNET_CONFIG?.SUPABASE_ANON_KEY || "").trim();
    const bearer = String(token || anonKey).trim();
    return { apikey: anonKey, Authorization: `Bearer ${bearer}` };
  }

  async function parseResponse(res, context, requestMeta) {
    const raw = await res.text();
    let payload = null;
    try { payload = raw ? JSON.parse(raw) : null; } catch { payload = null; }
    console.debug(`[admin] response ${context}`, { ...requestMeta, status: res.status });
    if (!res.ok) console.error(`[admin] ${context} failed`, { ...requestMeta, status: res.status, body: raw });
    return { payload, raw };
  }

  function setStatus(message, isError = false) {
    els.status.textContent = message || "";
    els.status.style.color = isError ? "#ff8f8f" : "";
  }

  function setComputeStatus(message, tone = "neutral") {
    if (!els.computeStatus) return;
    els.computeStatus.textContent = message || "";
    els.computeStatus.style.color = tone === "error" ? "#ff8f8f" : tone === "warn" ? "#ffd36f" : tone === "ok" ? "#8ff7b0" : "";
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
  }

  function normalizeHash(value) {
    return String(value || "").trim().toLowerCase();
  }

  function shortHash(hash) {
    const h = String(hash || "");
    return h.length < 16 ? h : `${h.slice(0, 8)}...${h.slice(-8)}`;
  }

  function formatBytes(bytes) {
    const size = Number(bytes) || 0;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  function targetLabel(platform = state.platform, channel = state.channel) {
    return `${platform.toUpperCase()} ${channel.toUpperCase()}`;
  }

  function expectedExtensions() {
    return state.platform === "android"
      ? { accept: ".apk,.aab,application/vnd.android.package-archive", label: "APK/AAB" }
      : { accept: ".exe,application/x-msdownload", label: "EXE" };
  }

  function isLikelyArtifact(file) {
    if (!file) return false;
    const name = String(file.name || "").toLowerCase();
    if (state.platform === "android") return name.endsWith(".apk") || name.endsWith(".aab");
    if (name.endsWith(".exe")) return true;
    const type = String(file.type || "").toLowerCase();
    return type.includes("x-msdownload") || type.includes("application/x-msdos-program");
  }

  function getSelectedHashRow() {
    return state.hashes?.[state.platform]?.[state.channel] || null;
  }

  function renderHashPanel() {
    const row = getSelectedHashRow();
    const label = targetLabel();
    const ext = expectedExtensions();
    els.currentTitle.textContent = `${label} (Active)`;
    els.currentHash.textContent = row?.hash || row?.sha256 || "-";
    els.currentUpdated.textContent = formatDate(row?.updated_at);
    els.selectedLabel.textContent = label;
    els.updateBtn.textContent = `Update ${label}`;
    els.fileInput.accept = ext.accept;
    els.fileHint.textContent = `Drop the final signed ${ext.label} for ${label}, or click to choose.`;
    els.dropZone.querySelector("[data-drop-title]").textContent = `Drop ${label} ${ext.label} here`;

    els.channelTabs.forEach((tab) => {
      const active = tab.dataset.hashChannel === state.channel;
      tab.classList.toggle("active", active);
      tab.classList.toggle("ghost", !active);
    });
    els.platformTabs.forEach((tab) => {
      const active = tab.dataset.hashPlatform === state.platform;
      tab.classList.toggle("active", active);
      tab.classList.toggle("ghost", !active);
    });
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    }[ch]));
  }

  function renderAccessKindTabs() {
    els.accessKindTabs.forEach((tab) => {
      const active = tab.dataset.accessKind === state.accessKind;
      tab.classList.toggle("active", active);
      tab.classList.toggle("ghost", !active);
    });
    if (els.accessAddBtn) {
      els.accessAddBtn.textContent = state.accessKind === "admin" ? "Add Admin" : "Add Tester";
    }
  }

  function setLoggedOutState() {
    if (state.hardBlocked) return;
    els.loginBox.style.display = "";
    els.unauthorizedBox.style.display = "none";
    els.main.style.display = "none";
    els.authState.textContent = "You must log in to continue.";
  }

  function setAdminUiEnabled(enabled) {
    if (state.hardBlocked) return;
    state.isAdmin = !!enabled;
    els.unauthorizedBox.style.display = enabled ? "none" : "";
    els.hashInput.disabled = !enabled;
    els.updateBtn.disabled = !enabled;
    els.main.style.display = enabled ? "flex" : "none";
  }

  function setDropZoneActive(active) {
    els.dropZone.style.borderColor = active ? "var(--border-accent)" : "rgba(255,255,255,.22)";
    els.dropZone.style.background = active ? "rgba(124,92,255,.12)" : "rgba(255,255,255,.02)";
  }

  async function sha256HexFromFile(file) {
    if (!window.crypto?.subtle) throw new Error("Web Crypto API unavailable in this browser.");
    const buf = await file.arrayBuffer();
    const digest = await window.crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function handleHashFile(file) {
    if (!file) return;
    const label = targetLabel();
    if (file.size > MAX_HASH_FILE_BYTES) {
      setComputeStatus(`File too large (${formatBytes(file.size)}). Limit is ${formatBytes(MAX_HASH_FILE_BYTES)}.`, "error");
      return;
    }

    const warning = isLikelyArtifact(file) ? "" : `Warning: selected file does not look like a ${expectedExtensions().label}. `;
    const wasDisabled = els.updateBtn.disabled;
    els.updateBtn.disabled = true;
    els.fileInput.disabled = true;
    state.isComputingHash = true;
    setComputeStatus(`${warning}Computing ${label} SHA-256...`, warning ? "warn" : "neutral");

    try {
      const hash = await sha256HexFromFile(file);
      if (!hashRe.test(hash)) throw new Error("Computed hash is invalid.");
      els.hashInput.value = hash;
      setComputeStatus(`${warning}${label} hash computed ${shortHash(hash)}`, warning ? "warn" : "ok");
      if (els.autoSubmit?.checked) {
        setComputeStatus(`${warning}${label} hash computed ${shortHash(hash)} - auto-submitting...`, warning ? "warn" : "ok");
        await updateSelectedHash();
      }
    } catch (error) {
      setComputeStatus(error?.message || "Hash compute failed.", "error");
    } finally {
      state.isComputingHash = false;
      els.fileInput.disabled = false;
      els.updateBtn.disabled = state.isAdmin ? wasDisabled : true;
      els.fileInput.value = "";
    }
  }

  async function copyText(value) {
    const text = String(value || "").trim();
    if (!text || text === "-") return;
    try {
      await navigator.clipboard.writeText(text);
      setStatus(`Copied ${targetLabel()} hash.`);
    } catch {
      setStatus("Copy failed. Copy manually.", true);
    }
  }

  async function openLogin() {
    if (typeof window.__openVeilnetLoginModal === "function") return await window.__openVeilnetLoginModal();
    document.querySelector("[data-veil-login]")?.dispatchEvent(new MouseEvent("click"));
  }

  function resolveHomeHref() {
    const cfgBase = String(window.VEILNET_CONFIG?.BASE_PATH || "").trim();
    if (cfgBase) {
      const normalized = cfgBase.startsWith("/") ? cfgBase : `/${cfgBase}`;
      return normalized.endsWith("/") ? normalized : `${normalized}/`;
    }
    return window.location.pathname.includes("/veilnet/") ? "/veilnet/" : "/";
  }

  function renderUnauthorizedOnlyPage() {
    state.hardBlocked = true;
    document.body.style.margin = "0";
    document.body.innerHTML = `
      <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;background:#090d14;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
        <div style="max-width:min(1200px,100%);width:100%;">
          <div style="font-size:clamp(26px,4vw,52px);font-weight:900;line-height:1.1;">YOU ARE NOT AUTHORIZED TO VIEW THIS PAGE</div>
          <button id="adminUnauthorizedBackBtn" class="btn" type="button" style="display:block;margin:20px auto 0 auto;">Back to Veilnet</button>
        </div>
      </main>`;
    document.getElementById("adminUnauthorizedBackBtn")?.addEventListener("click", () => {
      window.location.href = resolveHomeHref();
    });
  }

  async function fetchHashes(token) {
    const res = await fetch(getUrl, { method: "GET", headers: authHeaders(token) });
    const { payload } = await parseResponse(res, "fetch hashes", { url: getUrl, method: "GET" });
    if (!res.ok || !payload) throw new Error(payload?.message || payload?.error || "Failed to load hashes.");

    const nested = payload.hashes || {};
    state.hashes = {
      windows: {
        dev: nested.windows?.dev || payload.dev || null,
        release: nested.windows?.release || payload.release || null
      },
      android: {
        dev: nested.android?.dev || null,
        release: nested.android?.release || null
      }
    };
    renderHashPanel();
  }

  async function checkAdmin(token) {
    const res = await fetch(setUrl, {
      method: "POST",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check" })
    });
    const { payload } = await parseResponse(res, "admin check", { url: setUrl, method: "POST" });
    if (res.status === 401) throw new Error("Session expired. Log in again.");
    if (res.status === 403) return false;
    if (!res.ok) throw new Error(payload?.message || payload?.error || "Admin check failed.");
    return !!payload?.is_admin;
  }

  async function updateSelectedHash() {
    if (!state.isAdmin) return setStatus("Not authorized.", true);
    const hash = normalizeHash(els.hashInput.value);
    if (!hashRe.test(hash)) return setStatus("Hash must be exactly 64 hex characters.", true);

    const label = targetLabel();
    try {
      els.updateBtn.disabled = true;
      setStatus(`Updating ${label}...`);
      const token = await VeilnetAuth.getToken();
      if (!token) throw new Error("Session expired. Log in again.");

      const requestPayload = { platform: state.platform, channel: state.channel, target: state.channel, hash };
      const res = await fetch(setUrl, {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload)
      });
      const { payload } = await parseResponse(res, `update ${label}`, { url: setUrl, method: "POST" });
      if (!res.ok) {
        if (res.status === 403) return renderUnauthorizedOnlyPage();
        throw new Error(payload?.message || payload?.error || "Update failed.");
      }

      els.hashInput.value = "";
      setStatus(`${label} hash updated.`);
      await fetchHashes(token);
    } catch (error) {
      setStatus(error?.message || "Update failed.", true);
    } finally {
      els.updateBtn.disabled = !state.isAdmin;
    }
  }

  function accessRowHtml(row) {
    const username = row.username ? `@${row.username}` : row.user_id;
    const note = row.note ? `<div class="small" style="margin-top:2px;">${escapeHtml(row.note)}</div>` : "";
    return `
      <div class="panel" style="padding:10px; display:flex; gap:10px; justify-content:space-between; align-items:center;">
        <div style="min-width:0;">
          <div style="font-weight:900; overflow-wrap:anywhere;">${escapeHtml(username)}</div>
          <div class="small" style="overflow-wrap:anywhere;">${escapeHtml(row.user_id || "")}</div>
          ${note}
        </div>
        <button class="btn ghost" type="button" data-remove-access="${escapeHtml(row.kind)}" data-remove-user="${escapeHtml(row.user_id)}">Remove</button>
      </div>`;
  }

  function renderAccessLists(payload) {
    const admins = Array.isArray(payload?.admins) ? payload.admins : [];
    const testers = Array.isArray(payload?.testers) ? payload.testers : [];
    if (els.adminsList) {
      els.adminsList.innerHTML = admins.length
        ? admins.map(accessRowHtml).join("")
        : `<div class="small">No table admins yet. ADMIN_EMAILS bootstrap admins still work.</div>`;
    }
    if (els.testersList) {
      els.testersList.innerHTML = testers.length
        ? testers.map(accessRowHtml).join("")
        : `<div class="small">No DEV testers added.</div>`;
    }
  }

  async function fetchAccessUsers(token) {
    const res = await fetch(devAccessUrl, {
      method: "POST",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list" })
    });
    const { payload } = await parseResponse(res, "list dev access", { url: devAccessUrl, method: "POST" });
    if (!res.ok) {
      if (res.status === 403) return renderUnauthorizedOnlyPage();
      throw new Error(payload?.message || payload?.error || "Failed to load DEV access users.");
    }
    renderAccessLists(payload);
  }

  async function mutateAccess(action, kind, user, note) {
    if (!state.isAdmin) return setStatus("Not authorized.", true);
    const token = await VeilnetAuth.getToken();
    if (!token) throw new Error("Session expired. Log in again.");

    const res = await fetch(devAccessUrl, {
      method: "POST",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ action, kind, user, note })
    });
    const { payload } = await parseResponse(res, `${action} dev access`, { url: devAccessUrl, method: "POST" });
    if (!res.ok) {
      if (res.status === 403) return renderUnauthorizedOnlyPage();
      throw new Error(payload?.message || payload?.error || `${action} failed.`);
    }
    await fetchAccessUsers(token);
  }

  async function addAccessUser() {
    const user = String(els.accessUserInput?.value || "").trim();
    if (!user) return setStatus("Enter a Veilnet username or user id.", true);
    try {
      if (els.accessAddBtn) els.accessAddBtn.disabled = true;
      setStatus(`Adding DEV ${state.accessKind}...`);
      await mutateAccess("add", state.accessKind, user, String(els.accessNoteInput?.value || "").trim());
      if (els.accessUserInput) els.accessUserInput.value = "";
      if (els.accessNoteInput) els.accessNoteInput.value = "";
      setStatus(`DEV ${state.accessKind} added.`);
    } catch (error) {
      setStatus(error?.message || "Add failed.", true);
    } finally {
      if (els.accessAddBtn) els.accessAddBtn.disabled = !state.isAdmin;
    }
  }

  async function removeAccessUser(kind, user) {
    if (!kind || !user) return;
    try {
      setStatus(`Removing DEV ${kind}...`);
      await mutateAccess("remove", kind, user, "");
      setStatus(`DEV ${kind} removed.`);
    } catch (error) {
      setStatus(error?.message || "Remove failed.", true);
    }
  }

  async function refresh() {
    if (state.hardBlocked) return;
    try {
      const user = await VeilnetAuth.getUser();
      if (!user) return setLoggedOutState();
      els.loginBox.style.display = "none";
      els.authState.textContent = `Signed in: ${user.email || user.id}`;

      const token = await VeilnetAuth.getToken();
      if (!token) {
        setAdminUiEnabled(false);
        return setStatus("Session expired. Log in again.", true);
      }

      const admin = await checkAdmin(token);
      if (!admin) return renderUnauthorizedOnlyPage();

      setAdminUiEnabled(true);
      setStatus("");
      await fetchHashes(token);
      await fetchAccessUsers(token);
    } catch (error) {
      setAdminUiEnabled(false);
      setStatus(error?.message || "Failed to load admin panel.", true);
    }
  }

  function wireTabs() {
    els.sectionTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const section = tab.dataset.adminSection;
        els.sectionTabs.forEach((t) => {
          const active = t === tab;
          t.classList.toggle("active", active);
          t.classList.toggle("ghost", !active);
        });
        els.sections.forEach((panel) => panel.style.display = panel.dataset.adminSectionPanel === section ? "" : "none");
      });
    });
    els.channelTabs.forEach((tab) => tab.addEventListener("click", () => {
      state.channel = tab.dataset.hashChannel;
      renderHashPanel();
    }));
    els.platformTabs.forEach((tab) => tab.addEventListener("click", () => {
      state.platform = tab.dataset.hashPlatform;
      renderHashPanel();
    }));
    els.accessKindTabs.forEach((tab) => tab.addEventListener("click", () => {
      state.accessKind = tab.dataset.accessKind === "admin" ? "admin" : "tester";
      renderAccessKindTabs();
    }));
  }

  function wireDropZone() {
    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
    document.addEventListener("dragover", (e) => {
      if (!e.target?.closest?.("[data-hash-dropzone]")) prevent(e);
    });
    document.addEventListener("drop", (e) => {
      if (!e.target?.closest?.("[data-hash-dropzone]")) prevent(e);
    });
    els.dropZone.addEventListener("click", (e) => { prevent(e); els.fileInput.click(); });
    els.dropZone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { prevent(e); els.fileInput.click(); }
    });
    ["dragenter", "dragover"].forEach((name) => els.dropZone.addEventListener(name, (e) => { prevent(e); setDropZoneActive(true); }));
    els.dropZone.addEventListener("dragleave", (e) => {
      prevent(e);
      if (!e.relatedTarget || !els.dropZone.contains(e.relatedTarget)) setDropZoneActive(false);
    });
    els.dropZone.addEventListener("drop", async (e) => {
      prevent(e);
      setDropZoneActive(false);
      const file = e.dataTransfer?.files?.[0] || null;
      if (!file) return setComputeStatus("No file dropped.", "error");
      await handleHashFile(file);
    });
    els.fileInput.addEventListener("change", async () => {
      await handleHashFile(els.fileInput.files?.[0] || null);
    });
  }

  document.querySelectorAll("form").forEach((form) => form.addEventListener("submit", (e) => {
    e.preventDefault();
    e.stopPropagation();
  }));
  els.loginBtn.addEventListener("click", async () => { await openLogin(); await refresh(); });
  els.copyBtn.addEventListener("click", async () => copyText(els.currentHash.textContent));
  els.updateBtn.addEventListener("click", updateSelectedHash);
  els.accessAddBtn?.addEventListener("click", addAccessUser);
  els.accessRefreshBtn?.addEventListener("click", async () => {
    try {
      const token = await VeilnetAuth.getToken();
      if (!token) throw new Error("Session expired. Log in again.");
      await fetchAccessUsers(token);
      setStatus("DEV access list refreshed.");
    } catch (error) {
      setStatus(error?.message || "Refresh failed.", true);
    }
  });
  els.usersPanel?.addEventListener("click", async (event) => {
    const button = event.target?.closest?.("[data-remove-access]");
    if (!button) return;
    await removeAccessUser(button.dataset.removeAccess, button.dataset.removeUser);
  });
  wireTabs();
  wireDropZone();
  renderHashPanel();
  renderAccessKindTabs();

  window.addEventListener("focus", () => { if (!state.isComputingHash) refresh(); });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !state.isComputingHash) refresh(); });
  refresh();
})();

(function () {
  const root = document.getElementById("skinEditorRoot");
  const signInPanel = document.getElementById("skinSignInPanel");
  const signInBtn = document.getElementById("skinSignInBtn");
  const editCanvas = document.getElementById("skinEditCanvas");
  const previewCanvas = document.getElementById("skinPreviewCanvas");
  const statusEl = document.getElementById("skinStatus");
  const cloudStateEl = document.getElementById("skinCloudState");
  const hashTextEl = document.getElementById("skinHashText");
  const updatedTextEl = document.getElementById("skinUpdatedText");
  const colorInput = document.getElementById("skinColor");
  const brushInput = document.getElementById("skinBrushSize");
  const brushReadout = document.getElementById("skinBrushReadout");
  const displayNameInput = document.getElementById("skinDisplayName");
  const importInput = document.getElementById("skinImportFile");
  const penBtn = document.getElementById("skinPenBtn");
  const eraseBtn = document.getElementById("skinEraseBtn");
  const loadBtn = document.getElementById("skinLoadBtn");
  const clearCanvasBtn = document.getElementById("skinClearCanvasBtn");
  const saveBtn = document.getElementById("skinSaveBtn");
  const clearRemoteBtn = document.getElementById("skinClearRemoteBtn");

  if (!root || !signInPanel || !editCanvas || !previewCanvas) return;

  const SKIN_SIZE = 64;
  const MAX_BYTES = 32 * 1024;
  const FUNCTIONS_BASE = `${String(window.VEILNET_CONFIG?.SUPABASE_URL || "").replace(/\/+$/, "")}/functions/v1`;
  const GET_URL = `${FUNCTIONS_BASE}/player-skin-get`;
  const SET_URL = `${FUNCTIONS_BASE}/player-skin-set`;

  const editCtx = editCanvas.getContext("2d", { willReadFrequently: true });
  const previewCtx = previewCanvas.getContext("2d", { willReadFrequently: true });
  editCtx.imageSmoothingEnabled = false;
  previewCtx.imageSmoothingEnabled = false;

  let activeTool = "pen";
  let drawing = false;
  let lastPointer = null;
  let initialCloudLoadComplete = false;
  let hasUnsavedChanges = false;

  function setStatus(message, tone) {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.classList.toggle("is-error", tone === "error");
    statusEl.classList.toggle("is-ok", tone === "ok");
  }

  function setCloudState(message) {
    if (cloudStateEl) cloudStateEl.textContent = message || "-";
  }

  function markDirty() {
    hasUnsavedChanges = true;
  }

  function setBusy(isBusy) {
    [loadBtn, clearCanvasBtn, saveBtn, clearRemoteBtn, importInput, penBtn, eraseBtn].forEach((el) => {
      if (el) el.disabled = !!isBusy;
    });
  }

  function authHeaders(token) {
    return {
      Authorization: `Bearer ${token}`,
      apikey: window.VEILNET_CONFIG.SUPABASE_ANON_KEY,
      "Content-Type": "application/json"
    };
  }

  async function getTokenOrThrow() {
    if (!window.VeilnetAuth?.getToken) throw new Error("Veilnet auth is unavailable.");
    const token = await window.VeilnetAuth.getToken();
    if (!token) throw new Error("Please sign in first.");
    return token;
  }

  function openLoginModal() {
    if (typeof window.__openVeilnetLoginModal === "function") {
      window.__openVeilnetLoginModal();
      return;
    }
    const login = document.querySelector("[data-veil-login]");
    if (login) login.click();
  }

  function normalizeDisplayName(value) {
    const text = String(value || "").trim().replace(/[\r\n\t]/g, " ");
    return text ? text.slice(0, 32) : "Website Skin";
  }

  function fillRect(data, x0, y0, w, h, rgba) {
    for (let y = y0; y < y0 + h; y += 1) {
      for (let x = x0; x < x0 + w; x += 1) {
        if (x < 0 || x >= SKIN_SIZE || y < 0 || y >= SKIN_SIZE) continue;
        const i = ((y * SKIN_SIZE) + x) * 4;
        data[i] = rgba[0];
        data[i + 1] = rgba[1];
        data[i + 2] = rgba[2];
        data[i + 3] = rgba[3];
      }
    }
  }

  function dot(data, x, y, rgba) {
    fillRect(data, x, y, 1, 1, rgba);
  }

  function createDefaultSkinImageData() {
    const image = previewCtx.createImageData(SKIN_SIZE, SKIN_SIZE);
    const d = image.data;
    fillRect(d, 0, 0, SKIN_SIZE, SKIN_SIZE, [90, 112, 136, 255]);

    const skin = [232, 200, 172, 255];
    const hair = [96, 74, 54, 255];
    const shirt = [98, 158, 196, 255];
    const shirtShade = [74, 126, 166, 255];
    const pants = [64, 72, 86, 255];
    const shoe = [38, 42, 50, 255];
    const eyeWhite = [225, 232, 240, 255];
    const eyePupil = [44, 54, 66, 255];
    const mouth = [166, 100, 98, 255];
    const clear = [0, 0, 0, 0];

    fillRect(d, 8, 0, 8, 8, hair); fillRect(d, 16, 0, 8, 8, skin);
    fillRect(d, 0, 8, 8, 8, skin); fillRect(d, 8, 8, 8, 8, skin);
    fillRect(d, 16, 8, 8, 8, skin); fillRect(d, 24, 8, 8, 8, skin);
    fillRect(d, 8, 0, 8, 2, hair); fillRect(d, 8, 8, 8, 2, hair);
    fillRect(d, 0, 8, 8, 2, hair); fillRect(d, 16, 8, 8, 2, hair); fillRect(d, 24, 8, 8, 2, hair);
    dot(d, 10, 11, eyeWhite); dot(d, 13, 11, eyeWhite);
    dot(d, 10, 11, eyePupil); dot(d, 13, 11, eyePupil);
    dot(d, 11, 13, mouth); dot(d, 12, 13, mouth);

    fillRect(d, 20, 16, 8, 4, shirt); fillRect(d, 28, 16, 8, 4, shirt);
    fillRect(d, 16, 20, 4, 12, shirtShade); fillRect(d, 20, 20, 8, 12, shirt);
    fillRect(d, 28, 20, 4, 12, shirtShade); fillRect(d, 32, 20, 8, 12, shirtShade);
    fillRect(d, 20, 20, 8, 2, shirtShade);

    fillRect(d, 44, 16, 4, 4, shirt); fillRect(d, 48, 16, 4, 4, skin);
    fillRect(d, 40, 20, 4, 8, shirtShade); fillRect(d, 44, 20, 4, 8, shirt);
    fillRect(d, 48, 20, 4, 8, shirtShade); fillRect(d, 52, 20, 4, 8, shirtShade);
    fillRect(d, 40, 28, 4, 4, skin); fillRect(d, 44, 28, 4, 4, skin);
    fillRect(d, 48, 28, 4, 4, skin); fillRect(d, 52, 28, 4, 4, skin);

    fillRect(d, 36, 48, 4, 4, shirt); fillRect(d, 40, 48, 4, 4, skin);
    fillRect(d, 32, 52, 4, 8, shirtShade); fillRect(d, 36, 52, 4, 8, shirt);
    fillRect(d, 40, 52, 4, 8, shirtShade); fillRect(d, 44, 52, 4, 8, shirtShade);
    fillRect(d, 32, 60, 4, 4, skin); fillRect(d, 36, 60, 4, 4, skin);
    fillRect(d, 40, 60, 4, 4, skin); fillRect(d, 44, 60, 4, 4, skin);

    fillRect(d, 4, 16, 4, 4, pants); fillRect(d, 8, 16, 4, 4, pants);
    fillRect(d, 0, 20, 4, 10, pants); fillRect(d, 4, 20, 4, 10, pants);
    fillRect(d, 8, 20, 4, 10, pants); fillRect(d, 12, 20, 4, 10, pants);
    fillRect(d, 0, 30, 4, 2, shoe); fillRect(d, 4, 30, 4, 2, shoe);
    fillRect(d, 8, 30, 4, 2, shoe); fillRect(d, 12, 30, 4, 2, shoe);

    fillRect(d, 20, 48, 4, 4, pants); fillRect(d, 24, 48, 4, 4, pants);
    fillRect(d, 16, 52, 4, 10, pants); fillRect(d, 20, 52, 4, 10, pants);
    fillRect(d, 24, 52, 4, 10, pants); fillRect(d, 28, 52, 4, 10, pants);
    fillRect(d, 16, 62, 4, 2, shoe); fillRect(d, 20, 62, 4, 2, shoe);
    fillRect(d, 24, 62, 4, 2, shoe); fillRect(d, 28, 62, 4, 2, shoe);

    fillRect(d, 32, 0, 32, 16, clear);
    fillRect(d, 16, 32, 24, 16, clear);
    fillRect(d, 40, 32, 16, 16, clear);
    fillRect(d, 48, 48, 16, 16, clear);
    fillRect(d, 0, 32, 16, 16, clear);
    fillRect(d, 0, 48, 16, 16, clear);
    return image;
  }

  function refreshPreview() {
    previewCtx.clearRect(0, 0, SKIN_SIZE, SKIN_SIZE);
    previewCtx.putImageData(createDefaultSkinImageData(), 0, 0);
    previewCtx.drawImage(editCanvas, 0, 0);
  }

  function setTool(tool) {
    activeTool = tool === "erase" ? "erase" : "pen";
    if (penBtn) penBtn.classList.toggle("gold", activeTool === "pen");
    if (eraseBtn) eraseBtn.classList.toggle("gold", activeTool === "erase");
  }

  function updateBrushReadout() {
    if (brushReadout) brushReadout.textContent = `${brushInput?.value || 1} px`;
  }

  function hexToRgb(hex) {
    const raw = String(hex || "#000000").replace("#", "");
    return {
      r: parseInt(raw.slice(0, 2), 16) || 0,
      g: parseInt(raw.slice(2, 4), 16) || 0,
      b: parseInt(raw.slice(4, 6), 16) || 0
    };
  }

  function canvasPoint(event) {
    const rect = editCanvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(63, Math.floor(((event.clientX - rect.left) / rect.width) * SKIN_SIZE))),
      y: Math.max(0, Math.min(63, Math.floor(((event.clientY - rect.top) / rect.height) * SKIN_SIZE)))
    };
  }

  function paintAt(point) {
    const size = Math.max(1, parseInt(brushInput?.value || "1", 10));
    const half = Math.floor(size / 2);
    const x = point.x - half;
    const y = point.y - half;

    editCtx.save();
    if (activeTool === "erase") {
      editCtx.clearRect(x, y, size, size);
    } else {
      const rgb = hexToRgb(colorInput?.value);
      editCtx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`;
      editCtx.fillRect(x, y, size, size);
    }
    editCtx.restore();
    markDirty();
    refreshPreview();
  }

  function paintLine(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
    for (let i = 0; i <= steps; i += 1) {
      paintAt({
        x: Math.round(from.x + (dx * i) / steps),
        y: Math.round(from.y + (dy * i) / steps)
      });
    }
  }

  function blobToBytes(blob) {
    return blob.arrayBuffer().then((buffer) => new Uint8Array(buffer));
  }

  function bytesToBase64(bytes) {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(String(value || "").trim());
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function bytesToHex(bytes) {
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function sha256Hex(bytes) {
    return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not encode skin PNG."));
      }, "image/png");
    });
  }

  function loadImageFromBytes(bytes) {
    return new Promise((resolve, reject) => {
      const blob = new Blob([bytes], { type: "image/png" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Skin PNG could not be decoded."));
      };
      img.src = url;
    });
  }

  async function loadOverlayBytes(bytes, name) {
    if (!bytes || bytes.length <= 0 || bytes.length > MAX_BYTES) {
      throw new Error(`Skin PNG must be 1-${MAX_BYTES / 1024} KB.`);
    }

    const img = await loadImageFromBytes(bytes);
    if (img.width !== SKIN_SIZE || (img.height !== SKIN_SIZE && img.height !== 32)) {
      throw new Error("Skin PNG must be 64x64, or legacy 64x32.");
    }

    editCtx.clearRect(0, 0, SKIN_SIZE, SKIN_SIZE);
    editCtx.drawImage(img, 0, 0, img.width, img.height, 0, 0, img.width, img.height);
    if (displayNameInput && name) displayNameInput.value = normalizeDisplayName(name);
    refreshPreview();
  }

  async function fetchCloudSkin() {
    setBusy(true);
    setStatus("Loading cloud skin...");
    try {
      const token = await getTokenOrThrow();
      const res = await fetch(GET_URL, {
        method: "GET",
        headers: authHeaders(token)
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.ok === false) throw new Error(payload.error || `HTTP ${res.status}`);

      if (!payload.hasSkin || !payload.skin) {
        editCtx.clearRect(0, 0, SKIN_SIZE, SKIN_SIZE);
        refreshPreview();
        initialCloudLoadComplete = true;
        hasUnsavedChanges = false;
        setCloudState("No cloud skin saved. Game will use default.");
        if (hashTextEl) hashTextEl.textContent = "-";
        if (updatedTextEl) updatedTextEl.textContent = "-";
        setStatus("Ready. Start drawing or import a PNG.", "ok");
        return;
      }

      const skin = payload.skin;
      await loadOverlayBytes(base64ToBytes(skin.pngBase64), skin.displayName);
      initialCloudLoadComplete = true;
      hasUnsavedChanges = false;
      setCloudState(skin.displayName || "Cloud skin loaded");
      if (hashTextEl) hashTextEl.textContent = String(skin.hash || "-").slice(0, 16);
      if (updatedTextEl) updatedTextEl.textContent = skin.updatedAt ? new Date(skin.updatedAt).toLocaleString() : "-";
      setStatus("Cloud skin loaded.", "ok");
    } catch (err) {
      setStatus(err?.message || "Failed to load skin.", "error");
      setCloudState("Could not load cloud skin.");
    } finally {
      setBusy(false);
    }
  }

  async function saveCloudSkin() {
    setBusy(true);
    setStatus("Encoding skin...");
    try {
      const token = await getTokenOrThrow();
      const blob = await canvasToBlob(editCanvas);
      const bytes = await blobToBytes(blob);
      if (bytes.length <= 0 || bytes.length > MAX_BYTES) {
        throw new Error(`Encoded PNG is ${bytes.length} bytes. Limit is ${MAX_BYTES} bytes.`);
      }

      const hash = await sha256Hex(bytes);
      setStatus("Saving skin...");
      const res = await fetch(SET_URL, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
          action: "set",
          hash,
          pngBase64: bytesToBase64(bytes),
          displayName: normalizeDisplayName(displayNameInput?.value),
          hasLayers: hasVisibleSecondLayer()
        })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.ok === false) throw new Error(payload.error || `HTTP ${res.status}`);

      setCloudState(`${normalizeDisplayName(displayNameInput?.value)} saved`);
      hasUnsavedChanges = false;
      if (hashTextEl) hashTextEl.textContent = hash.slice(0, 16);
      if (updatedTextEl) updatedTextEl.textContent = new Date().toLocaleString();
      setStatus("Game skin saved. The game will sync this account skin online.", "ok");
    } catch (err) {
      setStatus(err?.message || "Failed to save skin.", "error");
    } finally {
      setBusy(false);
    }
  }

  function hasVisibleSecondLayer() {
    const data = editCtx.getImageData(0, 0, SKIN_SIZE, SKIN_SIZE).data;
    const regions = [
      [32, 0, 32, 16],
      [16, 32, 24, 16],
      [40, 32, 16, 16],
      [48, 48, 16, 16],
      [0, 32, 16, 16],
      [0, 48, 16, 16]
    ];
    return regions.some(([x0, y0, w, h]) => {
      for (let y = y0; y < y0 + h; y += 1) {
        for (let x = x0; x < x0 + w; x += 1) {
          if (data[((y * SKIN_SIZE) + x) * 4 + 3] > 8) return true;
        }
      }
      return false;
    });
  }

  async function clearRemoteSkin() {
    if (!confirm("Clear your cloud game skin? The game will fall back to the default skin.")) return;
    setBusy(true);
    setStatus("Clearing cloud skin...");
    try {
      const token = await getTokenOrThrow();
      const res = await fetch(SET_URL, {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({ action: "clear" })
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.ok === false) throw new Error(payload.error || `HTTP ${res.status}`);

      setCloudState("No cloud skin saved. Game will use default.");
      initialCloudLoadComplete = true;
      if (hashTextEl) hashTextEl.textContent = "-";
      if (updatedTextEl) updatedTextEl.textContent = "-";
      setStatus("Cloud skin cleared.", "ok");
    } catch (err) {
      setStatus(err?.message || "Failed to clear cloud skin.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function refreshAuthState() {
    const user = await window.VeilnetAuth?.getUser?.().catch(() => null);
    const signedIn = !!user;
    signInPanel.style.display = signedIn ? "none" : "block";
    root.style.display = signedIn ? "grid" : "none";
    if (signedIn && !initialCloudLoadComplete && !hasUnsavedChanges) fetchCloudSkin();
  }

  editCanvas.addEventListener("pointerdown", (event) => {
    drawing = true;
    editCanvas.setPointerCapture(event.pointerId);
    lastPointer = canvasPoint(event);
    paintAt(lastPointer);
  });

  editCanvas.addEventListener("pointermove", (event) => {
    if (!drawing) return;
    const point = canvasPoint(event);
    paintLine(lastPointer || point, point);
    lastPointer = point;
  });

  editCanvas.addEventListener("pointerup", () => {
    drawing = false;
    lastPointer = null;
  });

  editCanvas.addEventListener("pointercancel", () => {
    drawing = false;
    lastPointer = null;
  });

  penBtn?.addEventListener("click", () => setTool("pen"));
  eraseBtn?.addEventListener("click", () => setTool("erase"));
  loadBtn?.addEventListener("click", fetchCloudSkin);
  clearCanvasBtn?.addEventListener("click", () => {
    editCtx.clearRect(0, 0, SKIN_SIZE, SKIN_SIZE);
    markDirty();
    refreshPreview();
    setStatus("Canvas cleared. Save to update the cloud skin.");
  });
  saveBtn?.addEventListener("click", saveCloudSkin);
  clearRemoteBtn?.addEventListener("click", clearRemoteSkin);
  signInBtn?.addEventListener("click", openLoginModal);
  brushInput?.addEventListener("input", updateBrushReadout);

  importInput?.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      if (file.type !== "image/png") throw new Error("Import must be a PNG file.");
      await loadOverlayBytes(new Uint8Array(await file.arrayBuffer()), file.name.replace(/\.[^.]+$/, ""));
      markDirty();
      setStatus("PNG imported. Save to store it online.", "ok");
    } catch (err) {
      setStatus(err?.message || "Could not import PNG.", "error");
    } finally {
      importInput.value = "";
    }
  });

  setTool("pen");
  updateBrushReadout();
  refreshPreview();
  document.addEventListener("DOMContentLoaded", refreshAuthState);
  window.addEventListener("focus", refreshAuthState);
})();

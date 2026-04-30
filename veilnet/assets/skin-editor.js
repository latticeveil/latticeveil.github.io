(function () {
  const root = document.getElementById("skinEditorRoot");
  const signInPanel = document.getElementById("skinSignInPanel");
  const signInBtn = document.getElementById("skinSignInBtn");
  const editCanvas = document.getElementById("skinEditCanvas");
  const previewCanvas = document.getElementById("skinPreviewCanvas");
  const preview3dHost = document.getElementById("skinPreview3d");
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
  const backupBtn = document.getElementById("skinBackupBtn");
  const downloadLibraryBtn = document.getElementById("skinDownloadLibraryBtn");
  const localLibraryList = document.getElementById("skinLocalLibraryList");

  if (!root || !signInPanel || !editCanvas || !previewCanvas) return;

  const SKIN_SIZE = 64;
  const MAX_BYTES = 32 * 1024;
  const LAYER_INFLATE = 0.026;
  const FUNCTIONS_BASE = `${String(window.VEILNET_CONFIG?.SUPABASE_URL || "").replace(/\/+$/, "")}/functions/v1`;
  const GET_URL = `${FUNCTIONS_BASE}/player-skin-get`;
  const SET_URL = `${FUNCTIONS_BASE}/player-skin-set`;
  const LOCAL_LIBRARY_DB = "veilnet-skin-library";
  const LOCAL_LIBRARY_STORE = "skins";
  const LOCAL_LIBRARY_MAX = 24;
  const LOCAL_DRAFT_ID = "__draft__";

  const editCtx = editCanvas.getContext("2d", { willReadFrequently: true });
  const previewCtx = previewCanvas.getContext("2d", { willReadFrequently: true });
  editCtx.imageSmoothingEnabled = false;
  previewCtx.imageSmoothingEnabled = false;

  let activeTool = "pen";
  let drawing = false;
  let lastPointer = null;
  let initialCloudLoadComplete = false;
  let hasUnsavedChanges = false;
  let lastCloudHash = "";
  let lastCloudUpdatedAt = "";
  let remoteRefreshInFlight = false;
  let localLibraryDbPromise = null;
  let localDraftTimer = 0;
  let playerPreview = null;
  const REMOTE_REFRESH_MS = 9000;

  const PLAYER_PARTS = [
    {
      size: { x: 0.42, y: 0.42, z: 0.42 },
      position: { x: 0.0, y: 1.59, z: 0.0 },
      base: boxMap([8, 0, 8, 8], [16, 0, 8, 8], [0, 8, 8, 8], [8, 8, 8, 8], [16, 8, 8, 8], [24, 8, 8, 8]),
      overlay: boxMap([40, 0, 8, 8], [48, 0, 8, 8], [32, 8, 8, 8], [40, 8, 8, 8], [48, 8, 8, 8], [56, 8, 8, 8])
    },
    {
      size: { x: 0.52, y: 0.70, z: 0.30 },
      position: { x: 0.0, y: 1.07, z: 0.0 },
      base: boxMap([20, 16, 8, 4], [28, 16, 8, 4], [16, 20, 4, 12], [20, 20, 8, 12], [28, 20, 4, 12], [32, 20, 8, 12]),
      overlay: boxMap([20, 32, 8, 4], [28, 32, 8, 4], [16, 36, 4, 12], [20, 36, 8, 12], [28, 36, 4, 12], [32, 36, 8, 12])
    },
    {
      size: { x: 0.24, y: 0.72, z: 0.24 },
      position: { x: -0.38, y: 1.06, z: 0.0 },
      base: boxMap([36, 48, 4, 4], [40, 48, 4, 4], [32, 52, 4, 12], [36, 52, 4, 12], [40, 52, 4, 12], [44, 52, 4, 12]),
      overlay: boxMap([52, 48, 4, 4], [56, 48, 4, 4], [48, 52, 4, 12], [52, 52, 4, 12], [56, 52, 4, 12], [60, 52, 4, 12])
    },
    {
      size: { x: 0.24, y: 0.72, z: 0.24 },
      position: { x: 0.38, y: 1.06, z: 0.0 },
      base: boxMap([44, 16, 4, 4], [48, 16, 4, 4], [40, 20, 4, 12], [44, 20, 4, 12], [48, 20, 4, 12], [52, 20, 4, 12]),
      overlay: boxMap([44, 32, 4, 4], [48, 32, 4, 4], [40, 36, 4, 12], [44, 36, 4, 12], [48, 36, 4, 12], [52, 36, 4, 12])
    },
    {
      size: { x: 0.22, y: 0.72, z: 0.24 },
      position: { x: -0.13, y: 0.36, z: 0.0 },
      base: boxMap([20, 48, 4, 4], [24, 48, 4, 4], [16, 52, 4, 12], [20, 52, 4, 12], [24, 52, 4, 12], [28, 52, 4, 12]),
      overlay: boxMap([4, 48, 4, 4], [8, 48, 4, 4], [0, 52, 4, 12], [4, 52, 4, 12], [8, 52, 4, 12], [12, 52, 4, 12])
    },
    {
      size: { x: 0.22, y: 0.72, z: 0.24 },
      position: { x: 0.13, y: 0.36, z: 0.0 },
      base: boxMap([4, 16, 4, 4], [8, 16, 4, 4], [0, 20, 4, 12], [4, 20, 4, 12], [8, 20, 4, 12], [12, 20, 4, 12]),
      overlay: boxMap([4, 32, 4, 4], [8, 32, 4, 4], [0, 36, 4, 12], [4, 36, 4, 12], [8, 36, 4, 12], [12, 36, 4, 12])
    }
  ];

  function rect(values) {
    return { x: values[0], y: values[1], w: values[2], h: values[3] };
  }

  function boxMap(top, bottom, left, front, right, back) {
    return {
      top: rect(top),
      bottom: rect(bottom),
      left: rect(left),
      front: rect(front),
      right: rect(right),
      back: rect(back)
    };
  }

  class PlayerSkin3DPreview {
    constructor(host) {
      this.host = host;
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.texture = null;
      this.group = null;
      this.animationId = 0;
      this.isDragging = false;
      this.previousPointer = { x: 0, y: 0 };
      this.boundResize = () => this.resize();
    }

    init() {
      if (!this.host || !window.THREE || this.renderer) return;

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
      this.camera.position.set(0, 0.12, 5.1);
      this.camera.lookAt(0, 0.0, 0);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setPixelRatio(window.devicePixelRatio || 1);
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.outputEncoding = THREE.sRGBEncoding;
      this.host.innerHTML = "";
      this.host.appendChild(this.renderer.domElement);

      this.texture = new THREE.CanvasTexture(previewCanvas);
      this.texture.magFilter = THREE.NearestFilter;
      this.texture.minFilter = THREE.NearestFilter;
      this.texture.generateMipmaps = false;
      this.texture.encoding = THREE.sRGBEncoding;

      this.group = this.createPlayerGroup();
      this.group.rotation.set(-0.08, 0.56, 0);
      this.scene.add(this.group);
      this.bindInteraction();
      this.resize();
      window.addEventListener("resize", this.boundResize);
      this.animate();
    }

    createPlayerGroup() {
      const group = new THREE.Group();
      const baseMaterial = new THREE.MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        alphaTest: 0.04,
        side: THREE.FrontSide
      });
      const overlayMaterial = new THREE.MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        alphaTest: 0.04,
        side: THREE.FrontSide
      });

      PLAYER_PARTS.forEach((part) => {
        const baseGeometry = new THREE.BoxGeometry(part.size.x, part.size.y, part.size.z);
        this.applySkinUv(baseGeometry, part.base);
        const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
        baseMesh.position.set(part.position.x, part.position.y, part.position.z);
        group.add(baseMesh);

        const overlayGeometry = new THREE.BoxGeometry(
          part.size.x + (LAYER_INFLATE * 2),
          part.size.y + (LAYER_INFLATE * 2),
          part.size.z + (LAYER_INFLATE * 2)
        );
        this.applySkinUv(overlayGeometry, part.overlay);
        const overlayMesh = new THREE.Mesh(overlayGeometry, overlayMaterial);
        overlayMesh.position.copy(baseMesh.position);
        group.add(overlayMesh);
      });

      group.position.y = -0.78;
      return group;
    }

    applySkinUv(geometry, rects) {
      const faceRects = [
        rects.right,
        rects.left,
        rects.top,
        rects.bottom,
        rects.front,
        rects.back
      ];
      const uv = geometry.attributes.uv;
      faceRects.forEach((r, i) => {
        const u0 = r.x / SKIN_SIZE;
        const u1 = (r.x + r.w) / SKIN_SIZE;
        const v0 = 1 - ((r.y + r.h) / SKIN_SIZE);
        const v1 = 1 - (r.y / SKIN_SIZE);
        this.writeFaceUv(uv, i, u0, v0, u1, v1);
      });
      uv.needsUpdate = true;
    }

    writeFaceUv(uv, faceIndex, u0, v0, u1, v1) {
      const base = faceIndex * 4;
      const epsilon = 0.0008;
      const left = u0 + epsilon;
      const right = u1 - epsilon;
      const bottom = v0 + epsilon;
      const top = v1 - epsilon;
      uv.setXY(base, left, top);
      uv.setXY(base + 1, right, top);
      uv.setXY(base + 2, left, bottom);
      uv.setXY(base + 3, right, bottom);
    }

    bindInteraction() {
      this.host.addEventListener("pointerdown", (event) => {
        this.isDragging = true;
        this.previousPointer = { x: event.clientX, y: event.clientY };
        this.host.setPointerCapture(event.pointerId);
      });
      this.host.addEventListener("pointermove", (event) => {
        if (!this.isDragging || !this.group) return;
        const dx = event.clientX - this.previousPointer.x;
        const dy = event.clientY - this.previousPointer.y;
        this.group.rotation.y += dx * 0.01;
        this.group.rotation.x = Math.max(-0.55, Math.min(0.35, this.group.rotation.x + dy * 0.006));
        this.previousPointer = { x: event.clientX, y: event.clientY };
      });
      const stop = () => { this.isDragging = false; };
      this.host.addEventListener("pointerup", stop);
      this.host.addEventListener("pointercancel", stop);
      this.host.addEventListener("wheel", (event) => {
        if (!this.camera) return;
        event.preventDefault();
        this.camera.position.z = Math.max(3.2, Math.min(7.2, this.camera.position.z + Math.sign(event.deltaY) * 0.28));
      }, { passive: false });
    }

    resize() {
      if (!this.host || !this.renderer || !this.camera) return;
      const rect = this.host.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    updateTexture() {
      this.init();
      if (this.texture) this.texture.needsUpdate = true;
    }

    animate() {
      this.animationId = requestAnimationFrame(() => this.animate());
      if (!this.renderer || !this.scene || !this.camera) return;
      this.renderer.render(this.scene, this.camera);
    }
  }

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
    queueLocalDraftBackup();
  }

  function setBusy(isBusy) {
    [loadBtn, clearCanvasBtn, saveBtn, clearRemoteBtn, importInput, penBtn, eraseBtn, backupBtn, downloadLibraryBtn].forEach((el) => {
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
    ensure3DPreview();
    if (playerPreview) playerPreview.updateTexture();
  }

  function ensure3DPreview() {
    if (!preview3dHost || !window.THREE) return;
    if (!playerPreview) playerPreview = new PlayerSkin3DPreview(preview3dHost);
    playerPreview.init();
    playerPreview.resize();
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

  function openLocalLibraryDb() {
    if (localLibraryDbPromise) return localLibraryDbPromise;
    localLibraryDbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(LOCAL_LIBRARY_DB, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(LOCAL_LIBRARY_STORE)) {
          const store = db.createObjectStore(LOCAL_LIBRARY_STORE, { keyPath: "id" });
          store.createIndex("updatedAt", "updatedAt");
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open local skin library."));
    });
    return localLibraryDbPromise;
  }

  async function runLibraryStore(mode, work) {
    const db = await openLocalLibraryDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(LOCAL_LIBRARY_STORE, mode);
      const store = tx.objectStore(LOCAL_LIBRARY_STORE);
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || new Error("Local skin library failed."));
      tx.onabort = () => reject(tx.error || new Error("Local skin library was aborted."));
      result = work(store);
    });
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Local skin library request failed."));
    });
  }

  async function listLocalSkins() {
    try {
      const entries = await runLibraryStore("readonly", (store) => requestToPromise(store.getAll()));
      return (entries || []).sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
    } catch (err) {
      console.warn("Local skin library list failed", err);
      return [];
    }
  }

  function isCurrentCloudSkinEntry(entry) {
    const entryHash = String(entry?.hash || "").trim().toLowerCase();
    const cloudHash = String(lastCloudHash || "").trim().toLowerCase();
    return !!entryHash && !!cloudHash && entryHash === cloudHash;
  }

  async function listVisibleLocalSkins() {
    const entries = await listLocalSkins();
    return entries.filter((entry) => !isCurrentCloudSkinEntry(entry));
  }

  function getLocalBackupName(source, name) {
    const normalized = normalizeDisplayName(name || displayNameInput?.value || "Website Skin");
    if (source === "draft") return `${normalized} Draft`;
    return normalized;
  }

  async function saveLocalSkinBackup(source, name, options = {}) {
    try {
      const bytes = options.bytes || await blobToBytes(await canvasToBlob(editCanvas));
      if (!bytes || bytes.length <= 0 || bytes.length > MAX_BYTES) return null;
      const hash = await sha256Hex(bytes);
      const now = new Date().toISOString();
      const draft = !!options.draft;
      const entry = {
        id: draft ? LOCAL_DRAFT_ID : hash,
        hash,
        displayName: getLocalBackupName(source, name),
        source,
        pngBase64: bytesToBase64(bytes),
        bytesLength: bytes.length,
        hasLayers: hasVisibleSecondLayer(),
        updatedAt: now
      };

      await runLibraryStore("readwrite", (store) => {
        store.put(entry);
      });
      await trimLocalLibrary();
      await renderLocalLibrary();
      return entry;
    } catch (err) {
      console.warn("Local skin backup failed", err);
      return null;
    }
  }

  async function trimLocalLibrary() {
    const entries = await listLocalSkins();
    const history = entries.filter((entry) => entry.id !== LOCAL_DRAFT_ID);
    const remove = history.slice(LOCAL_LIBRARY_MAX);
    if (remove.length === 0) return;
    await runLibraryStore("readwrite", (store) => {
      remove.forEach((entry) => store.delete(entry.id));
    });
  }

  function queueLocalDraftBackup() {
    window.clearTimeout(localDraftTimer);
    localDraftTimer = window.setTimeout(() => {
      saveLocalSkinBackup("draft", displayNameInput?.value, { draft: true });
    }, 1400);
  }

  function formatLibraryDate(value) {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : "-";
  }

  function safeFilePart(value) {
    return String(value || "skin")
      .trim()
      .replace(/[^a-z0-9._-]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "skin";
  }

  function createLvskinMetadata(entry) {
    return {
      Format: "lvskin",
      Version: 1,
      SkinFormat: "skin-64x64",
      Sha256: entry.hash || "",
      DisplayName: normalizeDisplayName(entry.displayName),
      SourceFileName: normalizeDisplayName(entry.displayName),
      Width: SKIN_SIZE,
      Height: SKIN_SIZE,
      HasLayers: !!entry.hasLayers,
      Mime: "image/png",
      UpdatedAtUtc: entry.updatedAt || new Date().toISOString(),
      PngBase64: entry.pngBase64 || ""
    };
  }

  async function restoreLocalSkin(entry) {
    try {
      await loadOverlayBytes(base64ToBytes(entry.pngBase64), entry.displayName);
      markDirty();
      setStatus("Local library skin loaded. Save to update the cloud skin.", "ok");
    } catch (err) {
      setStatus(err?.message || "Could not load local backup.", "error");
    }
  }

  async function deleteLocalSkin(id) {
    await runLibraryStore("readwrite", (store) => {
      store.delete(id);
    });
    await renderLocalLibrary();
  }

  async function renderLocalLibrary() {
    if (!localLibraryList) return;
    const allEntries = await listLocalSkins();
    const entries = allEntries.filter((entry) => !isCurrentCloudSkinEntry(entry));
    localLibraryList.innerHTML = "";
    if (entries.length === 0) {
      const empty = document.createElement("div");
      empty.className = "small";
      empty.textContent = allEntries.length > 0 ? "Only the current online skin is saved here." : "No local backups yet.";
      localLibraryList.appendChild(empty);
      return;
    }

    entries.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "skin-library-entry";

      const img = document.createElement("img");
      img.alt = "";
      img.src = `data:image/png;base64,${entry.pngBase64}`;
      row.appendChild(img);

      const main = document.createElement("div");
      main.className = "skin-library-entry-main";

      const title = document.createElement("div");
      title.className = "skin-library-entry-title";
      title.textContent = entry.displayName || "Skin Backup";
      main.appendChild(title);

      const meta = document.createElement("div");
      meta.className = "skin-library-entry-meta";
      meta.textContent = `${entry.source || "backup"} • ${String(entry.hash || "").slice(0, 12)} • ${formatLibraryDate(entry.updatedAt)}`;
      main.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "skin-library-entry-actions";

      const restore = document.createElement("button");
      restore.type = "button";
      restore.className = "btn ghost";
      restore.textContent = "Restore";
      restore.addEventListener("click", () => restoreLocalSkin(entry));
      actions.appendChild(restore);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "btn ghost";
      remove.textContent = "Delete";
      remove.addEventListener("click", () => deleteLocalSkin(entry.id));
      actions.appendChild(remove);

      const download = document.createElement("button");
      download.type = "button";
      download.className = "btn ghost";
      download.textContent = "PNG";
      download.addEventListener("click", () => {
        downloadBlob(
          new Blob([base64ToBytes(entry.pngBase64)], { type: "image/png" }),
          `${safeFilePart(entry.displayName)}-${String(entry.hash || "skin").slice(0, 12)}.png`
        );
      });
      actions.appendChild(download);

      main.appendChild(actions);
      row.appendChild(main);
      localLibraryList.appendChild(row);
    });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function openLauncher() {
    window.location.href = "latticeveil://launch";
  }

  function createLauncherClipboardPayload(entries) {
    return JSON.stringify({
      Format: "latticeveil-browser-skin-library",
      Version: 1,
      ExportedAtUtc: new Date().toISOString(),
      Skins: entries.map((entry) => ({
        Hash: String(entry.hash || "").toLowerCase(),
        DisplayName: normalizeDisplayName(entry.displayName),
        PngBase64: entry.pngBase64 || ""
      }))
    });
  }

  async function copyLibraryPayloadToClipboard(entries) {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard import is unavailable in this browser.");
    await navigator.clipboard.writeText(createLauncherClipboardPayload(entries));
  }

  async function requestLauncherClipboardImport(entries) {
    await copyLibraryPayloadToClipboard(entries);
    window.location.href = "latticeveil://skin-import-clipboard";
  }

  function requestLauncherSkinLibraryRefresh() {
    window.location.href = "latticeveil://skin-library-refresh";
  }

  async function downloadLocalLibraryZip(entries) {
    if (!window.JSZip) throw new Error("ZIP export library did not load.");
    const zip = new JSZip();
    const manifest = entries.map((entry) => ({
      filename: `${safeFilePart(entry.displayName)}-${String(entry.hash || "skin").slice(0, 12)}.png`,
      displayName: entry.displayName,
      hash: entry.hash,
      source: entry.source,
      updatedAt: entry.updatedAt,
      hasLayers: !!entry.hasLayers
    }));

    entries.forEach((entry, index) => {
      zip.file(manifest[index].filename, base64ToBytes(entry.pngBase64));
      zip.file(`${String(entry.hash || `skin-${index}`).toLowerCase()}.lvskin`, JSON.stringify(createLvskinMetadata(entry), null, 2));
    });
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, `latticeveil-skin-library-${new Date().toISOString().slice(0, 10)}.zip`);
  }

  async function importLocalLibraryToLauncher() {
    const entries = (await listVisibleLocalSkins()).filter((entry) => entry.pngBase64);
    if (entries.length === 0) {
      setStatus("No backup skins to import. The current online skin is already the launcher source.", "error");
      return;
    }

    try {
      if (!window.showDirectoryPicker) {
        await requestLauncherClipboardImport(entries);
        setStatus("Copied browser skins for launcher import. Approve the browser prompt to open LatticeVeil.", "ok");
        return;
      }

      setStatus("Choose the LatticeVeil Runtime skins folder...");
      const dir = await window.showDirectoryPicker({
        id: "latticeveil-skins",
        mode: "readwrite",
        startIn: "documents"
      });

      let imported = 0;
      for (const entry of entries) {
        const hash = String(entry.hash || "").toLowerCase();
        if (!/^[a-f0-9]{64}$/.test(hash)) continue;

        const pngHandle = await dir.getFileHandle(`${hash}.png`, { create: true });
        const pngWritable = await pngHandle.createWritable();
        await pngWritable.write(new Blob([base64ToBytes(entry.pngBase64)], { type: "image/png" }));
        await pngWritable.close();

        const lvskinHandle = await dir.getFileHandle(`${hash}.lvskin`, { create: true });
        const lvskinWritable = await lvskinHandle.createWritable();
        await lvskinWritable.write(JSON.stringify(createLvskinMetadata(entry), null, 2));
        await lvskinWritable.close();
        imported += 1;
      }

      requestLauncherSkinLibraryRefresh();
      setStatus(`Copied ${imported} skin${imported === 1 ? "" : "s"} to the launcher skin folder. Opening launcher refresh.`, "ok");
    } catch (err) {
      if (err?.name === "AbortError") {
        setStatus("Launcher import canceled.", "error");
        return;
      }
      try {
        await requestLauncherClipboardImport(entries);
        setStatus("Could not write directly. Copied browser skins for launcher import instead.", "ok");
      } catch {
        try {
          await downloadLocalLibraryZip(entries);
          openLauncher();
          setStatus("Could not hand off directly. Downloaded a ZIP and opened the launcher.", "error");
        } catch {
          const first = entries[0];
          downloadBlob(new Blob([base64ToBytes(first.pngBase64)], { type: "image/png" }), `${safeFilePart(first.displayName)}-${String(first.hash || "skin").slice(0, 12)}.png`);
          setStatus(err?.message || "Could not import. Downloaded the newest backup as PNG.", "error");
        }
      }
    }
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

  async function readRemoteSkin(token) {
    const res = await fetch(GET_URL, {
      method: "GET",
      headers: authHeaders(token)
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok || payload.ok === false) throw new Error(payload.error || `HTTP ${res.status}`);
    return payload;
  }

  async function applyCloudSkinPayload(payload, message) {
    if (!payload.hasSkin || !payload.skin) {
      editCtx.clearRect(0, 0, SKIN_SIZE, SKIN_SIZE);
      refreshPreview();
      initialCloudLoadComplete = true;
      hasUnsavedChanges = false;
      lastCloudHash = "";
      lastCloudUpdatedAt = "";
      setCloudState("No cloud skin saved. Game will use default.");
      if (hashTextEl) hashTextEl.textContent = "-";
      if (updatedTextEl) updatedTextEl.textContent = "-";
      await renderLocalLibrary();
      setStatus(message || "Ready. Start drawing or import a PNG.", "ok");
      return;
    }

    const skin = payload.skin;
    const skinBytes = base64ToBytes(skin.pngBase64);
    await loadOverlayBytes(skinBytes, skin.displayName);
    initialCloudLoadComplete = true;
    hasUnsavedChanges = false;
    lastCloudHash = String(skin.hash || "");
    lastCloudUpdatedAt = String(skin.updatedAt || "");
    setCloudState(skin.displayName || "Cloud skin loaded");
    if (hashTextEl) hashTextEl.textContent = String(skin.hash || "-").slice(0, 16);
    if (updatedTextEl) updatedTextEl.textContent = skin.updatedAt ? new Date(skin.updatedAt).toLocaleString() : "-";
    await renderLocalLibrary();
    setStatus(message || "Cloud skin loaded.", "ok");
  }

  async function fetchCloudSkin() {
    setBusy(true);
    setStatus("Loading cloud skin...");
    try {
      const token = await getTokenOrThrow();
      const payload = await readRemoteSkin(token);
      await applyCloudSkinPayload(payload, payload.hasSkin ? "Cloud skin loaded." : "Ready. Start drawing or import a PNG.");
    } catch (err) {
      setStatus(err?.message || "Failed to load skin.", "error");
      setCloudState("Could not load cloud skin.");
    } finally {
      setBusy(false);
    }
  }

  async function checkForRemoteSkinUpdate() {
    if (remoteRefreshInFlight || document.hidden || !initialCloudLoadComplete) return;

    const signedIn = signInPanel.style.display === "none";
    if (!signedIn) return;

    remoteRefreshInFlight = true;
    try {
      const token = await getTokenOrThrow();
      const payload = await readRemoteSkin(token);
      const skin = payload.hasSkin && payload.skin ? payload.skin : null;
      const nextHash = skin ? String(skin.hash || "") : "";
      const nextUpdatedAt = skin ? String(skin.updatedAt || "") : "";
      const changed = nextHash !== lastCloudHash || nextUpdatedAt !== lastCloudUpdatedAt;
      if (!changed) return;

      if (hasUnsavedChanges) {
        lastCloudHash = nextHash;
        lastCloudUpdatedAt = nextUpdatedAt;
        setStatus("Cloud skin changed elsewhere. Use Reload Cloud when you are ready to replace local edits.", "error");
        return;
      }

      await applyCloudSkinPayload(payload, skin ? "Cloud skin updated from launcher." : "Cloud skin cleared from launcher.");
    } catch (err) {
      console.warn("Cloud skin refresh failed", err);
    } finally {
      remoteRefreshInFlight = false;
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
      lastCloudHash = hash;
      lastCloudUpdatedAt = new Date().toISOString();
      if (hashTextEl) hashTextEl.textContent = hash.slice(0, 16);
      if (updatedTextEl) updatedTextEl.textContent = new Date().toLocaleString();
      await renderLocalLibrary();
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
      lastCloudHash = "";
      lastCloudUpdatedAt = "";
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
    if (signedIn) ensure3DPreview();
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
      const bytes = new Uint8Array(await file.arrayBuffer());
      await loadOverlayBytes(bytes, file.name.replace(/\.[^.]+$/, ""));
      await saveLocalSkinBackup("import", file.name.replace(/\.[^.]+$/, ""), { bytes });
      markDirty();
      setStatus("PNG imported. Save to store it online.", "ok");
    } catch (err) {
      setStatus(err?.message || "Could not import PNG.", "error");
    } finally {
      importInput.value = "";
    }
  });

  backupBtn?.addEventListener("click", async () => {
    const entry = await saveLocalSkinBackup("manual", displayNameInput?.value);
    setStatus(entry ? "Local backup saved in this browser." : "Could not save local backup.", entry ? "ok" : "error");
  });
  downloadLibraryBtn?.addEventListener("click", importLocalLibraryToLauncher);

  setTool("pen");
  updateBrushReadout();
  refreshPreview();
  renderLocalLibrary();
  document.addEventListener("DOMContentLoaded", refreshAuthState);
  window.addEventListener("focus", () => {
    refreshAuthState();
    checkForRemoteSkinUpdate();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) return;
    refreshAuthState();
    checkForRemoteSkinUpdate();
  });
  window.setInterval(checkForRemoteSkinUpdate, REMOTE_REFRESH_MS);
})();

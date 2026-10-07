/* LatticeVeil Shared Messaging — website client.
 * One messaging backend (Supabase Postgres + Realtime) shared with the
 * LatticeVeil launcher companion app. Postgres is authoritative; IndexedDB
 * is a per-account read cache only (isolated per user id, cleared on logout).
 */
(function () {
  "use strict";

  const CFG = window.VEILNET_CONFIG;
  const client = window.VeilnetAuth.init();
  const FN = CFG.SUPABASE_URL + "/functions/v1/messaging-api";
  const PAGE = 50;

  const TRASH_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>';
  const ACC_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H5a2 2 0 0 0 0 4h2"/><path d="M17 6h2a2 2 0 0 1 0 4h-2"/></svg>';
  const PERSON_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/></svg>';

  const state = {
    me: null,                 // auth user id
    friends: [],              // [{productUserId, username, pictureUrl}]
    incomingRequests: [],     // [{productUserId, user:{...}}]
    outgoingRequests: [],     // [{productUserId, user:{...}}]
    conversations: new Map(), // conversation_id -> {id, other_id, other, unread, last_*}
    messages: new Map(),      // conversation_id -> Map(id -> message)
    order: new Map(),         // conversation_id -> [ids sorted by created_at]
    current: null,            // conversation_id being viewed
    sessionStart: Date.now(), // pings only fire for messages that arrive LIVE
    draftFriend: null,        // friend of an open draft chat (no server conversation yet)
    processedIds: new Set(),  // message ids already merged (delivery dedupe)
    notifiedIds: new Set(),   // message ids already pinged/badged (notify dedupe)
    channel: null,
    connState: "off",
    sound: (localStorage.getItem("veilnet_msg_sound") ?? "on") === "on",
    loadingOlder: false,
    sending: new Set(),
  };

  // ---------- tiny helpers ----------
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const timeStr = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };
  const dayStr = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
  };

  async function api(action, extra) {
    const token = await VeilnetAuth.getToken();
    const r = await fetch(FN, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok || body.ok === false) throw new Error(body.error || ("http_" + r.status));
    return body;
  }

  // ---------- IndexedDB cache (per-account isolation) ----------
  function cacheDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("veilnet-msgs-" + state.me, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("messages")) {
          const store = db.createObjectStore("messages", { keyPath: "id" });
          store.createIndex("conv_time", ["conversation_id", "created_at"]);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function cachePut(msgs) {
    if (!msgs.length) return;
    const db = await cacheDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction("messages", "readwrite");
      const store = tx.objectStore("messages");
      for (const m of msgs) store.put(m);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  async function cacheGetAll(convId) {
    const db = await cacheDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction("messages").objectStore("messages")
        .index("conv_time").getAll(IDBKeyRange.bound([convId, ""], [convId, "\uffff"]));
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }
  async function cacheWipeAll() {
    const names = await indexedDB.databases?.() ?? [];
    for (const n of names.map((d) => d.name)) {
      if (String(n).startsWith("veilnet-msgs-")) {
        indexedDB.deleteDatabase(n);
      }
    }
    // Fallback for browsers without databases(): delete this user's db by name
    if (state.me) indexedDB.deleteDatabase("veilnet-msgs-" + state.me);
  }

  // ---------- merge / dedupe ----------
  function convMessages(convId) {
    if (!state.messages.has(convId)) {
      state.messages.set(convId, new Map());
      state.order.set(convId, []);
    }
    return state.messages.get(convId);
  }
  function mergeMessages(convId, list) {
    if (!list?.length) return [];
    const map = convMessages(convId);
    const fresh = [];
    for (const m of list) {
      if (!map.has(m.id)) {
        fresh.push(m);
        state.processedIds.add(m.id);
      }
      map.set(m.id, m);
    }
    const order = state.order.get(convId);
    order.length = 0;
    for (const m of map.values()) order.push(m);
    order.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    return fresh;
  }

  // ---------- one-sided clear tracking ----------
  // Clearing is ONE-SIDED: the person who clears loses the chat (server copy
  // deleted + local cache wiped); the other person KEEPS their device's saved
  // copy (IndexedDB) as the live history of that chat, and can download a
  // .txt backup at any time. A per-account flag records "the other side
  // cleared this chat" so the recovery banner survives reloads.
  function clearedFlags() {
    try { return JSON.parse(localStorage.getItem("veilnet_cleared_" + state.me) || "{}"); } catch (e) { return {}; }
  }
  function isClearedFlagged(convId) { return !!clearedFlags()[convId]; }
  function setClearedFlag(convId) {
    const f = clearedFlags();
    if (f[convId]) return;
    f[convId] = new Date().toISOString(); // ~when the other side's clear reached us
    try { localStorage.setItem("veilnet_cleared_" + state.me, JSON.stringify(f)); } catch (e) {}
  }
  function clearClearedFlag(convId) {
    const f = clearedFlags();
    if (!f[convId]) return;
    delete f[convId];
    try { localStorage.setItem("veilnet_cleared_" + state.me, JSON.stringify(f)); } catch (e) {}
  }
  function clearedAt(convId) { return clearedFlags()[convId] || null; }

  // Post-download removal schedule: after the user downloads their saved
  // copy, it is removed from this device after a grace period.
  const COPY_GRACE_MS = 10 * 60 * 1000;
  function copyRemovalKey(convId) { return "veilnet_copy_rm_" + state.me + "_" + convId; }
  function copyRemovalAt(convId) {
    return parseInt(localStorage.getItem(copyRemovalKey(convId)) || "0", 10) || 0;
  }

  // ---------- bootstrap ----------
  async function bootstrap() {
    const data = await api("bootstrap");
    state.friends = data.friends || [];
    state.incomingRequests = data.incomingRequests || [];
    state.outgoingRequests = data.outgoingRequests || [];
    state.conversations = new Map();
    for (const c of data.conversations || []) {
      // A conversation only appears once it HAS messages. A DM that was just
      // ensured (or fully cleared) has no last message — it must stay out of
      // the panel, and it will not resurrect on refresh either.
      if (!c.last_at) {
        // EXCEPT: one-sided clear. If the other person deleted the chat, this
        // device's saved copy is the user's live history — keep the chat in
        // the panel using the cached last message as the preview.
        try {
          const cached = await cacheGetAll(c.conversation_id);
          const last = cached.length ? cached[cached.length - 1] : null;
          if (!last) continue; // genuinely empty — not a conversation yet
          setClearedFlag(c.conversation_id);
          state.conversations.set(c.conversation_id, {
            id: c.conversation_id, other_id: c.other_id, other: c.other,
            unread: c.unread || 0, last_body: last.body, last_at: last.created_at,
          });
        } catch (e) { /* cache unavailable — treat as empty */ }
        continue;
      }
      state.conversations.set(c.conversation_id, {
        id: c.conversation_id, other_id: c.other_id, other: c.other,
        unread: c.unread || 0, last_body: c.last_body, last_at: c.last_at,
      });
    }
    renderConversationList();
    renderRequests();
    renderFriendList();
    updateNavBadge();
    joinBroadcastChannels();
    notifyNewRequests();
    return data;
  }

  // Transient db_error on load ("Could not load messaging: db_error" for a
  // second, fixed by refreshing) must self-heal: retry with backoff instead
  // of stranding the user on an error line.
  async function bootstrapWithRetry(tries = 4) {
    let lastErr;
    for (let i = 0; i < tries; i++) {
      try {
        return await bootstrap();
      } catch (e) {
        lastErr = e;
        await new Promise((r) => setTimeout(r, 400 * Math.pow(2, i))); // 400ms .. 2.4s
      }
    }
    throw lastErr;
  }

  // ---------- friend requests (same friends system as launcher) ----------
  async function handleRequest(action, friendId) {
    try {
      await api(action, { friend_id: friendId });
      await bootstrapWithRetry();
    } catch (e) {
      alert("Could not " + action + " request: " + e.message);
    }
  }

  function renderRequests() {
    const wrap = $("msgRequestsWrap");
    const box = $("msgRequests");
    const incoming = state.incomingRequests || [];
    const outgoing = state.outgoingRequests || [];
    if (!incoming.length && !outgoing.length) {
      wrap.style.display = "none";
      return;
    }
    wrap.style.display = "";
    let html = "";
    for (const r of incoming) {
      html += '<div class="msg-row msg-request">' +
        '<img src="' + esc(r.user?.pictureUrl || "../assets/default_pfp.png") + '" alt="">' +
        '<div class="mr-main"><div class="mr-name">' + esc(r.user?.username || "Unknown") + '</div>' +
        '<div class="mr-sub">wants to be your friend</div></div>' +
        '<span class="req-actions">' +
        '<button class="btn btn-primary btn-sm" data-act="accept" data-id="' + esc(r.productUserId) + '">Accept</button>' +
        '<button class="btn btn-secondary btn-sm" data-act="decline" data-id="' + esc(r.productUserId) + '">Decline</button>' +
        '</span></div>';
    }
    for (const r of outgoing) {
      html += '<div class="msg-row msg-request">' +
        '<img src="' + esc(r.user?.pictureUrl || "../assets/default_pfp.png") + '" alt="">' +
        '<div class="mr-main"><div class="mr-name">' + esc(r.user?.username || "Unknown") + '</div>' +
        '<div class="mr-sub">request sent — pending</div></div>' +
        '<span class="req-actions">' +
        '<button class="btn btn-secondary btn-sm" data-act="cancel" data-id="' + esc(r.productUserId) + '">Cancel</button>' +
        '</span></div>';
    }
    box.innerHTML = html;
    box.querySelectorAll("button[data-act]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        handleRequest(btn.getAttribute("data-act"), btn.getAttribute("data-id"));
      });
    });
  }

  // ---------- clear conversation (trashcan) ----------
  async function cacheDeleteConv(convId) {
    const db = await cacheDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction("messages", "readwrite");
      const idx = tx.objectStore("messages").index("conv_time");
      const req = idx.openCursor(IDBKeyRange.bound([convId, ""], [convId, "\uffff"]));
      req.onsuccess = () => { const cur = req.result; if (cur) { cur.delete(); cur.continue(); } };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Full history (paged) for the pre-clear .txt backup.
  async function fetchAllMessages(convId) {
    const all = [];
    let before = null;
    for (let i = 0; i < 500; i++) {
      const extra = before ? { conversation_id: convId, before, limit: 100 } : { conversation_id: convId, limit: 100 };
      const r = await api("list", extra);
      const msgs = r.messages || [];
      all.push(...msgs);
      if (msgs.length < 100) break;
      before = msgs[msgs.length - 1].created_at;
    }
    return all.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  }

  function downloadChatBackup(conv, msgs) {
    const who = (senderId) => (senderId === state.me ? "You" : (conv.other?.username || String(senderId).slice(0, 8)));
    const lines = [
      "LatticeVeil — Veilnet chat backup",
      "Conversation: " + (conv.other?.username || "Unknown"),
      "Exported: " + new Date().toLocaleString(),
      "Messages: " + msgs.length,
      "========================================",
      "",
    ];
    for (const m of msgs) {
      const d = new Date(m.created_at);
      lines.push("[" + (isNaN(d) ? m.created_at : d.toLocaleString()) + "] " + who(m.sender_id) + ": " + m.body);
    }
    const blob = new Blob([lines.join("\r\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "veilnet-chat-" + String(conv.other?.username || "chat").replace(/[^a-z0-9_-]+/gi, "_") + "-" + new Date().toISOString().slice(0, 10) + ".txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function clearLocalConversation(convId, note) {
    state.messages.delete(convId);
    state.order.delete(convId);
    cacheDeleteConv(convId).catch(() => {});
    // Remove the conversation row from the panel entirely (the server
    // conversation stays, so the Friends list can reopen a fresh chat).
    const ch = dmChannels.get(convId);
    if (ch) { try { ch.unsubscribe(); } catch (e) {} dmChannels.delete(convId); }
    state.conversations.delete(convId);
    if (state.current === convId) {
      $("msgMsgs").innerHTML = '<div class="small msg-muted" style="padding:12px">' + esc(note || "Chat cleared.") + '</div>';
    }
    renderConversationList();
    updateNavBadge();
  }

  // Remote clear: the OTHER person emptied the chat. The server copy is gone
  // for both, but THIS device still holds its local cache — that is the
  // recovery path: keep it, tell the user, offer a .txt backup download.
  function handleClearedPing(payload) {
    const p = payload || {};
    const convId = p.conversation_id;
    if (!convId) return;
    // My own clear echoed back (e.g. my OTHER device): apply the same
    // one-sided wipe here too — only the deleting account loses the chat.
    if (p.by && state.me && p.by === state.me) {
      clearLocalConversation(convId, "Chat cleared.");
      return;
    }
    // One-sided: the other person cleared THEIR copy. Ours stays as the live
    // history of this chat — download it as a file or delete it from the
    // attached bar in the chat (always visible, no scrolling needed).
    const conv = state.conversations.get(convId);
    if (!conv) return;
    setClearedFlag(convId);
    if (state.current === convId) showClearedBar(conv, convId);
    else showClearedRecoveryModal(conv, convId);
  }

  function downloadCachedBackup(conv, convId) {
    cacheGetAll(convId).then((msgs) => {
      if (!msgs.length) { alert("This device has no cached messages for this chat."); return; }
      downloadChatBackup(conv, msgs);
    }).catch((e) => alert("Backup failed: " + e.message));
  }

  // ---------- attached recovery bar (always visible above the composer) ----------
  let _barTimer = null;
  function hideClearedBar() {
    const bar = $("msgClearedBar");
    if (bar) bar.style.display = "none";
    if (_barTimer) { clearInterval(_barTimer); _barTimer = null; }
  }
  function paintClearedBar(conv, convId) {
    const text = $("msgClearedText");
    if (!text) return;
    let msg = esc(conv?.other?.username || "The other person") + " cleared this chat on their side — your saved copy is ready to download or delete.";
    const rmAt = copyRemovalAt(convId);
    if (rmAt) {
      const mins = Math.max(0, Math.ceil((rmAt - Date.now()) / 60000));
      msg += " Backup saved — your copy will be removed from this device in " + (mins > 0 ? mins + " min" : "under a minute") + ".";
    }
    text.innerHTML = msg;
  }
  function showClearedBar(conv, convId) {
    const bar = $("msgClearedBar");
    if (!bar) return;
    bar.style.display = "flex";
    paintClearedBar(conv, convId);
    if (_barTimer) clearInterval(_barTimer);
    _barTimer = setInterval(() => {
      const rmAt = copyRemovalAt(convId);
      if (rmAt && Date.now() >= rmAt) {
        clearInterval(_barTimer);
        _barTimer = null;
        deleteMyCopy(convId);
        return;
      }
      paintClearedBar(conv, convId);
    }, 15000);
    $("msgClearedDl").onclick = () => requestCopyDownload(conv, convId);
    $("msgClearedDel").onclick = () => requestCopyDelete(conv, convId);
  }

  function copyModal(html) {
    const old = $("msgCopyModal");
    if (old) old.remove();
    const modal = document.createElement("div");
    modal.id = "msgCopyModal";
    modal.className = "msg-modal-backdrop";
    modal.innerHTML = '<div class="msg-modal">' + html + '</div>';
    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });
    return modal;
  }

  function requestCopyDownload(conv, convId) {
    const modal = copyModal(
      '<h3>Download your saved copy?</h3>' +
      '<p class="small msg-muted">The server copy of this chat was already removed when ' + esc(conv?.other?.username || "the other person") + ' cleared it. Downloading saves the whole chat as a .txt file — and once downloaded, your saved copy on this device will be <b>removed in 10 minutes</b>. Download again before then if you need another copy.</p>' +
      '<div class="msg-modal-actions">' +
      '<button class="btn btn-primary btn-sm" id="msgCopyGo">Download (.txt)</button>' +
      '<button class="btn btn-secondary btn-sm" id="msgCopyCancel">Cancel</button>' +
      '</div>'
    );
    modal.querySelector("#msgCopyCancel").addEventListener("click", () => modal.remove());
    modal.querySelector("#msgCopyGo").addEventListener("click", () => {
      modal.remove();
      downloadCachedBackup(conv, convId).then(() => {
        try { localStorage.setItem(copyRemovalKey(convId), String(Date.now() + COPY_GRACE_MS)); } catch (e) {}
        if (state.current === convId) paintClearedBar(conv, convId);
      }).catch(() => {});
    });
  }

  function requestCopyDelete(conv, convId) {
    const modal = copyModal(
      '<h3>Delete your saved copy?</h3>' +
      '<p class="small msg-muted">Messages from before the clear will be removed from THIS DEVICE only. The other person is not affected, and new messages in this chat are not affected.</p>' +
      '<div class="msg-modal-actions">' +
      '<button class="btn btn-sm" id="msgCopyGo" style="background:var(--red);border-color:var(--red);color:#fff">Delete my copy</button>' +
      '<button class="btn btn-secondary btn-sm" id="msgCopyCancel">Cancel</button>' +
      '</div>'
    );
    modal.querySelector("#msgCopyCancel").addEventListener("click", () => modal.remove());
    modal.querySelector("#msgCopyGo").addEventListener("click", () => {
      modal.remove();
      deleteMyCopy(convId);
    });
  }

  async function cacheDeleteConvBefore(convId, isoBefore) {
    const db = await cacheDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction("messages", "readwrite");
      const idx = tx.objectStore("messages").index("conv_time");
      const req = idx.openCursor(IDBKeyRange.bound([convId, ""], [convId, isoBefore]));
      req.onsuccess = () => { const cur = req.result; if (cur) { cur.delete(); cur.continue(); } };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Remove THIS user's saved copy of the pre-clear history (local only —
  // the server copy is already gone and the other person is unaffected).
  // Messages sent AFTER the clear are live server messages and stay.
  async function deleteMyCopy(convId) {
    const at = clearedAt(convId) || new Date().toISOString();
    try { await cacheDeleteConvBefore(convId, at); } catch (e) { /* keep going */ }
    const map = state.messages.get(convId);
    if (map) {
      for (const [id, m] of Array.from(map)) {
        if (m && m.created_at && String(m.created_at) < at && !String(m.id).startsWith("pending-")) map.delete(id);
      }
      const kept = (state.order.get(convId) || []).filter((m) => !(m.created_at && String(m.created_at) < at));
      state.order.set(convId, kept);
    }
    clearClearedFlag(convId);
    try { localStorage.removeItem(copyRemovalKey(convId)); } catch (e) {}
    hideClearedBar();
    const order = state.order.get(convId) || [];
    const conv = state.conversations.get(convId);
    if (conv) {
      const lastM = order.length ? order[order.length - 1] : null;
      conv.last_body = lastM ? lastM.body : null;
      conv.last_at = lastM ? lastM.created_at : null;
    }
    if (state.current === convId) {
      renderMessages();
      if (!order.length) {
        $("msgMsgs").innerHTML = '<div class="small msg-muted" style="padding:12px">Your saved copy was deleted. New messages will appear here.</div>';
      }
    }
    renderConversationList();
    updateNavBadge();
  }

  // On load: if a downloaded copy's grace period already elapsed while the
  // page was closed, finish the removal now.
  function processCopyRemovals() {
    if (!state.me) return;
    const prefix = "veilnet_copy_rm_" + state.me + "_";
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf(prefix) === 0) {
        const convId = k.slice(prefix.length);
        const rmAt = parseInt(localStorage.getItem(k) || "0", 10) || 0;
        if (rmAt && Date.now() >= rmAt) deleteMyCopy(convId);
      }
    }
  }

  function showClearedRecoveryModal(conv, convId) {
    const old = $("msgClearedModal");
    if (old) old.remove();
    const modal = document.createElement("div");
    modal.id = "msgClearedModal";
    modal.className = "msg-modal-backdrop";
    modal.innerHTML =
      '<div class="msg-modal">' +
      '<h3>Chat cleared</h3>' +
      '<p class="small msg-muted">' + esc(conv.other?.username || "The other person") + ' cleared this chat on their side. Your full copy of the history is saved on this device — you can keep chatting here, and download or delete your copy any time from the bar attached to this chat.</p>' +
      '<div class="msg-modal-actions">' +
      '<button class="btn btn-primary btn-sm" id="msgRecDl">Download backup (.txt)</button>' +
      '<button class="btn btn-secondary btn-sm" id="msgRecClose">Close</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(modal);
    modal.querySelector("#msgRecClose").addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });
    modal.querySelector("#msgRecDl").addEventListener("click", () => downloadCachedBackup(conv, convId));
  }

  async function doClearConversation(convId) {
    try {
      await api("clear", { conversation_id: convId });
      clearClearedFlag(convId);
      clearLocalConversation(convId, "Chat cleared.");
    } catch (e) {
      alert("Could not clear conversation: " + e.message);
    }
  }

  function showClearConfirm(convId) {
    const conv = state.conversations.get(convId);
    if (!conv) return;
    const old = $("msgClearModal");
    if (old) old.remove();
    const modal = document.createElement("div");
    modal.id = "msgClearModal";
    modal.className = "msg-modal-backdrop";
    modal.innerHTML =
      '<div class="msg-modal">' +
      '<h3>Clear chat with ' + esc(conv.other?.username || "this person") + '?</h3>' +
      '<div class="msg-modal-warn">MESSAGES IN THIS CHAT CANNOT BE RECOVERED</div>' +
      '<p class="small msg-muted">Clearing deletes the messages for YOU — ' + esc(conv.other?.username || "the other person") + ' keeps their copy, and server storage is freed. Want to keep yours? Download the backup first — it saves the whole chat as a .txt file.</p>' +
      '<div class="msg-modal-actions">' +
      '<button class="btn btn-secondary btn-sm" id="msgClearBackup">Download backup (.txt)</button>' +
      '<button class="btn btn-secondary btn-sm" id="msgClearCancel">Cancel</button>' +
      '<button class="btn btn-sm" id="msgClearGo" style="background:var(--red);border-color:var(--red);color:#fff">Clear chat</button>' +
      '</div>' +
      '<div class="small msg-muted" id="msgClearStatus" style="margin-top:8px"></div>' +
      '</div>';
    document.body.appendChild(modal);
    const status = modal.querySelector("#msgClearStatus");
    modal.querySelector("#msgClearCancel").addEventListener("click", () => modal.remove());
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });
    modal.querySelector("#msgClearBackup").addEventListener("click", async () => {
      status.textContent = "Building backup…";
      try {
        const msgs = await fetchAllMessages(convId);
        if (!msgs.length) { status.textContent = "Nothing to back up — this chat is empty."; return; }
        downloadChatBackup(conv, msgs);
        status.textContent = "Backup downloaded (" + msgs.length + " messages). You can now clear safely.";
      } catch (e) {
        status.textContent = "Backup failed: " + e.message + " — nothing was deleted.";
      }
    });
    modal.querySelector("#msgClearGo").addEventListener("click", async () => {
      const go = modal.querySelector("#msgClearGo");
      go.disabled = true;
      go.textContent = "Clearing…";
      await doClearConversation(convId);
      modal.remove();
    });
  }

  // ---------- sound ----------
  // The ping lives in veilnet.js (window.VeilnetPing): one shared
  // AudioContext kept resumed by user gestures. A fresh context per ping was
  // staying "suspended" on desktop autoplay policies — the sound never played.
  function playPing() {
    if (!state.sound) return;
    if (window.VeilnetPing) window.VeilnetPing.play();
  }
  function maybeNotify(msg) {
    if (msg.sender_id === state.me) return;
    // IMPORTANT: sound/badge dedupe must be separate from processedIds.
    // mergeMessages marks processedIds BEFORE this runs (applyIncoming →
    // merge → maybeNotify), so checking processedIds here swallowed BOTH the
    // ping and the live unread badge for every real message.
    if (state.notifiedIds.has(msg.id)) return;
    state.notifiedIds.add(msg.id);
    // Messages that arrived BEFORE this page load were already counted by
    // bootstrap (server truth) — never replay their ping on load/refresh.
    if (msg.created_at && new Date(msg.created_at).getTime() < state.sessionStart - 15000) return;
    // Cross-tab + reload dedupe: if another tab (or an earlier page view)
    // already pinged this message, stay silent.
    if (window.VeilnetNotify) {
      if (window.VeilnetNotify.hasSeen(msg.id)) return;
      window.VeilnetNotify.markSeen(msg.id);
    }
    // In the open chat with the tab visible: silent, no unread (it is being
    // read right now). Anywhere else: ping + unread badge immediately.
    if (state.current === msg.conversation_id && !document.hidden) return;
    playPing();
    bumpUnread(msg.conversation_id, 1);
  }

  // ---------- unread / badges ----------
  function bumpUnread(convId, delta) {
    const c = state.conversations.get(convId);
    if (!c) return;
    c.unread = Math.max(0, (c.unread || 0) + delta);
    renderConversationList();
    updateNavBadge();
  }
  function totalUnread() {
    let t = 0;
    for (const c of state.conversations.values()) t += c.unread || 0;
    return t;
  }
  function updateNavBadge() {
    const n = totalUnread();
    // Keep the global (all-pages) unread counter in sync: bootstrap sets it
    // to server truth, reads and new messages adjust it from here.
    if (window.VeilnetNotify) window.VeilnetNotify.setCount(n);
    const el = $("vnUnreadBadgeMessages");
    if (!el) return;
    el.textContent = n > 99 ? "99+" : String(n);
    el.classList.toggle("vn-badge--hidden", n === 0);
  }

  // ---------- rendering: lists ----------
  function renderConversationList() {
    const box = $("msgConvos");
    const items = Array.from(state.conversations.values())
      .filter((c) => c.last_at) // empty/cleared chats never render
      .sort((a, b) => String(b.last_at || "").localeCompare(String(a.last_at || "")));
    if (!items.length) {
      box.innerHTML = '<div class="small msg-muted">No conversations yet — pick a friend below.</div>';
      return;
    }
    box.innerHTML = items.map((c) => {
      const active = c.id === state.current ? " active" : "";
      const sub = esc(c.last_body || "Say hi!");
      const unread = c.unread ? '<span class="unread-pill">' + Math.min(c.unread, 99) + "</span>" : "";
      return '<div class="msg-row' + active + '" data-conv="' + c.id + '">' +
        '<img src="' + esc(c.other?.pictureUrl || "../assets/default_pfp.png") + '" alt="">' +
        '<div class="mr-main"><div class="mr-name">' + esc(c.other?.username || "Unknown") + '</div>' +
        '<div class="mr-sub">' + sub + '</div></div>' + unread +
        '<button class="conv-clear" title="Clear conversation (deletes messages for both of you)" data-clear="' + c.id + '" aria-label="Clear conversation">' + TRASH_SVG + '</button>' +
        '</div>';
    }).join("");
    box.querySelectorAll(".msg-row").forEach((el) => {
      el.addEventListener("click", () => openConversation(el.getAttribute("data-conv")));
    });
    box.querySelectorAll("button[data-clear]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        showClearConfirm(btn.getAttribute("data-clear"));
      });
    });
  }

  function renderFriendList() {
    const box = $("msgFriends");
    if (!state.friends.length) {
      box.innerHTML = '<div class="small msg-muted">No friends yet — add friends from the launcher.</div>';
      return;
    }
    box.innerHTML = state.friends.map((f) => {
      const conv = Array.from(state.conversations.values()).find((c) => c.other_id === f.productUserId && c.last_at);
      return '<div class="msg-row" data-friend="' + f.productUserId + '">' +
        '<img src="' + esc(f.pictureUrl || "../assets/default_pfp.png") + '" alt="">' +
        '<div class="mr-main"><div class="mr-name">' + esc(f.username) + '</div>' +
        '<div class="mr-sub">' + (conv ? "conversation" : "start chatting") + '</div></div>' +
        '<a class="friend-profile" href="/veilnet/profile/?u=' + encodeURIComponent(f.username || "") + '" title="View profile" aria-label="View profile">' + PERSON_SVG + '</a>' +
        '<a class="friend-acc" href="/veilnet/accomplishments/?u=' + encodeURIComponent(f.username || "") + '" title="View accomplishments" aria-label="View accomplishments">' + ACC_SVG + '</a>' +
        '</div>';
    }).join("");
    box.querySelectorAll(".msg-row").forEach((el) => {
      el.addEventListener("click", () => openWithFriend(el.getAttribute("data-friend")));
    });
    box.querySelectorAll("a.friend-acc, a.friend-profile").forEach((el) => {
      el.addEventListener("click", (e) => e.stopPropagation());
    });
  }

  // ---------- incoming friend-request popups ----------
  function reqSeenList() {
    try { return JSON.parse(localStorage.getItem("veilnet_reqs_seen_" + state.me) || "[]"); } catch (e) { return []; }
  }
  function notifyNewRequests() {
    const seen = new Set(reqSeenList());
    const fresh = (state.incomingRequests || []).filter((r) => !seen.has(r.productUserId));
    if (!fresh.length) return;
    for (const r of fresh) seen.add(r.productUserId);
    try { localStorage.setItem("veilnet_reqs_seen_" + state.me, JSON.stringify(Array.from(seen))); } catch (e) {}
    for (const r of fresh) showRequestToast(r);
  }
  function showRequestToast(r) {
    let stack = document.getElementById("msgReqToastStack");
    if (!stack) {
      stack = document.createElement("div");
      stack.id = "msgReqToastStack";
      document.body.appendChild(stack);
    }
    const t = document.createElement("div");
    t.className = "msg-req-toast";
    t.innerHTML =
      '<div class="mrt-text"><b>' + esc(r.user?.username || "Someone") + '</b> sent you a friend request.</div>' +
      '<div class="mrt-actions">' +
      '<button class="btn btn-primary btn-sm" data-a="accept">Accept</button>' +
      '<button class="btn btn-secondary btn-sm" data-a="decline">Decline</button>' +
      '</div>';
    stack.appendChild(t);
    t.querySelectorAll("button").forEach((b) => {
      b.addEventListener("click", async () => {
        t.remove();
        await handleRequest(b.getAttribute("data-a"), r.productUserId);
      });
    });
  }

  // ---------- open conversation ----------
  // Clicking a friend NEVER creates a conversation. If one with messages
  // exists, open it; otherwise open a DRAFT chat — the server conversation is
  // only created the moment the first message is actually sent.
  function openWithFriend(friendId) {
    const friend = state.friends.find((f) => f.productUserId === friendId);
    if (!friend) return;
    const conv = Array.from(state.conversations.values()).find((c) => c.other_id === friendId && c.last_at);
    if (conv) { openConversation(conv.id); return; }
    state.draftFriend = friend;
    state.current = null;
    renderConversationList();
    $("msgChatEmpty").style.display = "none";
    $("msgChat").style.display = "flex";
    $("msgOlder").style.display = "none";
    $("msgChatName").textContent = friend.username || "Unknown";
    $("msgChatStatus").textContent = "new chat";
    $("msgChatAvatar").src = friend.pictureUrl || "../assets/default_pfp.png";
    $("msgMsgs").innerHTML = '<div class="small msg-muted" style="padding:12px">No messages yet — say hi!</div>';
  }

  async function openConversation(convId) {
    const conv = state.conversations.get(convId);
    if (!conv) return;
    state.current = convId;
    hideClearedBar();
    renderConversationList();

    $("msgChatEmpty").style.display = "none";
    $("msgChat").style.display = "flex";
    $("msgChatName").textContent = conv.other?.username || "Unknown";
    $("msgChatStatus").textContent = "private conversation";
    $("msgChatAvatar").src = conv.other?.pictureUrl || "../assets/default_pfp.png";

    const box = $("msgMsgs");
    box.innerHTML = '<div class="small msg-muted" style="padding:12px">Loading…</div>';

    // 1) instant paint from IndexedDB cache
    const cached = await cacheGetAll(convId);
    mergeMessages(convId, cached);
    renderMessages();

    // 2) reconcile: only messages newer than the newest cached
    const order = state.order.get(convId) || [];
    const newest = order.length ? order[order.length - 1] : null;
    try {
      const after = newest ? newest.created_at : undefined;
      const r = await api("list", after ? { conversation_id: convId, after, limit: PAGE } : { conversation_id: convId, limit: PAGE });
      const fresh = mergeMessages(convId, r.messages);
      await cachePut(r.messages || []);
      if (fresh.length || order.length) renderMessages();
      for (const m of r.messages || []) maybeNotify(m);
    } catch (e) {
      const note = document.createElement("div");
      note.className = "small msg-muted";
      note.style.padding = "8px 12px";
      note.textContent = "Offline — showing cached messages (" + e.message + ")";
      box.prepend(note);
    }

    // 3) mark read — retry once: a transient failure here left the unread
    // pill alive and replayed pings on every refresh.
    try {
      await api("read", { conversation_id: convId });
    } catch (e) {
      await new Promise((r) => setTimeout(r, 800));
      try { await api("read", { conversation_id: convId }); } catch (e2) {}
    }
    conv.unread = 0;
    renderConversationList();
    updateNavBadge();
    // One-sided clear: if the other person cleared this chat, surface the
    // attached recovery bar every time they open it (always visible above
    // the composer — no scrolling needed).
    if (isClearedFlagged(convId) && (state.order.get(convId) || []).length) {
      showClearedBar(conv, convId);
    } else {
      hideClearedBar();
    }
    scrollToBottom();
  }

  // ---------- chat rendering ----------
  function renderMessages() {
    const convId = state.current;
    if (!convId) return;
    const box = $("msgMsgs");
    const keepOlder = $("msgOlder");
    box.innerHTML = "";
    const order = state.order.get(convId) || [];
    const canLoadOlder = order.length >= PAGE;
    keepOlder.style.display = canLoadOlder ? "" : "none";

    let lastDay = "";
    for (const m of order) {
      const day = dayStr(m.created_at);
      if (day && day !== lastDay) {
        lastDay = day;
        const dl = document.createElement("div");
        dl.className = "msg-day";
        dl.textContent = day;
        box.appendChild(dl);
      }
      const mine = m.sender_id === state.me;
      const div = document.createElement("div");
      div.className = "msg" + (mine ? " me" : "") + (m._pending ? " pending" : "") + (m._failed ? " msg-failed" : "");
      div.setAttribute("data-id", m.id);
      div.innerHTML = '<div class="meta">' + (mine ? "You" : esc(senderName(convId, m.sender_id))) + " · " + timeStr(m.created_at) + '</div>' +
        '<div class="msg-bubble">' + esc(m.body) + '<span class="msg-time">' + (m._failed ? "failed" : m._pending ? "sending…" : "") + '</span></div>';
      box.appendChild(div);
    }
  }

  function senderName(convId, senderId) {
    const conv = state.conversations.get(convId);
    if (conv && conv.other_id === senderId) return conv.other?.username || "Friend";
    return "You";
  }

  function scrollToBottom() {
    const box = $("msgMsgs");
    box.scrollTop = box.scrollHeight;
  }

  async function loadOlder() {
    const convId = state.current;
    if (!convId || state.loadingOlder) return;
    const order = state.order.get(convId) || [];
    if (!order.length) return;
    state.loadingOlder = true;
    try {
      const oldest = order[0];
      const r = await api("list", { conversation_id: convId, before: oldest.created_at, limit: PAGE });
      mergeMessages(convId, r.messages);
      await cachePut(r.messages || []);
      const box = $("msgMsgs");
      const prevHeight = box.scrollHeight;
      renderMessages();
      box.scrollTop = box.scrollHeight - prevHeight;
    } catch (e) {
      alert("Could not load older messages: " + e.message);
    } finally {
      state.loadingOlder = false;
    }
  }

  // ---------- send ----------
  async function sendMessage() {
    const input = $("msgInput");
    const text = (input.value || "").trim();
    if (!text) return;
    let convId = state.current;
    // Draft chat: NOW the server conversation gets created (first real send).
    if (!convId && state.draftFriend) {
      try {
        const r = await api("ensure", { friend_id: state.draftFriend.productUserId });
        convId = r.conversation_id;
        state.conversations.set(convId, {
          id: convId, other_id: state.draftFriend.productUserId, other: state.draftFriend,
          unread: 0, last_at: null, last_body: null,
        });
        joinBroadcastChannels();
        state.current = convId;
      } catch (e) {
        alert("Could not start conversation: " + e.message);
        return;
      } finally {
        state.draftFriend = null;
      }
    }
    if (!convId || state.sending.has(convId)) return;
    input.value = "";

    const tempId = "pending-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    const pending = { id: tempId, conversation_id: convId, sender_id: state.me, body: text, created_at: new Date().toISOString(), _pending: true };
    mergeMessages(convId, [pending]);
    renderMessages();
    scrollToBottom();
    state.sending.add(convId);

    try {
      const r = await api("send", { conversation_id: convId, body: text });
      const map = convMessages(convId);
      map.delete(tempId);
      const order = state.order.get(convId);
      const oi = order.findIndex((m) => m.id === tempId);
      if (oi >= 0) order.splice(oi, 1);
      mergeMessages(convId, [r.message]);
      await cachePut([r.message]);
      state.processedIds.add(r.message.id);
      renderMessages();
      scrollToBottom();
      const conv = state.conversations.get(convId);
      if (conv) { conv.last_body = r.message.body; conv.last_at = r.message.created_at; renderConversationList(); }
      broadcastPing(convId, r.message);
    } catch (e) {
      const map = convMessages(convId);
      const pm = map.get(tempId);
      if (pm) { pm._pending = false; pm._failed = true; }
      renderMessages();
      alert("Message not sent (" + e.message + "). It was NOT delivered.");
    } finally {
      state.sending.delete(convId);
    }
  }

  async function fetchMessageById(messageId) {
    const { data, error } = await client.from("messages").select("id, conversation_id, sender_id, body, created_at").eq("id", messageId).maybeSingle();
    if (error) throw error;
    return data;
  }

  // ---------- realtime ----------
  function setConnState(s) {
    state.connState = s;
    const el = $("msgConnState");
    el.className = "conn-state conn-" + (s === "on" ? "on" : s === "wait" ? "wait" : "off");
    el.textContent = s === "on" ? "Live" : s === "wait" ? "Reconnecting…" : "Offline";
  }

  // Launcher clients broadcast pings on per-conversation topics
  // ("veilnet-dm:<convId>"). Join one channel per conversation so
  // launcher -> website delivery never depends on postgres_changes.
  const dmChannels = new Map(); // convId -> channel
  function ensureDmChannel(convId) {
    if (dmChannels.has(convId)) return;
    const ch = client.channel("veilnet-dm:" + convId, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "new-message" }, (msg) => {
      // supabase-js delivers the wrapper {type, event, payload}; the ping
      // fields live in .payload (verified against the raw server frames).
      handleRemotePing((msg && msg.payload) || msg);
    });
    ch.on("broadcast", { event: "conversation-cleared" }, (msg) => {
      handleClearedPing((msg && msg.payload) || msg);
    });
    ch.subscribe();
    dmChannels.set(convId, ch);
  }

  function joinBroadcastChannels() {
    if (!state.channel) return;
    for (const convId of state.conversations.keys()) {
      ensureDmChannel(convId);
    }
  }

  async function broadcastPing(convId, message) {
    if (!state.channel) return;
    // A socket that just recovered (e.g. phone un-suspended) can race the
    // first send; give it up to 3s to (re)join, then retry briefly.
    const started = Date.now();
    while (state.channel && state.channel.state !== "joined" && Date.now() - started < 3000) {
      await new Promise((r) => setTimeout(r, 150));
    }
    if (!state.channel) return;
    const frame = {
      type: "broadcast",
      event: "new-message",
      payload: { type: "new-message", conversation_id: convId, message_id: message.id, sender_id: message.sender_id },
    };
    const attempt = (tries) => {
      state.channel.send(frame).then((r) => {
        if ((!r || r.status !== "ok") && tries > 0) setTimeout(() => attempt(tries - 1), 600);
      }).catch(() => { if (tries > 0) setTimeout(() => attempt(tries - 1), 600); });
    };
    attempt(2);
  }

  // Shared delivery path for postgres_changes rows and broadcast pings.
  // If the conversation is unknown (first message from a new friend),
  // re-bootstrap once to discover it instead of dropping the message.
  async function applyIncoming(convId, msg) {
    if (!state.conversations.has(convId)) {
      await bootstrap();
      joinBroadcastChannels();
      if (!state.conversations.has(convId)) return;
    }
    const fresh = mergeMessages(convId, [msg]);
    if (fresh.length) await cachePut([msg]);
    const conv = state.conversations.get(convId);
    if (conv) { conv.last_body = msg.body; conv.last_at = msg.created_at; }
    if (state.current === convId) {
      renderMessages();
      scrollToBottom();
      if (!document.hidden) {
        try { await api("read", { conversation_id: convId }); } catch (e) {}
      }
    }
    // Unread badge + ping are owned by maybeNotify (handles hidden tabs and
    // other conversations correctly — the old else-branch double-counted).
    maybeNotify(msg);
    renderConversationList();
    updateNavBadge();
  }

  async function handleRemotePing(payload) {
    try {
      const convId = payload.conversation_id;
      const messageId = payload.message_id;
      if (!convId || !messageId || state.processedIds.has(messageId)) return;
      if (!state.conversations.has(convId)) {
        await bootstrap();
        joinBroadcastChannels();
      }
      const msg = await fetchMessageById(messageId);
      if (!msg) return; // RLS hid it (or deleted) — ignore
      await applyIncoming(convId, msg);
    } catch (e) { /* transient — reconnect reconcile will cover it */ }
  }

  // Live delivery is the contract: if the channel drops, re-subscribe with
  // backoff instead of silently going stale until a manual page refresh.
  function scheduleResubscribe() {
    if (state._resubTimer) return;
    state._resubDelay = Math.min((state._resubDelay || 1000) * 2, 15000);
    state._resubTimer = setTimeout(() => {
      state._resubTimer = null;
      try { subscribeRealtime(); } catch (e) { console.warn("[msgs] resubscribe failed", e); scheduleResubscribe(); }
    }, state._resubDelay);
  }

  function subscribeRealtime() {
    if (state._resubTimer) { clearTimeout(state._resubTimer); state._resubTimer = null; }
    teardownPgChannel();
    if (state.channel) { try { state.channel.unsubscribe(); } catch (e) {} }
    state._broadcastTopics = new Set();
    const ch = client.channel("veilnet-msgs-live", { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "new-message" }, (msg) => {
      // supabase-js delivers the wrapper {type, event, payload}; the ping
      // fields live in .payload (verified against the raw server frames).
      handleRemotePing((msg && msg.payload) || msg);
    });
    ch.on("broadcast", { event: "conversation-cleared" }, (msg) => {
      handleClearedPing((msg && msg.payload) || msg);
    });
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        state._resubDelay = 1000;
        setConnState("on");
        joinBroadcastChannels();
        reconcile();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn("[msgs] realtime status:", status);
        setConnState("off");
        scheduleResubscribe();
      } else if (status === "CLOSED") {
        setConnState("wait");
        scheduleResubscribe();
      }
    });
    state.channel = ch;

    // Opportunistic second path: postgres_changes delivers the full row with
    // no refetch, but only when the subscriber JWT authorizes. It runs on its
    // OWN channel so a failed postgres_changes join can never take the
    // broadcast-only live channel down with it.
    const pg = client.channel("veilnet-msgs-pg");
    pg.on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
      const m = payload.new;
      if (!m) return;
      applyIncoming(m.conversation_id, m).catch(() => {});
    });
    pg.subscribe((status) => {
      if (status !== "SUBSCRIBED") console.warn("[msgs] pg channel status:", status);
      // No manual resubscribe needed: supabase-js re-joins automatically, and
      // the live broadcast channel above is the guaranteed path.
    });
    state.pgChannel = pg;
  }

  function teardownPgChannel() {
    if (state.pgChannel) { try { state.pgChannel.unsubscribe(); } catch (e) {} state.pgChannel = null; }
  }

  async function reconcile() {
    // Reconnect reconciliation: newest locally-known message -> fetch newer.
    try {
      for (const convId of state.conversations.keys()) {
        const order = state.order.get(convId) || [];
        const newest = order.length ? order[order.length - 1] : null;
        const r = newest
          ? await api("list", { conversation_id: convId, after: newest.created_at, limit: PAGE })
          : await api("list", { conversation_id: convId, limit: PAGE });
        const fresh = mergeMessages(convId, r.messages);
        if (fresh.length) {
          await cachePut(r.messages || []);
          if (state.current === convId) { renderMessages(); scrollToBottom(); }
          for (const m of fresh) maybeNotify(m);
          const conv = state.conversations.get(convId);
          if (conv && fresh.length) {
            const lastM = r.messages[r.messages.length - 1];
            conv.last_body = lastM.body; conv.last_at = lastM.created_at;
          }
        }
      }
      renderConversationList();
      updateNavBadge();
    } catch (e) { /* offline — next reconnect retries */ }
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && state.current) {
      api("read", { conversation_id: state.current }).catch(() => {});
      const conv = state.conversations.get(state.current);
      if (conv) { conv.unread = 0; renderConversationList(); updateNavBadge(); }
    }
    // Phones suspend websockets when the tab is backgrounded. Returning to
    // the tab: resubscribe immediately instead of waiting out the backoff,
    // then catch up on anything missed.
    if (!document.hidden && state.me) {
      if (!state.channel || state.connState !== "on") {
        state._resubDelay = 1000;
        try { subscribeRealtime(); } catch (e) {}
      }
      reconcile().catch(() => {});
    }
  });

  // ---------- auth / wiring ----------
  async function wipeAndReset() {
    await cacheWipeAll();
    teardownPgChannel();
    if (state.channel) { try { state.channel.unsubscribe(); } catch (e) {} }
    state.channel = null;
    for (const ch of dmChannels.values()) { try { ch.unsubscribe(); } catch (e) {} }
    dmChannels.clear();
    if (state._resubTimer) { clearTimeout(state._resubTimer); state._resubTimer = null; }
    state.me = null; state.friends = []; state.conversations = new Map();
    state.messages = new Map(); state.order = new Map(); state.current = null;
    state.draftFriend = null;
    state.processedIds = new Set(); state.notifiedIds = new Set(); state._broadcastTopics = new Set();
  }

  function wireUI() {
    $("msgLoginBtn").addEventListener("click", async () => {
      // Use the same proven login modal as the header dropdown (real GIS
      // button + username setup). VeilnetAuth.signInWithGoogle() relies on
      // One Tap prompt(), which mobile browsers silently skip — its fallback
      // renders into a detached div, so nothing appears on screen.
      if (typeof window.__openVeilnetLoginModal === "function") {
        window.__openVeilnetLoginModal();
        return;
      }
      const res = await VeilnetAuth.signInWithGoogle();
      if (res?.error) alert("Login failed: " + res.error.message);
    });
    $("msgSendBtn").addEventListener("click", sendMessage);
    $("msgInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    $("msgOlderBtn").addEventListener("click", loadOlder);
    $("msgRefreshBtn").addEventListener("click", () => reconcile().then(() => bootstrap()).catch(() => {}));
    const soundBtn = $("msgSoundBtn");
    const paintSound = () => { soundBtn.textContent = "Sound: " + (state.sound ? "ON" : "OFF"); };
    paintSound();
    soundBtn.addEventListener("click", () => {
      state.sound = !state.sound;
      localStorage.setItem("veilnet_msg_sound", state.sound ? "on" : "off");
      paintSound();
    });
  }

  async function start() {
    const user = await VeilnetAuth.getUser();
    if (!user) {
      $("msgGate").style.display = "";
      $("msgApp").style.display = "none";
      return;
    }
    $("msgGate").style.display = "none";
    $("msgApp").style.display = "";
    state.me = user.id;

    try {
      await bootstrapWithRetry();
      subscribeRealtime();
      processCopyRemovals();
    } catch (e) {
      $("msgConvos").innerHTML = '<div class="small msg-muted">Could not load messaging: ' + esc(e.message) + ' — <button class="btn btn-secondary btn-sm" id="msgRetryBtn">Retry</button></div>';
      const retryBtn = $("msgRetryBtn");
      if (retryBtn) retryBtn.addEventListener("click", () => start());
    }
  }

  // Safety net: realtime is the primary delivery path. This light catch-up
  // runs every 12s only while the tab is visible and uses the incremental
  // "after" cursor (a few hundred bytes per conversation) so even if a live
  // frame is missed, a message can never be more than ~12s late — and it
  // never meaningfully touches the Supabase free-tier quota.
  setInterval(() => {
    if (!document.hidden && state.me && state.conversations.size) reconcile().catch(() => {});
  }, 12000);

  // Logout: wipe this account's cache and reset in-memory state.
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-veil-logout]");
    if (el) wipeAndReset().then(() => location.reload());
  });

  wireUI();
  start();
})();

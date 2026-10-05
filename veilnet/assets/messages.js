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

  const state = {
    me: null,                 // auth user id
    friends: [],              // [{productUserId, username, pictureUrl}]
    conversations: new Map(), // conversation_id -> {id, other_id, other, unread, last_*}
    messages: new Map(),      // conversation_id -> Map(id -> message)
    order: new Map(),         // conversation_id -> [ids sorted by created_at]
    current: null,            // conversation_id being viewed
    processedIds: new Set(),  // message ids already seen (sound dedupe)
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

  // ---------- bootstrap ----------
  async function bootstrap() {
    const data = await api("bootstrap");
    state.friends = data.friends || [];
    state.conversations = new Map();
    for (const c of data.conversations || []) {
      state.conversations.set(c.conversation_id, {
        id: c.conversation_id, other_id: c.other_id, other: c.other,
        unread: c.unread || 0, last_body: c.last_body, last_at: c.last_at,
      });
    }
    renderConversationList();
    renderFriendList();
    updateNavBadge();
    joinBroadcastChannels();
    return data;
  }

  // ---------- sound ----------
  function playPing() {
    if (!state.sound) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine"; o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      o.start(); o.stop(ctx.currentTime + 0.4);
      setTimeout(() => ctx.close(), 600);
    } catch (e) { /* audio unavailable — silent */ }
  }
  function maybeNotify(msg) {
    if (msg.sender_id === state.me) return;
    if (state.processedIds.has(msg.id)) return;
    state.processedIds.add(msg.id);
    const viewing = state.current === msg.conversation_id && !document.hidden;
    if (!viewing) playPing();
    bumpUnread(msg.conversation_id, viewing ? 0 : 1);
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
    const el = $("vnUnreadBadgeMessages");
    const n = totalUnread();
    if (!el) return;
    el.textContent = n > 99 ? "99+" : String(n);
    el.classList.toggle("vn-badge--hidden", n === 0);
  }

  // ---------- rendering: lists ----------
  function renderConversationList() {
    const box = $("msgConvos");
    const items = Array.from(state.conversations.values())
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
        '<div class="mr-sub">' + sub + '</div></div>' + unread + '</div>';
    }).join("");
    box.querySelectorAll(".msg-row").forEach((el) => {
      el.addEventListener("click", () => openConversation(el.getAttribute("data-conv")));
    });
  }

  function renderFriendList() {
    const box = $("msgFriends");
    if (!state.friends.length) {
      box.innerHTML = '<div class="small msg-muted">No friends yet — add friends from the launcher.</div>';
      return;
    }
    box.innerHTML = state.friends.map((f) => {
      const conv = Array.from(state.conversations.values()).find((c) => c.other_id === f.productUserId);
      return '<div class="msg-row" data-friend="' + f.productUserId + '">' +
        '<img src="' + esc(f.pictureUrl || "../assets/default_pfp.png") + '" alt="">' +
        '<div class="mr-main"><div class="mr-name">' + esc(f.username) + '</div>' +
        '<div class="mr-sub">' + (conv ? "conversation" : "start chatting") + '</div></div></div>';
    }).join("");
    box.querySelectorAll(".msg-row").forEach((el) => {
      el.addEventListener("click", () => openWithFriend(el.getAttribute("data-friend")));
    });
  }

  // ---------- open conversation ----------
  async function openWithFriend(friendId) {
    let conv = Array.from(state.conversations.values()).find((c) => c.other_id === friendId);
    if (!conv) {
      try {
        const r = await api("ensure", { friend_id: friendId });
        const friend = state.friends.find((f) => f.productUserId === friendId);
        conv = { id: r.conversation_id, other_id: friendId, other: friend, unread: 0, last_at: null, last_body: null };
        state.conversations.set(conv.id, conv);
        joinBroadcastChannels();
      } catch (e) {
        alert("Could not open conversation: " + e.message);
        return;
      }
    }
    openConversation(conv.id);
  }

  async function openConversation(convId) {
    const conv = state.conversations.get(convId);
    if (!conv) return;
    state.current = convId;
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

    // 3) mark read
    try { await api("read", { conversation_id: convId }); } catch (e) {}
    conv.unread = 0;
    renderConversationList();
    updateNavBadge();
    scrollToBottom();
  }

  // ---------- chat rendering ----------
  function renderMessages() {
    const convId = state.current;
    if (!convId) return;
    const box = $("msgMsgs");
    const keepOlder = $("msgOlder");
    box.innerHTML = "";
    box.appendChild(keepOlder);
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
    const convId = state.current;
    if (!convId || state.sending.has(convId)) return;
    const input = $("msgInput");
    const text = (input.value || "").trim();
    if (!text) return;
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

  function joinBroadcastChannels() {
    if (!state.channel) return;
    for (const convId of state.conversations.keys()) {
      const topic = "veilnet-dm:" + convId;
      if (state.channel.topic === topic || state._broadcastTopics?.has(topic)) continue;
      state._broadcastTopics.add(topic);
      state.channel.on("broadcast", { event: "new-message" }, (payload) => {
        handleRemotePing(payload);
      });
    }
  }

  function broadcastPing(convId, message) {
    if (!state.channel) return;
    state.channel.send({
      type: "broadcast",
      event: "new-message",
      payload: { type: "new-message", conversation_id: convId, message_id: message.id, sender_id: message.sender_id },
    }).catch(() => {});
  }

  async function handleRemotePing(payload) {
    try {
      const convId = payload.conversation_id;
      const messageId = payload.message_id;
      if (!convId || !messageId || state.processedIds.has(messageId)) return;
      if (!state.conversations.has(convId)) return;
      const msg = await fetchMessageById(messageId);
      if (!msg) return; // RLS hid it (or deleted) — ignore
      mergeMessages(convId, [msg]);
      await cachePut([msg]);
      const conv = state.conversations.get(convId);
      if (conv) { conv.last_body = msg.body; conv.last_at = msg.created_at; }
      if (state.current === convId) {
        renderMessages();
        scrollToBottom();
        if (!document.hidden) {
          try { await api("read", { conversation_id: convId }); } catch (e) {}
        } else {
          bumpUnread(convId, 1);
        }
        maybeNotify(msg);
      } else {
        maybeNotify(msg);
        renderConversationList();
      }
    } catch (e) { /* transient — reconnect reconcile will cover it */ }
  }

  function subscribeRealtime() {
    if (state.channel) state.channel.unsubscribe();
    state._broadcastTopics = new Set();
    const ch = client.channel("veilnet-msgs-live");
    ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
      const m = payload.new;
      if (!m || !state.conversations.has(m.conversation_id)) return;
      const fresh = mergeMessages(m.conversation_id, [m]);
      if (fresh.length) cachePut([m]);
      const conv = state.conversations.get(m.conversation_id);
      if (conv) { conv.last_body = m.body; conv.last_at = m.created_at; }
      if (state.current === m.conversation_id) {
        renderMessages();
        scrollToBottom();
        if (!document.hidden) api("read", { conversation_id: m.conversation_id }).catch(() => {});
      }
      maybeNotify(m);
      renderConversationList();
    });
    ch.on("broadcast", { event: "new-message" }, (payload) => handleRemotePing(payload));
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setConnState("on");
        joinBroadcastChannels();
        reconcile();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        setConnState("off");
      } else if (status === "CLOSED") {
        setConnState("wait");
      }
    });
    state.channel = ch;
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
  });

  // ---------- auth / wiring ----------
  async function wipeAndReset() {
    await cacheWipeAll();
    if (state.channel) { try { state.channel.unsubscribe(); } catch (e) {} }
    state.channel = null;
    state.me = null; state.friends = []; state.conversations = new Map();
    state.messages = new Map(); state.order = new Map(); state.current = null;
    state.processedIds = new Set(); state._broadcastTopics = new Set();
  }

  function wireUI() {
    $("msgLoginBtn").addEventListener("click", async () => {
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
      await bootstrap();
      subscribeRealtime();
    } catch (e) {
      $("msgConvos").innerHTML = '<div class="small msg-muted">Could not load messaging: ' + esc(e.message) + '</div>';
    }
  }

  // Logout: wipe this account's cache and reset in-memory state.
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-veil-logout]");
    if (el) wipeAndReset().then(() => location.reload());
  });

  wireUI();
  start();
})();

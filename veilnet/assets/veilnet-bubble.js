/*!
 * Veilnet Messenger Bubble — Facebook-style draggable chat head.
 *
 * Shows when at least one friend is pinned (pins live in
 * localStorage "veilnet_bubble_pinned_friends", shared with the
 * messages-page pin buttons; on the messages page the bubble only
 * appears once something is pinned).
 *
 * The mini chat reads/writes the SAME conversations as the main app:
 * - bootstrap lists real conversations (there are no "separate" chats —
 *   the server creates one conversation per friend on first send).
 * - "ensure" creates/finds the conversation with a friend, "send"
 *   delivers into it, "list" reads its real history.
 * - A realtime subscription pushes incoming messages into the open
 *   mini chat live, and the ping plays (VeilnetPing).
 *
 * Buttons: bubble × hides the session; panel × closes. The small × next
 * to each pinned row unpins that friend (same as the pin buttons on the
 * messages page — the state is shared).
 */
(function () {
  "use strict";

  let el = null;
  let panel = null;
  const state = {
    open: false,
    currentFriend: null,
    currentConvId: null,
    friends: [],          // [{productUserId, username, pictureUrl}]
    convs: new Map(),     // conversation_id -> {conversation_id, other_id, other, last_*}
    me: null,
    tab: "pins",
    _ch: null,
  };

  function cfg() {
    return window.VEILNET_CONFIG || {};
  }

  function api(action, body) {
    return (window.VeilnetAuth?.getToken ? Promise.resolve(window.VeilnetAuth.getToken()) : Promise.reject(new Error("auth not ready")))
      .then((token) => {
        if (!token) throw new Error("not signed in");
        return fetch((cfg().SUPABASE_URL || "https://lqghurvonrvrxfwjgkuu.supabase.co") + "/functions/v1/messaging-api", {
          method: "POST",
          headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
          body: JSON.stringify(Object.assign({ action }, body || {})),
        });
      })
      .then(async (r) => {
        const b = await r.json().catch(() => ({}));
        if (!r.ok || b.ok === false) throw new Error(b.error || "http_" + r.status);
        return b;
      });
  }

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------- pinned friends ("pin" in the friends list) ----------
  const PIN_KEY = "veilnet_bubble_pinned_friends";
  function loadPinned() {
    try { const r = JSON.parse(localStorage.getItem(PIN_KEY) || "[]"); return Array.isArray(r) ? r : []; } catch (e) { return []; }
  }
  function savePinned(arr) {
    try { localStorage.setItem(PIN_KEY, JSON.stringify(arr.slice(0, 20))); } catch (e) { /* ignore */ }
  }
  function isPinned(id) { return loadPinned().indexOf(id) !== -1; }
  function pinFriend(id) { const a = loadPinned(); if (a.indexOf(id) === -1) { a.push(id); savePinned(a); } }
  function unpinFriend(id) {
    savePinned(loadPinned().filter((x) => x !== id));
    // Main page listens so its pin buttons re-render immediately.
    try { window.dispatchEvent(new CustomEvent("veilnet:bubble-pins-changed")); } catch (e) {}
  }

  // ---------- bubble ----------
  function ensureBubble() {
    if (el) return el;
    el = document.createElement("div");
    el.id = "vnBubble";
    el.innerHTML =
      '<div class="vn-bubble-float">' +
      '<button type="button" class="vn-bubble-msg" aria-label="Open Veilnet messenger">' +
      '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
      "</button>" +
      '<div class="vn-bubble-actions">' +
      '<button type="button" title="Hide the bubble this session" data-b="hide">&times;</button>' +
      "</div>" +
      "</div>";
    document.body.appendChild(el);

    // The bubble button is a <button> (not inside the drag surface), so
    // clicks reliably open the panel. Dragging is on the float container
    // but pointerdown on the button itself begins the drag ONLY after the
    // click resolves — we keep them separate to avoid capture-eating.
    const msgBtn = el.querySelector(".vn-bubble-msg");
    let dragMoved = false;
    msgBtn.addEventListener("click", () => {
      if (dragMoved) { dragMoved = false; return; }
      togglePanel();
    });

    // Drag: attach to the float but ignore gestures starting on the button.
    const float = el.querySelector(".vn-bubble-float");
    let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0, pid = null;
    float.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".vn-bubble-msg") || e.target.closest("button")) return;
      dragging = true; dragMoved = false;
      sx = e.clientX; sy = e.clientY;
      const r = float.getBoundingClientRect();
      ox = r.left; oy = r.top;
      pid = e.pointerId;
      try { float.setPointerCapture(pid); } catch (err) { /* ignore */ }
    });
    float.addEventListener("pointermove", (e) => {
      if (!dragging || e.pointerId !== pid) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) dragMoved = true;
      const maxX = innerWidth - 56, maxY = innerHeight - 56;
      float.style.left = Math.max(6, Math.min(maxX, ox + dx)) + "px";
      float.style.top = Math.max(6, Math.min(maxY, oy + dy)) + "px";
      float.style.right = "auto"; float.style.bottom = "auto";
    });
    float.addEventListener("pointerup", () => {
      dragging = false;
      if (dragMoved) {
        try {
          const r = float.getBoundingClientRect();
          const left = r.left + r.width / 2 < innerWidth / 2;
          float.style.left = (left ? 18 : innerWidth - r.width - 18) + "px";
        } catch (e) { /* keep position */ }
      }
    });
    float.addEventListener("pointercancel", () => { dragging = false; });

    el.querySelector('[data-b="hide"]').addEventListener("click", (e) => {
      e.stopPropagation();
      try { sessionStorage.setItem("veilnet_bubble_hidden", "1"); } catch (err) {}
      el.style.display = "none";
      closePanel();
    });

    try {
      if (sessionStorage.getItem("veilnet_bubble_hidden") === "1") el.style.display = "none";
    } catch (e) { /* storage unavailable */ }

    return el;
  }

  // ---------- panel ----------
  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement("div");
    panel.id = "vnBubblePanel";
    panel.innerHTML =
      '<div class="vnbp-head">' +
      '<span class="vnbp-title">Messages</span>' +
      '<span class="vnbp-actions">' +
      '<button type="button" data-b="resync" title="Resync">&#10227;</button>' +
      '<button type="button" data-b="close" title="Close">&times;</button>' +
      "</span></div>" +
      '<div class="vnbp-tabs">' +
      '<button type="button" class="vnvp-tab active" data-t="pins">Pinned</button>' +
      '<button type="button" class="vnvp-tab" data-t="all">All friends</button>' +
      "</div>" +
      '<div class="vnbp-list">Loading…</div>' +
      '<div class="vnbp-chat" style="display:none">' +
      '<div class="vnbp-head vnbp-head-back"><button type="button" data-b="back">&#8592;</button><span class="vnbp-title"></span></div>' +
      '<div class="vnbp-msgs"></div>' +
      '<div class="vnbp-composer">' +
      '<input type="text" maxlength="2000" placeholder="Type a message…" autocomplete="off">' +
      '<button type="button" class="vnbp-send">Send</button>' +
      "</div></div>";
    document.body.appendChild(panel);

    panel.querySelector('[data-b="close"]').addEventListener("click", closePanel);
    panel.querySelector('[data-b="back"]').addEventListener("click", () => showList());
    panel.querySelector('[data-b="resync"]').addEventListener("click", () => refresh());

    panel.querySelectorAll(".vnvp-tab").forEach((t) => {
      t.addEventListener("click", () => {
        panel.querySelectorAll(".vnvp-tab").forEach((x) => x.classList.remove("active"));
        t.classList.add("active");
        state.tab = t.getAttribute("data-t");
        renderList();
      });
    });

    const input = panel.querySelector(".vnbp-composer input");
    const send = panel.querySelector(".vnbp-send");
    const doSend = () => {
      const text = input.value.trim();
      if (!text || !state.currentFriend) return;
      input.value = "";
      sendMessage(state.currentFriend, text);
    };
    send.addEventListener("click", doSend);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); doSend(); }
    });
    return panel;
  }

  function togglePanel() {
    if (state.open) closePanel();
    else openPanel();
  }

  function openPanel() {
    ensurePanel();
    state.open = true;
    panel.style.display = "flex";
    const float = el.querySelector(".vn-bubble-float");
    if (float) {
      const r = float.getBoundingClientRect();
      const left = r.left + r.width / 2 < innerWidth / 2;
      panel.classList.toggle("vnbp-left", left);
      panel.classList.toggle("vnbp-right", !left);
    }
    showList();
    refresh();
    subscribeRealtime();
  }

  function closePanel() {
    if (panel) panel.style.display = "none";
    state.open = false;
    state.currentFriend = null;
    state.currentConvId = null;
  }

  function showList() {
    if (!panel) return;
    state.currentFriend = null;
    state.currentConvId = null;
    panel.querySelector(".vnbp-list").style.display = "";
    panel.querySelector(".vnbp-chat").style.display = "none";
  }

  // ---------- data (SAME conversations as the main page) ----------
  function refresh() {
    if (!panel) return Promise.resolve();
    return api("bootstrap").then((data) => {
      state.me = data.me || data.user_id || null;
      state.friends = data.friends || [];
      state.convs = new Map();
      for (const c of data.conversations || []) {
        if (!c.last_at) continue; // only conversations that have messages
        state.convs.set(c.conversation_id, c);
      }
      renderList();
    }).catch((e) => {
      if (panel) panel.querySelector(".vnbp-list").innerHTML = '<div class="vnbp-note">Could not load: ' + esc(e.message) + "</div>";
    });
  }

  function renderList() {
    if (!panel) return;
    const list = panel.querySelector(".vnbp-list");
    const pinned = loadPinned();
    let rows = state.friends;
    if (state.tab !== "all") {
      const pinIdx = new Map(pinned.map((id, i) => [id, i]));
      rows = state.friends
        .filter((f) => pinIdx.has(f.productUserId))
        .sort((a, b) => pinIdx.get(a.productUserId) - pinIdx.get(b.productUserId));
    }
    if (!rows.length) {
      list.innerHTML = state.tab === "all"
        ? '<div class="vnbp-note">No friends yet.</div>'
        : '<div class="vnbp-note">Nothing pinned yet. Use the pin button on the messages page (or All friends) to add friends here.</div>';
      return;
    }
    list.innerHTML = rows.map((f) => {
      const conv = Array.from(state.convs.values()).find((c) => c.other_id === f.productUserId);
      const pinnedNow = isPinned(f.productUserId);
      return '<div class="vnbp-row" data-f="' + esc(f.productUserId) + '">' +
        '<img src="' + esc(f.pictureUrl || "../assets/default_pfp.png") + '" alt="">' +
        '<div class="vnbp-name">' + esc(f.username || "Unknown") +
        (conv ? '<span class="vnbp-sub">' + esc(String(conv.last_body || "").slice(0, 40)) + "</span>" : "") +
        "</div>" +
        (pinnedNow
          ? '<button type="button" class="vnbp-unpin" title="Unpin (also reverts the pin on the messages page)" data-unpin="' + esc(f.productUserId) + '">&times;</button>'
          : '<button type="button" class="vnbp-pin" title="Pin to bubble" data-pin="' + esc(f.productUserId) + '">&#128204;</button>') +
        "</div>";
    }).join("");
    list.querySelectorAll(".vnbp-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        openChat(row.getAttribute("data-f"));
      });
    });
    list.querySelectorAll("button[data-pin]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        pinFriend(b.getAttribute("data-pin"));
        renderList();
      });
    });
    list.querySelectorAll("button[data-unpin]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        unpinFriend(b.getAttribute("data-unpin"));
        // If the open mini chat was that friend, return to the list — the
        // conversation itself is untouched (same conversation the main app
        // shows).
        if (b.getAttribute("data-unpin") === state.currentFriend) showList();
        renderList();
        syncVisibility();
      });
    });
  }

  async function openChat(friendId) {
    const friend = state.friends.find((f) => f.productUserId === friendId);
    if (!friend || !panel) return;
    state.currentFriend = friendId;
    state.currentConvId = null;
    panel.querySelector(".vnbp-list").style.display = "none";
    const chat = panel.querySelector(".vnbp-chat");
    chat.style.display = "flex";
    panel.querySelector(".vnbp-head-back .vnbp-title").textContent = friend.username || "Unknown";
    const msgs = panel.querySelector(".vnbp-msgs");
    msgs.innerHTML = '<div class="vnbp-note">Loading…</div>';

    // Reuse the EXISTING conversation with this friend if it has messages —
    // identical conversation id the main page shows. First send creates it
    // server-side via "ensure" (no duplicate conversations, ever).
    const existing = Array.from(state.convs.values()).find((c) => c.other_id === friendId);
    if (!existing) {
      msgs.innerHTML = '<div class="vnbp-note">No messages yet — say hi!</div>';
      return;
    }
    state.currentConvId = existing.conversation_id;
    await loadHistory(existing.conversation_id);
  }

  async function loadHistory(convId) {
    if (!panel) return;
    const msgs = panel.querySelector(".vnbp-msgs");
    try {
      const r = await api("list", { conversation_id: convId, limit: 50 });
      renderMsgs(r.messages || []);
    } catch (e) {
      msgs.innerHTML = '<div class="vnbp-note">Could not load: ' + esc(e.message) + "</div>";
    }
  }

  function renderMsgs(messages) {
    if (!panel) return;
    const msgs = panel.querySelector(".vnbp-msgs");
    msgs.innerHTML = messages.length
      ? messages.map((m) => {
          const mine = m.sender_id === state.me;
          return '<div class="vnbp-msg' + (mine ? " vnbp-mine" : "") + '">' + esc(m.body) + "</div>";
        }).join("")
      : '<div class="vnbp-note">No messages yet — say hi!</div>';
    msgs.scrollTop = msgs.scrollHeight;
  }

  async function sendMessage(friendId, text) {
    if (!panel) return;
    const msgs = panel.querySelector(".vnbp-msgs");
    const pending = document.createElement("div");
    pending.className = "vnbp-msg vnbp-mine vnbp-pending";
    pending.textContent = text;
    msgs.appendChild(pending);
    msgs.scrollTop = msgs.scrollHeight;
    try {
      // ensure -> conversation_id (creates on first send; same conversation
      // the main app uses), then send into that conversation.
      const en = await api("ensure", { friend_id: friendId });
      const convId = en?.conversation_id;
      if (!convId) throw new Error("no conversation");
      state.currentConvId = convId;
      if (!state.convs.has(convId)) {
        const friend = state.friends.find((f) => f.productUserId === friendId);
        state.convs.set(convId, { conversation_id: convId, other_id: friendId, other: friend || { username: "Unknown" } });
      }
      const sent = await api("send", { conversation_id: convId, body: text });
      if (sent?.message) {
        // Replace pending with the real message (server-assigned ordering).
        pending.remove();
        const msgsEl = panel.querySelector(".vnbp-msgs");
        const empty = msgsEl.querySelector(".vnbp-note");
        if (empty) empty.remove();
        const mine = sent.message.sender_id === state.me;
        const div = document.createElement("div");
        div.className = "vnbp-msg" + (mine ? " vnbp-mine" : "");
        div.textContent = sent.message.body;
        msgsEl.appendChild(div);
        msgsEl.scrollTop = msgsEl.scrollHeight;
        // Refresh the list's last-message preview.
        refresh().catch(() => {});
      }
    } catch (e) {
      pending.classList.add("vnbp-failed");
      pending.title = "Not delivered: " + e.message;
      if (window.socialToast) window.socialToast({ title: "Send failed", body: String(e.message) });
    }
  }

  // Live updates inside the open mini chat (same realtime topic the main
  // app and the global notifier use — no separate message stores).
  function subscribeRealtime() {
    if (state._ch || !window.supabase || !window.VeilnetAuth) return;
    try {
      const client = window.VeilnetAuth.init();
      const ch = client.channel("veilnet-msgs-live", { config: { broadcast: { self: false } } });
      ch.on("broadcast", { event: "new-message" }, (msg) => {
        const p = (msg && msg.payload) || msg;
        if (!p || !p.conversation_id || !p.message_id) return;
        if (state.me && p.sender_id === state.me) return;
        if (!state.open || p.conversation_id !== state.currentConvId) return;
        // Same dedupe key the notifier uses so tabs don't double-bubble.
        try {
          const seen = JSON.parse(localStorage.getItem("veilnet_seen_" + state.me) || "[]");
          if (seen.indexOf(p.message_id) !== -1) return;
        } catch (e) { /* lenient */ }
        const msgsEl = panel.querySelector(".vnbp-msgs");
        if (!msgsEl) return;
        const empty = msgsEl.querySelector(".vnbp-note");
        if (empty) empty.remove();
        const div = document.createElement("div");
        div.className = "vnbp-msg";
        div.textContent = String(p.body || "");
        msgsEl.appendChild(div);
        msgsEl.scrollTop = msgsEl.scrollHeight;
        if ((localStorage.getItem("veilnet_msg_sound") ?? "on") === "on" && window.VeilnetPing) window.VeilnetPing.play();
      });
      ch.subscribe(() => {});
      state._ch = ch;
    } catch (e) { /* realtime unavailable */ }
  }

  // Show/hide the bubble to match pin state. On the messages page the
  // bubble only makes sense once something is pinned; elsewhere signed-in
  // users always get it (pinned or not — it mirrors the whole account).
  function syncVisibility() {
    if (!el) return;
    const onMsgPage = !!document.getElementById("msgApp");
    const hasPins = loadPinned().length > 0;
    let hidden = false;
    try { hidden = sessionStorage.getItem("veilnet_bubble_hidden") === "1"; } catch (e) {}
    const shouldShow = !hidden && (onMsgPage ? hasPins : true);
    el.style.display = shouldShow ? "" : "none";
    if (!shouldShow) closePanel();
  }

  // ---------- boot ----------
  function wire() {
    if (document.getElementById("vnBubble")) return;
    if (window.innerWidth <= 640) return; // mobile skips the bubble per spec
    window.VeilnetAuth?.getUser?.().then((u) => {
      if (!u) return;
      state.me = u.id;
      ensureBubble();
      syncVisibility();
      // Messages-page pin buttons dispatch this; react instantly.
      window.addEventListener("veilnet:bubble-pins-changed", () => {
        try { sessionStorage.removeItem("veilnet_bubble_hidden"); } catch (e) {}
        syncVisibility();
        if (state.open) refresh();
      });
      // Another tab changed pins: sync too.
      window.addEventListener("storage", (e) => {
        if (e.key === PIN_KEY) syncVisibility();
      });
    }).catch(() => {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();

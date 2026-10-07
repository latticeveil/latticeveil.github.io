/*!
 * Veilnet Messenger Bubble — Facebook-style draggable chat head on EVERY
 * page (except /messages/, which already has the full app).
 *
 * - Compact in-page messenger panel: friend list -> one conversation at a
 *   time -> compose box. Same fetch as the main app (messaging-api, dual
 *   auth), so history, delivery, and the unread badge stay one system.
 * - Same ping sound (VeilnetPing), same realtime channel hook.
 * - Bubble is draggable anywhere (pointer events); panel snappers to
 *   either bottom corner so it never covers content you're reading.
 * - Pin / snooze / minimize controls. per-session state only (no server).
 */
(function () {
  "use strict";

  let el = null;
  let panel = null;
  let state = { open: false, currentFriend: null, friends: [], convs: new Map(), me: null, pos: null, tab: "pins" };

  function cfg() {
    return window.VEILNET_CONFIG || {};
  }

  function api(action, body) {
    return (window.VeilnetAuth?.getToken ? window.VeilnetAuth.getToken() : null).then((token) => {
      if (!token) throw new Error("not signed in");
      return fetch((cfg().SUPABASE_URL || "https://lqghurvonrvrxfwjgkuu.supabase.co") + "/functions/v1/messaging-api", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify(Object.assign({ action }, body || {})),
      });
    }).then(async (r) => {
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
  function unpinFriend(id) { savePinned(loadPinned().filter((x) => x !== id)); }

  // ---------- bubble ----------
  function ensureBubble() {
    if (el) return el;
    el = document.createElement("div");
    el.id = "vnBubble";
    el.innerHTML =
      '<div class="vn-bubble-float">' +
      '<div class="vn-bubble-msg" aria-label="Open Veilnet messenger">' +
      '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
      "</div>" +
      '<div class="vn-bubble-actions">' +
      '<button title="Hide the bubble this session" data-b="hide">&times;</button>' +
      "</div>" +
      "</div>";
    document.body.appendChild(el);

    // Open panel on tap (unless dragging just happened)
    let dragMoved = false;
    const msgBtn = el.querySelector(".vn-bubble-msg");
    msgBtn.addEventListener("click", () => {
      if (dragMoved) { dragMoved = false; return; }
      togglePanel();
    });

    // Drag anywhere.
    const float = el.querySelector(".vn-bubble-float");
    let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
    float.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return; // actions are taps, not drags
      dragging = true; dragMoved = false;
      sx = e.clientX; sy = e.clientY;
      const r = float.getBoundingClientRect();
      ox = r.left; oy = r.top;
      float.setPointerCapture?.(e.pointerId);
    });
    float.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) + Math.abs(oy) > 6) dragMoved = true;
      const maxX = innerWidth - 56, maxY = innerHeight - 56;
      float.style.left = Math.max(6, Math.min(maxX, ox + dx)) + "px";
      float.style.top = Math.max(6, Math.min(maxY, oy + dy)) + "px";
      float.style.right = "auto"; float.style.bottom = "auto";
    });
    float.addEventListener("pointerup", () => {
      if (dragging) {
        dragging = false;
        // Snap to nearer side horizontally (bottom-ish is footer-safe).
        try {
          const r = float.getBoundingClientRect();
          const left = r.left + r.width / 2 < innerWidth / 2;
          float.style.left = (left ? 18 : innerWidth - r.width - 18) + "px";
        } catch (e) { /* keep position */ }
      }
    });

    el.querySelector('[data-b="hide"]').addEventListener("click", () => {
      try { sessionStorage.setItem("veilnet_bubble_hidden", "1"); } catch (e) {}
      el.style.display = "none";
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
      '<button data-b="resync" title="Resync">&#10227;</button>' +
      '<button data-b="close" title="Close">&times;</button>' +
      "</span></div>" +
      // Tab list: Pinned | All friends
      '<div class="vnbp-tabs">' +
      '<button class="vnvp-tab active" data-t="pins">Pinned</button>' +
      '<button class="vnvp-tab" data-t="all">All friends</button>' +
      "</div>" +
      '<div class="vnbp-list">Loading…</div>' +
      '<div class="vnbp-chat" style="display:none">' +
      '<div class="vnbp-head vnbp-head-back"><button data-b="back">←</button><span class="vnbp-title"></span></div>' +
      '<div class="vnbp-msgs"></div>' +
      '<div class="vnbp-composer">' +
      '<input type="text" maxlength="2000" placeholder="Type a message…" autocomplete="off">' +
      '<button class="vnbp-send">Send</button>' +
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
      sendMsg(state.currentFriend, text);
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
    // Position panel near whichever side the bubble is on.
    const float = el.querySelector(".vn-bubble-float");
    if (float) {
      const r = float.getBoundingClientRect();
      const left = r.left + r.width / 2 < innerWidth / 2;
      panel.classList.toggle("vnbp-left", left);
      panel.classList.toggle("vnbp-right", !left);
    }
    showList();
    refresh();
  }

  function closePanel() {
    if (panel) panel.style.display = "none";
    state.open = false;
    state.currentFriend = null;
  }

  function showList() {
    if (!panel) return;
    state.currentFriend = null;
    panel.querySelector(".vnbp-list").style.display = "";
    panel.querySelector(".vnbp-chat").style.display = "none";
  }

  function refresh() {
    if (!panel) return;
    api("bootstrap").then((data) => {
      state.me = data.me || null;
      state.friends = data.friends || [];
      state.convs = new Map();
      for (const c of data.conversations || []) {
        if (!c.last_at) continue;
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
      // Pinned tab (default): pinned friends first, in pin order.
      const pinIdx = new Map(pinned.map((id, i) => [id, i]));
      rows = state.friends
        .filter((f) => pinIdx.has(f.productUserId))
        .sort((a, b) => pinIdx.get(a.productUserId) - pinIdx.get(b.productUserId));
    }
    if (!rows.length) {
      list.innerHTML = state.tab === "all"
        ? '<div class="vnbp-note">No friends yet.</div>'
        : '<div class="vnbp-note">Nothing pinned yet. Open All friends and tap the pin button beside someone.</div>';
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
        '<button class="vnbp-pin" title="' + (pinnedNow ? "Unpin from bubble" : "Pin to bubble") + '" data-pin="' + esc(f.productUserId) + '">📌</button>' +
        (pinnedNow ? '<button class="vnbp-unpin" title="Unpin" data-pin="' + esc(f.productUserId) + '">×</button>' : "") +
        "</div>";
    }).join("");
    list.querySelectorAll(".vnbp-row").forEach((row) => {
      row.addEventListener("click", () => openChat(row.getAttribute("data-f")));
    });
    list.querySelectorAll("button[data-pin]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = b.getAttribute("data-pin");
        if (isPinned(id)) unpinFriend(id); else pinFriend(id);
        renderList();
      });
    });
  }

  async function openChat(friendId) {
    const friend = state.friends.find((f) => f.productUserId === friendId);
    if (!friend || !panel) return;
    state.currentFriend = friendId;
    panel.querySelector(".vnbp-list").style.display = "none";
    const chat = panel.querySelector(".vnbp-chat");
    chat.style.display = "flex";
    panel.querySelector(".vnbp-head-back .vnbp-title").textContent = friend.username || "Unknown";
    const msgs = panel.querySelector(".vnbp-msgs");
    msgs.innerHTML = '<div class="vnbp-note">Loading…</div>';

    // Find a conversation with this friend — one is only created on the
    // FIRST SEND via the "ensure" action (same as the main app).
    const existing = Array.from(state.convs.values()).find((c) => c.other_id === friendId);
    const conv = existing;

    if (conv?.conversation_id) {
      try {
        const r = await api("list", { conversation_id: conv.conversation_id, limit: 50 });
        const ms = (r.messages || []).map((m) => (m.sender_id === state.me ? "You: " + m.body : m.body));
        msgs.innerHTML = ms.length
          ? ms.map((m) => '<div class="vnbp-msg">' + esc(m) + "</div>").join("")
          : '<div class="vnbp-note">No messages yet — say hi!</div>';
        msgs.scrollTop = msgs.scrollHeight;
      } catch (e) {
        msgs.innerHTML = '<div class="vnbp-note">Could not load: ' + esc(e.message) + "</div>";
      }
    } else {
      msgs.innerHTML = '<div class="vnbp-note">No messages yet — say hi!</div>';
    }
  }

  async function sendMsg(friendId, text) {
    if (!panel) return;
    const msgs = panel.querySelector(".vnbp-msgs");
    const pending = document.createElement("div");
    pending.className = "vnbp-msg vnbp-pending";
    pending.textContent = text;
    msgs.appendChild(pending);
    msgs.scrollTop = msgs.scrollHeight;
    try {
      // "ensure" creates the conversation on first send, then deliver.
      const r = await api("ensure", { friend_id: friendId });
      const convId = r?.conversation_id;
      if (!convId) throw new Error("no conversation");
      if (!state.convs.has(convId)) {
        state.convs.set(convId, { conversation_id: convId, other_id: friendId, other: state.friends.find((f) => f.productUserId === friendId) });
      }
      await api("send", { conversation_id: convId, body: text });
      pending.classList.remove("vnbp-pending");
    } catch (e) {
      pending.classList.add("vnbp-failed");
      pending.title = "Not delivered: " + e.message;
      window.socialToast?.({ title: "Send failed", body: String(e.message) });
    }
  }

  // Show/hide the bubble to match current pin state. On the messages page
  // the bubble only makes sense once something is pinned; everywhere else
  // signed-in users always get it.
  function syncVisibility() {
    if (!el) return;
    const onMsgPage = !!document.getElementById("msgApp");
    const hasPins = loadPinned().length > 0;
    const hidden = (() => { try { return sessionStorage.getItem("veilnet_bubble_hidden") === "1"; } catch (e) { return false; } })();
    const shouldShow = !hidden && (onMsgPage ? hasPins : true);
    el.style.display = shouldShow ? "" : "none";
  }

  // ---------- boot ----------
  function wire() {
    if (document.getElementById("vnBubble")) return;
    // Only when signed in.
    window.VeilnetAuth?.getUser?.().then((u) => {
      if (!u) return;
      ensureBubble();
      syncVisibility();
      // Messages page pin buttons dispatch this when pins change.
      window.addEventListener("veilnet:bubble-pins-changed", () => {
        try { sessionStorage.removeItem("veilnet_bubble_hidden"); } catch (e) {}
        syncVisibility();
        // If the panel is open, refresh the pinned list live.
        if (state.open) refresh();
      });
    }).catch(() => {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();

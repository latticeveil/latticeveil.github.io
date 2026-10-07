/*!
 * Veilnet shared friend-state module — used by both profile pages.
 *
 * Renders Add Friend / Accept / Decline / Cancel Request / Unfriend /
 * Block / Unblock buttons for a target profile, driven by the SAME
 * friends system as the game (messaging-api actions mirror the
 * friend-request / friend-remove semantics with dual auth), so friending
 * from the site and from the launcher stays one social graph.
 *
 * Usage:
 *   <div data-veil-friend-box></div>
 *   <script src=".../veilnet-friends.js?v=N"></script>
 * Then call: window.loadFriendState(targetUserId) after the profile loads.
 */
(function () {
  "use strict";

  function cfg() {
    return window.VEILNET_CONFIG || {};
  }

  function fnUrl(action) {
    var base = cfg().SUPABASE_URL || "https://lqghurvonrvrxfwjgkuu.supabase.co";
    return base + "/functions/v1/messaging-api";
  }

  async function callApi(action, friend_id) {
    if (!(window.VeilnetAuth && window.VeilnetAuth.getToken)) {
      throw new Error("auth not ready");
    }
    var token = await window.VeilnetAuth.getToken();
    if (!token) throw new Error("not signed in");
    var r = await fetch(fnUrl(), {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ action: action, friend_id: friend_id }),
    });
    var body = await r.json().catch(function () { return {}; });
    if (!r.ok || body.ok === false) throw new Error(body.error || "http_" + r.status);
    return body;
  }

  function actionLabel(a) {
    switch (a) {
      case "request": return "Add Friend";
      case "accept": return "Accept Friend Request";
      case "decline": return "Decline";
      case "cancel": return "Cancel Request";
      case "unfriend": return "Unfriend";
      case "block": return "Block";
      case "unblock": return "Unblock";
      default: return a;
    }
  }

  function confirmNeeded(a) {
    return a === "unfriend" || a === "block" || a === "decline";
  }

  function confirmTitle(a) {
    if (a === "unfriend") return "Unfriend this player?";
    if (a === "block") return "Block this player?";
    if (a === "decline") return "Decline friend request?";
    return "Are you sure?";
  }

  function confirmText(a) {
    if (a === "unfriend") return "They will be removed from your friends list and you from theirs. You can always send a new friend request later.";
    if (a === "block") return "They will not be able to send you messages or friend requests. You can unblock them any time from their profile.";
    if (a === "decline") return "The request will be dismissed. They can send a new one later.";
    return "";
  }

  // ---------- in-page dialog & toast (never browser alert/confirm) ----------
  function ensureDialogStyles() {
    if (document.getElementById("vn-fd-styles")) return;
    var st = document.createElement("style");
    st.id = "vn-fd-styles";
    st.textContent =
      ".vn-fd-overlay{position:fixed;inset:0;background:rgba(0,0,0,.66);backdrop-filter:blur(4px);z-index:99990;display:flex;align-items:center;justify-content:center;padding:20px;}" +
      ".vn-fd{max-width:420px;width:100%;background:var(--panel,#171421);border:1px solid var(--border,rgba(255,255,255,.14));border-radius:14px;padding:22px 24px;box-shadow:0 18px 60px rgba(0,0,0,.55);color:var(--text,#e8e6f0);}" +
      ".vn-fd h3{margin:0 0 8px;font-size:1.15rem;}" +
      ".vn-fd p{margin:0 0 18px;line-height:1.6;opacity:.85;font-size:.98rem;}" +
      ".vn-fd-btns{display:flex;gap:10px;justify-content:flex-end;}" +
      ".vn-fd-btn{padding:10px 18px;border-radius:8px;border:1px solid var(--border,rgba(255,255,255,.16));background:transparent;color:var(--text,#e8e6f0);cursor:pointer;font-size:.95rem;}" +
      ".vn-fd-btn.danger{background:#ff4d4d;border-color:#ff4d4d;color:#1b1010;font-weight:600;}" +
      ".vn-fd-btn:hover{filter:brightness(1.12);}" +
      ".vn-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);background:var(--panel,#171421);color:var(--text,#e8e6f0);border:1px solid rgba(255,120,120,.55);border-radius:10px;padding:12px 18px;z-index:99991;box-shadow:0 10px 34px rgba(0,0,0,.5);font-size:.95rem;max-width:90vw;text-align:center;}";
    document.head.appendChild(st);
  }

  function vnDialog(opts) {
    ensureDialogStyles();
    return new Promise(function (resolve) {
      var overlay = document.createElement("div");
      overlay.className = "vn-fd-overlay";
      overlay.innerHTML =
        '<div class="vn-fd" role="dialog" aria-modal="true">' +
        "<h3></h3><p></p>" +
        '<div class="vn-fd-btns">' +
        '<button type="button" class="vn-fd-btn cancel">Cancel</button>' +
        '<button type="button" class="vn-fd-btn danger">Confirm</button>' +
        "</div></div>";
      overlay.querySelector("h3").textContent = opts.title || "Are you sure?";
      overlay.querySelector("p").textContent = opts.body || "";
      var cancelBtn = overlay.querySelector(".cancel");
      var okBtn = overlay.querySelector(".danger");
      if (opts.okLabel) okBtn.textContent = opts.okLabel;
      function close(result) {
        document.removeEventListener("keydown", onKey, true);
        overlay.remove();
        resolve(result);
      }
      function onKey(e) {
        if (e.key === "Escape") { e.stopPropagation(); close(false); }
        else if (e.key === "Enter" && !e.__vnFdEnter) { e.preventDefault(); close(true); }
      }
      cancelBtn.addEventListener("click", function () { close(false); });
      okBtn.addEventListener("click", function () { close(true); });
      overlay.addEventListener("click", function (e) { if (e.target === overlay) close(false); });
      document.addEventListener("keydown", onKey, true);
      document.body.appendChild(overlay);
      okBtn.focus();
    });
  }

  function vnToast(message) {
    ensureDialogStyles();
    var t = document.createElement("div");
    t.className = "vn-toast";
    t.textContent = message;
    document.body.appendChild(t);
    setTimeout(function () {
      t.style.transition = "opacity .3s";
      t.style.opacity = "0";
      setTimeout(function () { t.remove(); }, 320);
    }, 4200);
  }

  // Expose for reuse by other Veilnet scripts (messages.js errors, etc.)
  window.VeilnetDialog = vnDialog;
  window.VeilnetToast = vnToast;

  /**
   * Build + render the friend buttons into container `box` for `targetId`.
   * Works with either an element or an element id.
   */
  window.loadFriendState = async function (targetId, boxOrId) {
    var box =
      typeof boxOrId === "string" ? document.getElementById(boxOrId) :
      boxOrId || document.querySelector("[data-veil-friend-box]");
    if (!box || !targetId) return;

    box.innerHTML = "";
    try {
      var me = null;
      if (window.VeilnetAuth && window.VeilnetAuth.getUser) {
        me = await window.VeilnetAuth.getUser();
      }
      if (!me || !me.id || me.id === targetId) {
        box.style.display = "none";
        return;
      }

      var fields = "user_id, friend_id, status";
      var or = "and(user_id.eq." + me.id + ",friend_id.eq." + targetId + ")" +
             ",and(user_id.eq." + targetId + ",friend_id.eq." + me.id + ")";
      var client = window.VeilnetAuth.init();
      var res = await client.from("friends").select(fields).or(or);

      if (res.error) throw res.error;
      var rows = res.data || [];
      var mine = rows.find(function (r) { return r.user_id === me.id; });
      var theirs = rows.find(function (r) { return r.user_id === targetId; });

      var btns = [];
      var blockedByMe = !!(mine && mine.status === "blocked");
      var blockedMe = !!(theirs && theirs.status === "blocked");
      if (theirs && theirs.status === "pending") {
        btns.push(["accept", "btn-primary"]);
        btns.push(["decline", "btn-secondary"]);
      } else if (mine && mine.status === "accepted") {
        btns.push(["unfriend", "btn-secondary"]);
      } else if (mine && mine.status === "pending") {
        btns.push(["cancel", "btn-secondary"]);
      } else if (!blockedByMe && !blockedMe && !mine) {
        btns.push(["request", "btn-primary"]);
      }
      if (blockedByMe) btns.push(["unblock", "btn-secondary"]);
      else btns.push(["block", "btn-secondary"]);

      box.innerHTML = "";
      btns.forEach(function (b) {
        var action = b[0];
        var cls = b[1];
        var el = document.createElement("button");
        el.type = "button";
        el.className = "btn btn-sm " + cls;
        el.textContent = actionLabel(action);
        if (action === "block") el.style.cssText = "background:transparent;border-color:rgba(255,77,77,.5);color:#ff6b6b";
        el.setAttribute("data-veil-friend-action", action);
        el.setAttribute("data-veil-friend-target", targetId);
        el.addEventListener("click", async function () {
          if (confirmNeeded(action)) {
            var ok = await vnDialog({
              title: confirmTitle(action),
              body: confirmText(action),
              okLabel: actionLabel(action),
            });
            if (!ok) return;
          }
          el.disabled = true;
          try {
            await callApi(action, targetId);
            await window.loadFriendState(targetId, box);
            vnToast(actionLabel(action) + " done");
          } catch (e) {
            vnToast("Could not " + actionLabel(action).toLowerCase() + ": " + e.message);
            el.disabled = false;
          }
        });
        box.appendChild(el);
      });

      box.style.display = "flex";
      box.style.gap = "8px";
      box.style.flexWrap = "wrap";
      box.style.marginTop = "12px";
    } catch (e) {
      console.warn("loadFriendState failed:", e);
      box.style.display = "none";
    }
  };

  // Keep the old contract alive: existing markup calls loadFriendState(id)
  // with no box id and expects the #profileFriendBox container.
  if (!window.__veilFriendBoxLegacyShim) {
    window.__veilFriendBoxLegacyShim = true;
    var legacy = window.loadFriendState;
    window.loadFriendState = function (targetId) {
      var box = document.getElementById("profileFriendBox");
      if (box) return legacy(targetId, box);
      return legacy(targetId);
    };
  }
})();

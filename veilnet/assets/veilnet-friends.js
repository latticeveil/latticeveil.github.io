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

  function confirmText(a) {
    if (a === "unfriend") return "Remove this friend? They will no longer see you in their friends list.";
    if (a === "block") return "Block this player? They cannot send you messages or friend requests.";
    if (a === "decline") return "Decline this friend request?";
    return "";
  }

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
          if (confirmNeeded(action) && !confirm(confirmText(action))) return;
          el.disabled = true;
          try {
            await callApi(action, targetId);
            await window.loadFriendState(targetId, box);
          } catch (e) {
            alert("Could not " + actionLabel(action).toLowerCase() + ": " + e.message);
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

/*!
 * Veilnet boot guard — runs synchronously in <head> BEFORE any async work.
 *
 * Purpose: kill the "Admin tab pops in as I navigate between pages" flicker.
 * localStorage is available synchronously, so we can decide at FIRST PAINT
 * whether the visitor has a cached admin session and un-hide the static
 * Admin nav slot immediately — no waiting for Supabase, no waiting for
 * veilnet.js to parse.
 *
 * Also detects stale cached-HTML (old pages w/o the static Admin slot) and
 * forces one background reload once per hour, so users stuck on pre-upgrade
 * markup get the new pages automatically.
 */
(function () {
  "use strict";
  var ADMIN_FLAG = "veilnet_is_admin";
  var STALE_KEY = "veilnet_stale_nav_reloaded";

  function isAdminCached() {
    try {
      var raw = localStorage.getItem(ADMIN_FLAG);
      if (!raw) return false;
      if (raw === "1") return true;

      // Backwards-compatible: full object cache may be present instead.
      var v = JSON.parse(raw);
      return !!(v && (v.admin === true || v.isAdmin === true));
    } catch (e) {
      return false;
    }
  }

  function revealAdmin() {
    var links = document.querySelectorAll('[data-veil-admin-nav]');
    for (var i = 0; i < links.length; i++) {
      links[i].classList.add("vn-admin-on");
    }
    var nav = document.querySelector("nav.nav") || document.querySelector(".topbar .nav");
    if (nav && !nav.querySelector("[data-veil-admin-nav]")) {
      // Only when stale cached HTML lacks the static Admin slot: create it
      // synchronously at the end of the nav so admins still see the tab.
      if (isAdminCached()) {
        var a = document.createElement("a");
        a.setAttribute("data-veil-admin-nav", "");
        a.href = "/veilnet/admin/";
        a.textContent = "Admin";
        a.classList.add("vn-admin-on");
        nav.appendChild(a);
      }
    }
  }

  // Synchronous first paint — runs before body finishes parsing.
  revealAdmin();

  // Stale-HTML autorecovery: if this page has no static admin slot in its
  // markup AND we've cached an admin session, the visitor is probably on an
  // old cached HTML from GitHub Pages. Reload once per hour (sessionStorage
  // guard prevents reload loops).
  function staleHtmlCheck() {
    try {
      if (!document.querySelector("nav.nav [data-veil-admin-nav]")) {
        var last = parseInt(sessionStorage.getItem(STALE_KEY) || "0", 10);
        var now = Date.now();
        if (isAdminCached() && now - last > 60 * 60 * 1000) {
          sessionStorage.setItem(STALE_KEY, String(now));
          location.reload(true);
          return;
        }
      }
    } catch (e) { /* sessionStorage may be blocked */ }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", staleHtmlCheck);
  } else {
    staleHtmlCheck();
  }
})();

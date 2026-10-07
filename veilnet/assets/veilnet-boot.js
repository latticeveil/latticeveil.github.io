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

/* MOBILE BOTTOM TAB BAR — icons + active-tab highlight.
 * mobile-nav.css re-skins .topbar .nav as a fixed bottom bar under 980px;
 * this block injects an inline SVG icon <span> into each tab and marks the
 * tab matching the current URL as active. Pure presentation — runs for all
 * users, no auth involved.
 */
(function () {
  "use strict";

  var ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/></svg>',
    community: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M2.8 20c.6-3.2 3.2-5 6.2-5s5.6 1.8 6.2 5"/><circle cx="17" cy="9" r="2.6"/><path d="M15.4 15.3c2.8.2 5.4 1.8 5.8 4.7"/></svg>',
    accomplishments: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M17 5h3a3 3 0 0 1-3 4"/><path d="M7 5H4a3 3 0 0 0 3 4"/><path d="M12 14v4"/><path d="M8 21h8"/><path d="M9 18h6"/></svg>',
    friends: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-8 8c-1.5 0-3-.4-4.2-1.1L3 20l1.2-4.6A8 8 0 1 1 21 12Z"/></svg>',
    admin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 8 4 4 5-6 5 6 4-4v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/></svg>'
  };

  function mountIcons() {
    var nav = document.querySelector("nav.nav") || document.querySelector(".topbar .nav");
    if (!nav || nav.dataset.vnTabsWired) return;
    nav.dataset.vnTabsWired = "1";

    var links = nav.querySelectorAll("a");
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var href = a.getAttribute("href") || "";
      var kind = null;
      if (href.indexOf("/veilnet/") !== -1 && /\/veilnet\/?$/.test(href.replace(/[?#].*$/, ""))) kind = "home";
      else if (href.indexOf("/community/") !== -1) kind = "community";
      else if (href.indexOf("/accomplishments/") !== -1) kind = "accomplishments";
      else if (href.indexOf("/messages/") !== -1) kind = "friends";
      else if (a.hasAttribute("data-veil-admin-nav")) kind = "admin";
      if (!kind) continue;

      var icon = document.createElement("span");
      icon.className = "vn-tab-icon";
      icon.innerHTML = ICONS[kind];
      a.insertBefore(icon, a.firstChild);

      // Active tab: resolve the href against this page's location and
      // compare canonicalized paths. Handles absolute (/veilnet/community/)
      // and relative (../community/) href forms on every page layout.
      var locPath = location.pathname.replace(/\/index\.html$/, "/");
      try {
        var resolved = new URL(href, location.href).pathname.replace(/\/index\.html$/, "/");
        if (resolved === locPath) a.classList.add("vn-active");
      } catch (e) { /* href parse failed - skip active marking */ }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountIcons);
  } else {
    mountIcons();
  }
})();

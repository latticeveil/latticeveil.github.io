// Messaging Safety Warning — mandatory, unskippable gate for messaging.
//
// EVERYONE (new and existing users) must accept this ONCE per messaging
// policy version before any part of the messaging UI becomes usable.
// No bypass: without acceptance the composer is disabled and sending is
// blocked at the UI level (server still enforces its own rules).
(function () {
  "use strict";

  // Bump MESSAGING_POLICY_VERSION whenever the warning text changes;
  // all users are forced to re-accept on their next visit.
  var POLICY_VERSION = "1";
  var LS_KEY = "veilnet_msg_warning_accepted_v" + POLICY_VERSION;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function isAccepted() {
    try { return localStorage.getItem(LS_KEY) === "true"; } catch (e) { return false; }
  }

  function markAccepted() {
    try { localStorage.setItem(LS_KEY, "true"); } catch (e) { /* storage blocked */ }
  }

  // Lock the app while unresolved: composer disabled + click/keyboard shield.
  function lockApp() {
    var app = document.getElementById("msgApp");
    if (!app) return;
    app.classList.add("msg-guard-locked");
    document.querySelectorAll("#msgInput, #msgSendBtn").forEach(function (el) {
      el.disabled = true;
    });
  }

  function unlockApp() {
    var app = document.getElementById("msgApp");
    if (app) app.classList.remove("msg-guard-locked");
    document.querySelectorAll("#msgInput, #msgSendBtn").forEach(function (el) {
      el.disabled = false;
    });
  }

  function injectStyles() {
    if (document.getElementById("ms-guard-styles")) return;
    var st = document.createElement("style");
    st.id = "ms-guard-styles";
    st.textContent =
      // React-like shielding: when locked, the whole app area ignores input.
      ".msg-guard-locked{pointer-events:none;filter:blur(2px);user-select:none;}" +
      ".msg-guard-locked #msgInput,.msg-guard-locked #msgSendBtn{opacity:.5;}" +
      ".msw-overlay{position:fixed;inset:0;background:rgba(0,0,0,.88);backdrop-filter:blur(6px);" +
      "z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;}" +
      ".msw-card{max-width:620px;width:100%;max-height:86vh;overflow-y:auto;border-radius:14px;padding:26px 28px;" +
      "background:var(--panel,#15131c);border:2px solid #ff5d5d;box-shadow:0 12px 48px rgba(255,93,93,.25);color:var(--text,#e8e6f0);}" +
      ".msw-card h2{margin:0 0 6px;font-size:1.55rem;color:#ff5d5d;}" +
      ".msw-card h3{margin:20px 0 8px;font-size:1.05rem;color:var(--cyan,#38e1ff);}" +
      ".msw-card p,.msw-card li{line-height:1.65;font-size:1rem;}" +
      ".msw-card ul{margin:6px 0 6px 20px;}" +
      ".msw-card a{color:var(--cyan,#38e1ff);text-decoration:underline;}" +
      ".msw-check{display:flex;align-items:center;gap:12px;background:rgba(255,93,93,.09);" +
      "border:1px solid #ff5d5d;border-radius:10px;padding:14px;margin:20px 0 14px;cursor:pointer;min-height:56px;}" +
      ".msw-check input{width:24px;height:24px;accent-color:#ff5d5d;margin:0;cursor:pointer;flex:none;pointer-events:auto;}" +
      ".msw-check span{font-size:1rem;line-height:1.5;}" +
      ".msw-note{font-size:.92rem;opacity:.75;margin-bottom:14px;}" +
      ".msw-btn{width:100%;padding:14px;border:2px solid #ff5d5d;background:transparent;color:#ff5d5d;" +
      "border-radius:8px;font-size:1.1rem;cursor:pointer;font-weight:600;transition:all .2s;opacity:.45;pointer-events:none;}" +
      ".msw-btn.ready{opacity:1;pointer-events:auto;background:#ff5d5d;color:#1b1520;}" +
      ".msw-foot{margin-top:14px;font-size:.88rem;opacity:.75;text-align:center;}";
    document.head.appendChild(st);
  }

  function show(onDone) {
    injectStyles();
    lockApp();

    var overlay = document.createElement("div");
    overlay.className = "msw-overlay";
    overlay.innerHTML =
      '<div class="msw-card" role="dialog" aria-modal="true" aria-labelledby="mswTitle">' +
      '<h2 id="mswTitle">⚠️ Messaging Safety Notice</h2>' +
      "<p><strong>Before you can use messages on Veilnet, you must read and accept these rules.</strong> " +
      "This applies to every member — including people who joined before this warning existed.</p>" +

      '<h3>🔒 Never share passwords</h3>' +
      "<p><strong>Veilnet staff, moderators, and developers will NEVER ask for your password.</strong> " +
      "Never type your password — for LatticeVeil, Google, or any other account — into a message, " +
      "and never share it with another member, even someone claiming to be a moderator or a friend. " +
      "Anyone who asks for your password is trying to steal your account.</p>" +

      '<h3>🤫 Messaging is entirely private</h3>' +
      "<p>Direct messages between members are private. Only you and the other person can read them. " +
      "Behave as if a trusted friend is in the room: keep messages respectful and age-appropriate. " +
      "Staff do not read private messages.</p>" +

      '<h3>⚠️ Important awareness</h3>' +
      "<ul>" +
      "<li><strong>Never share personal information</strong> — real names, addresses, phone numbers, school names, or financial details.</li>" +
      "<li><strong>Treat others with respect</strong> — harassment, spam, or inappropriate content may result in losing messaging access.</li>" +
      "<li><strong>A report option is coming</strong> — reporting inappropriate messages will be added soon. In the meantime, use the Block option on a player's profile if someone makes you uncomfortable.</li>" +
      "</ul>" +

      '<h3>📜 Responsibility & Liability</h3>' +
      "<p><strong>LatticeVeil is not responsible</strong> for anything that happens as a result of messaging on the platform — " +
      "including bad experiences, conflicts, mistakes, or harm related to information you choose to share. " +
      "You message other members entirely at your own risk. We are an independent project, and we cannot " +
      "supervise or monitor private conversations.</p>" +

      '<label class="msw-check"><input type="checkbox" id="mswAgree">' +
      "<span>I have read and accept the Messaging Safety Notice. I understand messaging is private, I must never share passwords, and LatticeVeil is not responsible for outcomes of my private conversations.</span></label>" +

      '<p class="msw-note">You cannot use messaging until you accept. There is no way to skip this.</p>' +
      '<button class="msw-btn" id="mswAccept" disabled>Accept &amp; Enable Messaging</button>' +
      '<div class="msw-foot">A record that you accepted this warning is stored on this device only.</div>' +
      "</div>";

    document.body.appendChild(overlay);

    var cb = overlay.querySelector("#mswAgree");
    var btn = overlay.querySelector("#mswAccept");
    var savedScroll = 0;

    function update() {
      var ready = cb.checked;
      btn.classList.toggle("ready", ready);
      btn.disabled = !ready;
    }
    cb.addEventListener("change", update);

    // Block background scrolling while the warning is open; restore after.
    savedScroll = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.style.overflow = "hidden";

    btn.addEventListener("click", function () {
      if (!cb.checked) return;
      markAccepted();
      document.body.style.overflow = "";
      try { window.scrollTo(0, savedScroll); } catch (e) { /* ignore */ }
      overlay.remove();
      unlockApp();
      if (onDone) onDone();
    });

    // Initial state (checkbox starts unchecked)
    update();
  }

  function maybeShow(onDone) {
    if (isAccepted()) { if (onDone) onDone(); return; }
    show(onDone);
  }

  // Wire into the messages page once the DOM is ready.
  function wire() {
    var app = document.getElementById("msgApp");
    if (!app) return;
    // Block interaction until accepted.
    lockApp();
    // Show immediately if not yet accepted; otherwise leave the app alone.
    if (!isAccepted()) show();
    // If messages.js logic tries to enable inputs later, keep them disabled until accepted.
    var guard = setInterval(function () {
      if (isAccepted()) { clearInterval(guard); unlockApp(); return; }
      lockApp();
    }, 500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();

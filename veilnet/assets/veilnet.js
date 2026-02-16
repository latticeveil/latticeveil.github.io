/* Veilnet Demo JS (no backend) */
(function(){
  const VEILNET_API_BASE = "https://veilnet.onrender.com";

  // System Spinning Up Overlay Logic
  function initSystemOverlay() {
    // Only run on Veilnet landing page
    if (!location.pathname.includes("/veilnet/") || 
        location.pathname.includes("/veilnet/community/") ||
        location.pathname.includes("/veilnet/messages/") ||
        location.pathname.includes("/veilnet/profile/") ||
        location.pathname.includes("/veilnet/settings/") ||
        location.pathname.includes("/veilnet/post/")) {
      return;
    }

    const overlay = document.getElementById('systemOverlay');
    const retryCount = document.getElementById('retryCount');
    const failureDiv = document.getElementById('systemFailure');
    
    if (!overlay) return;

    let attempt = 0;
    const maxAttempts = 20;

    function showOverlay() {
      overlay.style.display = 'flex';
      setTimeout(() => overlay.classList.add('show'), 10);
    }

    function hideOverlay() {
      overlay.classList.remove('show');
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 300);
    }

    function showFailure() {
      failureDiv.style.display = 'block';
    }

    async function checkBackend() {
      attempt++;
      retryCount.textContent = attempt;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 800);

      try {
        const response = await fetch(`${VEILNET_API_BASE}/health`, {
          mode: 'cors',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok && response.status === 200) {
          hideOverlay();
          return true;
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        clearTimeout(timeoutId);

        if (attempt >= maxAttempts) {
          showFailure();
          return false;
        }

        // Retry logic: attempts 1-10 every 2s, 11-20 exponential backoff capped at 8s
        let delay;
        if (attempt <= 10) {
          delay = 2000;
        } else {
          delay = Math.min(8000, Math.pow(2, attempt - 10) * 1000);
        }

        setTimeout(checkBackend, delay);
        return false;
      }
    }

    // Start checking immediately
    showOverlay();
    checkBackend();
  }

  const ASSET = (p)=> {
    // works from /veilnet/* pages
    const base = location.pathname.includes("/veilnet/") ? "../assets/" : "assets/";
    // If we're already in /veilnet root, adjust
    if (location.pathname.endsWith("/veilnet/") || location.pathname.endsWith("/veilnet/index.html")) return "assets/" + p;
    if (location.pathname.includes("/veilnet/community/") || location.pathname.includes("/veilnet/post/") || location.pathname.includes("/veilnet/profile/") || location.pathname.includes("/veilnet/messages/") || location.pathname.includes("/veilnet/settings/")){
      return "../assets/" + p;
    }
    return base + p;
  };

  const storage = {
    get(k, d=null){ try{ const v = localStorage.getItem(k); return v===null? d: JSON.parse(v);}catch{ return d; } },
    set(k, v){ localStorage.setItem(k, JSON.stringify(v)); },
    del(k){ localStorage.removeItem(k); }
  };

  const demoUsers = {
    "RedactedDev": { role:"Owner", status:"online", source:"In-game", theme:"#38e1ff", about:"Builder of worlds. Keeper of the Veil.", headline:"Tuning worldgen + Veilnet.", },
    "VoxelCrafter": { role:"", status:"online", source:"On Veilnet", theme:"#7cf7ff", about:"I like caves and neon crystals.", headline:"Sharing screenshots.", },
    "StoneWarden": { role:"Moderator", status:"away", source:"On Veilnet", theme:"#ffd84d", about:"Report issues, keep it clean.", headline:"AFK but watching.", },
    "MinerJay": { role:"", status:"offline", source:"", theme:"#38e1ff", about:"Ore goblin.", headline:"", },
  };

  const demoPosts = [
    { id: 482, title:"First Veilnet Drop", author:"RedactedDev", ts:"Just now", likes:12, dislikes:0, comments:4, summary:"Welcome to Veilnet. This is a static demo of the layout, vibe, and navigation.", banner:true },
    { id: 479, title:"Worldforge Screenshot Thread", author:"VoxelCrafter", ts:"2 hours ago", likes:33, dislikes:1, comments:11, summary:"Post screenshots from your world. In the real version, uploads come only from in-game screenshots.", banner:true },
    { id: 461, title:"Gate/Presence Progress Update", author:"StoneWarden", ts:"Yesterday", likes:18, dislikes:2, comments:5, summary:"Presence rings will show online (in-game or active site), away (idle), offline.", banner:false },
  ];

  const demoMessages = [
    { id:"c1", with:"VoxelCrafter", last:"yo that crystal cave looked insane", unread:1 },
    { id:"c2", with:"StoneWarden", last:"mod queue is clean today", unread:0 },
  ];

  function ringColor(status){
    if(status==="online") return "var(--green)";
    if(status==="away") return "var(--yellow)";
    return "var(--red)";
  }
  function statusLabel(u){
    const user = demoUsers[u] || {};
    if(user.status==="online") return `Online (${user.source || "On Veilnet"})`;
    if(user.status==="away") return "Away";
    return "Offline";
  }

  function ensureHeader(){
    // attach dropdown toggles and login mocks
    const avatarBtn = document.querySelector("[data-veil-avatar]");
    const dd = document.querySelector("[data-veil-dropdown]");
    if(!avatarBtn || !dd) return;

    avatarBtn.addEventListener("click",(e)=>{
      e.stopPropagation();
      dd.classList.toggle("open");
    });
    document.addEventListener("click",()=> dd.classList.remove("open"));

    const loggedIn = storage.get("veilnet.loggedIn", false);
    const username = storage.get("veilnet.username", "RedactedDev");

    // Avatar image
    const avatarImg = document.querySelector("[data-veil-avatar-img]");
    const ddImg = document.querySelector("[data-veil-dd-img]");
    const ddTitle = document.querySelector("[data-veil-dd-title]");
    const ddSub = document.querySelector("[data-veil-dd-sub]");
    const ddLogin = document.querySelector("[data-veil-login]");
    const ddLogout = document.querySelector("[data-veil-logout]");
    const ddMyProfile = document.querySelector("[data-veil-myprofile]");
    const ddSettings = document.querySelector("[data-veil-settings]");

    const pfp = ASSET("default_pfp.png");
    if(avatarImg) avatarImg.src = pfp;
    if(ddImg) ddImg.src = pfp;

    if(loggedIn){
      if(ddTitle) ddTitle.textContent = username;
      if(ddSub) ddSub.textContent = statusLabel(username);
      if(ddLogin) ddLogin.style.display="none";
      if(ddLogout) ddLogout.style.display="flex";
      if(ddMyProfile) ddMyProfile.style.display="flex";
      if(ddSettings) ddSettings.style.display="flex";
      // ring color based on user status
      const ring = document.querySelector("[data-veil-ring]");
      const ring2 = document.querySelector("[data-veil-ring2]");
      const col = ringColor((demoUsers[username]||{}).status || "offline");
      if(ring){ ring.style.setProperty("--ring", col); }
      if(ring2){ ring2.style.setProperty("--ring", col); }
    }else{
      if(ddTitle) ddTitle.textContent = "Not signed in";
      if(ddSub) ddSub.textContent = "Login to access Veilnet features";
      if(ddLogin) ddLogin.style.display="flex";
      if(ddLogout) ddLogout.style.display="none";
      if(ddMyProfile) ddMyProfile.style.display="none";
      if(ddSettings) ddSettings.style.display="none";
      const ring = document.querySelector("[data-veil-ring]");
      const ring2 = document.querySelector("[data-veil-ring2]");
      if(ring){ ring.style.setProperty("--ring", "rgba(255,255,255,.25)"); ring.style.opacity=".55"; }
      if(ring2){ ring2.style.setProperty("--ring", "rgba(255,255,255,.25)"); ring2.style.opacity=".55"; }
    }

    if(ddLogin){
      ddLogin.addEventListener("click",()=>{
        storage.set("veilnet.loggedIn", true);
        storage.set("veilnet.username", "RedactedDev");
        location.reload();
      });
    }
    if(ddLogout){
      ddLogout.addEventListener("click",()=>{
        storage.set("veilnet.loggedIn", false);
        location.reload();
      });
    }

    if(ddMyProfile){
      ddMyProfile.addEventListener("click",()=>{
        // /veilnet/profile/?u=...
        const dest = (location.pathname.includes("/veilnet/") && !location.pathname.endsWith("/veilnet/") && !location.pathname.endsWith("/veilnet/index.html"))
          ? "../profile/index.html?u=" + encodeURIComponent(username)
          : "profile/index.html?u=" + encodeURIComponent(username);
        location.href = dest;
      });
    }
    if(ddSettings){
      ddSettings.addEventListener("click",()=>{
        const dest = (location.pathname.includes("/veilnet/") && !location.pathname.endsWith("/veilnet/") && !location.pathname.endsWith("/veilnet/index.html"))
          ? "../settings/index.html"
          : "settings/index.html";
        location.href = dest;
      });
    }
  }

  function renderHome(){
    const feed = document.querySelector("[data-veil-feed]");
    if(!feed) return;
    feed.innerHTML = demoPosts.map(p=>{
      const author = demoUsers[p.author] || {};
      const pfp = ASSET("default_pfp.png");
      const postLink = "post/index.html?id=" + p.id;
      const authorLink = "profile/index.html?u=" + encodeURIComponent(p.author);
      return `
        <article class="card">
          ${p.banner ? `<div class="card-banner"></div>` : ``}
          <div class="card-body">
            <h2 class="card-title">${escapeHtml(p.title)}</h2>
            <div class="card-meta">
              <div class="who">
                <div class="mini"><img src="${pfp}" alt=""></div>
                <div>
                  <div style="font-weight:900"><a href="${authorLink}">${escapeHtml(p.author)}</a> <span class="tag">${escapeHtml(statusLabel(p.author))}</span></div>
                  <div class="small">${escapeHtml(p.ts)} • ${escapeHtml(p.summary)}</div>
                </div>
              </div>
              <div class="actions">
                <span class="pill">👍 ${p.likes}</span>
                <span class="pill">👎 ${p.dislikes}</span>
                <span class="pill">💬 ${p.comments}</span>
                <a class="btn ghost" href="${postLink}">Open</a>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderCommunity(){
    const list = document.querySelector("[data-veil-community-list]");
    if(!list) return;
    list.innerHTML = demoPosts.map(p=>{
      const postHref = "./../post/index.html?id=" + p.id;
      const authorHref = "./../profile/index.html?u=" + encodeURIComponent(p.author);
      return `
        <div class="panel" style="padding:12px; margin: 12px 0">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap">
            <div>
              <div style="font-weight:1000; font-size:18px">${escapeHtml(p.title)}</div>
              <div class="small">by <a href="${authorHref}" style="color:var(--cyan); font-weight:900">${escapeHtml(p.author)}</a> • ${escapeHtml(p.ts)}</div>
            </div>
            <div style="display:flex; gap:10px; align-items:center">
              <span class="pill">👍 ${p.likes}</span>
              <span class="pill">👎 ${p.dislikes}</span>
              <span class="pill">💬 ${p.comments}</span>
              <a class="btn" href="${postHref}">Open Post</a>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderPost(){
    const root = document.querySelector("[data-veil-post]");
    if(!root) return;
    const id = Number(new URLSearchParams(location.search).get("id") || demoPosts[0].id);
    const p = demoPosts.find(x=>x.id===id) || demoPosts[0];
    const authorHref = "./../profile/index.html?u=" + encodeURIComponent(p.author);
    root.innerHTML = `
      <div class="profile-hero">
        <div class="profile-banner"></div>
        <div style="padding:18px">
          <div class="breadcrumbs"><a href="./../index.html">Veilnet</a> / <a href="./../community/index.html">Community</a> / Post #${p.id}</div>
          <h1 style="margin:10px 0 8px">${escapeHtml(p.title)}</h1>
          <div class="small">by <a href="${authorHref}" style="color:var(--cyan); font-weight:900">${escapeHtml(p.author)}</a> • ${escapeHtml(p.ts)}</div>
          <div class="kpis" style="margin-top:12px">
            <span class="kpi">👍 <b>${p.likes}</b></span>
            <span class="kpi">👎 <b>${p.dislikes}</b></span>
            <span class="kpi">💬 <b>${p.comments}</b></span>
          </div>
          <hr class="sep">
          <p style="line-height:1.6; color:var(--text)">
            ${escapeHtml(p.summary)}<br><br>
            <span class="small">Demo note:</span> In the real Veilnet, this post would be moderated before appearing publicly, with comments auto-filtered + reviewable in a queue.
          </p>
          <div class="notice" style="margin-top:12px">
            <b style="color:var(--text)">Comments (demo)</b><br>
            <div class="small">Comments will have the same moderation pipeline as posts. Auto-flagged comments go to a review queue.</div>
          </div>
          <div style="margin-top:12px">
            ${renderComment("VoxelCrafter","This is exactly the vibe. The gold + cyan looks premium.","online")}
            ${renderComment("StoneWarden","Reminder: only in-game screenshots/videos will be allowed.","away")}
          </div>
          <div class="panel" style="padding:12px; margin-top:12px">
            <div style="font-weight:900; margin-bottom:8px">Add a comment (demo)</div>
            <textarea placeholder="Write a comment... (not actually sent)"></textarea>
            <div style="display:flex; justify-content:flex-end; margin-top:10px">
              <button class="btn" type="button" onclick="alert('Demo only — no backend yet.')">Post Comment</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderComment(user, text, status){
    const pfp = ASSET("default_pfp.png");
    const ring = status==="online" ? "var(--green)" : status==="away" ? "var(--yellow)" : "var(--red)";
    const href = "./../profile/index.html?u=" + encodeURIComponent(user);
    return `
      <div class="panel" style="padding:12px; margin: 10px 0; border-color: rgba(255,255,255,.10)">
        <div style="display:flex; gap:12px; align-items:flex-start">
          <div style="position:relative">
            <div class="avatar" style="width:36px; height:36px"><img src="${pfp}" alt=""></div>
            <div class="status-ring" style="--ring:${ring}; inset:-5px; border-width:2px"></div>
          </div>
          <div style="flex:1">
            <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap">
              <div><a href="${href}" style="font-weight:1000; color:var(--text)">${escapeHtml(user)}</a> <span class="tag">${escapeHtml(statusLabel(user))}</span></div>
              <div class="small">Just now</div>
            </div>
            <div style="margin-top:6px; color:var(--text); line-height:1.5">${escapeHtml(text)}</div>
          </div>
        </div>
      </div>
    `;
  }

  function renderProfile(){
    const root = document.querySelector("[data-veil-profile]");
    if(!root) return;
    const u = new URLSearchParams(location.search).get("u") || "RedactedDev";
    const user = demoUsers[u] || demoUsers["RedactedDev"];
    const pfp = ASSET("default_pfp.png");
    const ring = ringColor(user.status || "offline");
    const roleBadge = user.role
      ? `<span class="badge ${user.role==='Moderator'?'mod': user.role==='Owner'?'admin':'admin'}">${escapeHtml(user.role)}</span>`
      : ``;

    const theme = storage.get("veilnet.theme."+u, user.theme || "#38e1ff");
    root.innerHTML = `
      <div class="profile-hero" style="border-color: color-mix(in srgb, ${theme} 45%, rgba(56,225,255,.18));">
        <div class="profile-banner"></div>
        <div class="profile-header">
          <div class="profile-avatar" style="border-color: color-mix(in srgb, ${theme} 35%, rgba(255,255,255,.10));">
            <img src="${pfp}" alt="">
            <div class="status-ring" style="--ring:${ring}"></div>
          </div>
          <div style="flex:1">
            <div class="profile-name">
              <div style="font-size:26px; font-weight:1000">${escapeHtml(u)}</div>
              ${roleBadge}
              <span class="tag">${escapeHtml(statusLabel(u))}</span>
            </div>
            <div class="subline">${escapeHtml(user.headline || "—")}</div>
            <div class="small" style="margin-top:8px">Theme accent: <span style="font-weight:900; color:${theme}">${theme}</span></div>
          </div>
          <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; justify-content:flex-end">
            <a class="btn" href="./../messages/index.html">Message</a>
            <button class="btn gold" type="button" id="btn-invite">Invite (demo)</button>
          </div>
        </div>

        <div class="tabs">
          <button class="tab active" data-tab="about">About</button>
          <button class="tab" data-tab="media">Media</button>
          <button class="tab" data-tab="ach">Achievements</button>
          <button class="tab" data-tab="timeline">Timeline</button>
        </div>
      </div>

      <div style="height:14px"></div>

      <div class="two-col">
        <div class="panel">
          <h3>About</h3>
          <div class="inner">
            <div style="font-weight:900; margin-bottom:6px">Status message (moderated)</div>
            <div class="notice">${escapeHtml(user.headline || "No status set.")}</div>
            <hr class="sep">
            <div style="font-weight:900; margin-bottom:6px">About Me (moderated)</div>
            <div style="line-height:1.6">${escapeHtml(user.about || "No about me yet.")}</div>
          </div>
        </div>

        <div class="panel">
          <h3>Quick actions</h3>
          <div class="inner">
            <div class="notice">
              <b style="color:var(--text)">Presence ring rules</b><br>
              <div class="small">Green = online (in-game or active on Veilnet). Yellow = away (idle). Red = offline.</div>
            </div>
            <hr class="sep">
            <div style="font-weight:900; margin-bottom:8px">Theme border color</div>
            <input type="color" id="themePicker" value="${theme}" style="width:100%; height:44px; padding:8px">
            <div class="small" style="margin-top:8px">This is a demo-only picker. In the real site, this would save to your account and sync.</div>
            <hr class="sep">
            <div style="font-weight:900; margin-bottom:8px">Uploads (demo)</div>
            <button class="btn" type="button" onclick="alert('Demo only. In-game will upload screenshots to Imgur and videos to YouTube (unlisted).')">Upload screenshot</button>
          </div>
        </div>
      </div>
    `;

    const tabs = root.querySelectorAll(".tab");
    tabs.forEach(t=>{
      t.addEventListener("click", ()=>{
        tabs.forEach(x=>x.classList.remove("active"));
        t.classList.add("active");
        const key = t.dataset.tab;
        alert("Demo: switching tabs to '" + key + "'. Real version will render content per tab.");
      });
    });

    root.querySelector("#btn-invite")?.addEventListener("click",()=>{
      alert("Demo only — this will send a game invite and open the launcher via protocol later.");
    });

    const picker = root.querySelector("#themePicker");
    picker?.addEventListener("input", ()=>{
      storage.set("veilnet.theme."+u, picker.value);
    });
    picker?.addEventListener("change", ()=> location.reload());
  }

  function renderMessages(){
    const list = document.querySelector("[data-veil-convos]");
    const chat = document.querySelector("[data-veil-chat]");
    if(!list || !chat) return;

    const convId = new URLSearchParams(location.search).get("c") || demoMessages[0].id;
    list.innerHTML = demoMessages.map(c=>{
      const href = "./index.html?c=" + encodeURIComponent(c.id);
      const active = c.id===convId;
      return `
        <a class="side-link" href="${href}" style="${active?'background: rgba(56,225,255,.07); box-shadow: 0 0 0 1px rgba(56,225,255,.12) inset':''}">
          <span style="font-weight:1000">${escapeHtml(c.with)}</span>
          ${c.unread? `<span class="tag" style="border-color: rgba(56,225,255,.25); color: var(--cyan)">${c.unread} new</span>`: `<span class="tag">—</span>`}
        </a>
      `;
    }).join("");

    const convo = demoMessages.find(x=>x.id===convId) || demoMessages[0];
    const pfp = ASSET("default_pfp.png");
    chat.innerHTML = `
      <div class="chat panel">
        <h3 style="padding:14px 14px 10px">Chat with ${escapeHtml(convo.with)}</h3>
        <div class="msgs">
          <div class="msg">
            <div class="meta">${escapeHtml(convo.with)} • 2m ago</div>
            yo — the new Veilnet logo goes hard.
          </div>
          <div class="msg me">
            <div class="meta">You • 1m ago</div>
            thanks. here's a screenshot (demo embed):
            <div style="margin-top:8px">
              <img src="${pfp}" alt="demo image">
              <div class="small" style="margin-top:6px">In real Veilnet: images come only from in-game uploads (Imgur) and can be marked downloadable or view-only.</div>
            </div>
          </div>
          <div class="msg">
            <div class="meta">${escapeHtml(convo.with)} • just now</div>
            sick. invite me when you're in the new world.
          </div>
        </div>
        <div class="composer">
          <input style="flex:1" placeholder="Message… (demo)">
          <button class="btn" type="button" onclick="alert('Demo only — no backend yet.')">Send</button>
        </div>
      </div>
    `;
  }

  function renderSettings(){
    const root = document.querySelector("[data-veil-settings-root]");
    if(!root) return;
    const loggedIn = storage.get("veilnet.loggedIn", false);
    root.innerHTML = `
      <div class="panel" style="padding:16px">
        <h1 style="margin:0 0 8px">Settings</h1>
        <div class="small">Demo-only controls. Real version will save to backend.</div>
        <hr class="sep">
        <div class="notice">
          <b style="color:var(--text)">Account</b><br>
          <div class="small">OAuth login for web. Launcher uses EOS Device ID. Linking unifies profile + achievements.</div>
        </div>
        <hr class="sep">
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px">
          <div class="panel" style="padding:12px">
            <div style="font-weight:900">Link game account</div>
            <div class="small" style="margin-top:6px">In the real flow, the launcher would show a code/QR to link Device ID to your web account.</div>
            <button class="btn gold" type="button" style="margin-top:10px" onclick="alert('Demo only — link flow will be implemented later.')">Start link flow</button>
          </div>
          <div class="panel" style="padding:12px">
            <div style="font-weight:900">Presence</div>
            <div class="small" style="margin-top:6px">Green when in-game or actively using Veilnet; Yellow when idle; Red when offline.</div>
            <button class="btn" type="button" style="margin-top:10px" onclick="alert('Demo only — presence comes from pings + activity tracking later.')">View presence debug</button>
          </div>
        </div>
        <hr class="sep">
        <div class="small">Logged in (demo): <b>${loggedIn ? "Yes" : "No"}</b></div>
      </div>
    `;
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    initSystemOverlay(); // Initialize system overlay first
    ensureHeader();
    renderHome();
    renderCommunity();
    renderPost();
    renderProfile();
    renderMessages();
    renderSettings();
  });
})();

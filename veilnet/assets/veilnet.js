/* Veilnet Demo JS - Supabase Only */
(function(){
  // Supabase client initialization - DISABLED
  // const supabase = window.supabase.createClient(
  //   'https://lqghurvonrvrxfwjgkuu.supabase.co',
  //   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZ2h1cnZvbnJ2cnhmd2prdXUiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczOTg0MTQ2MCwiZXhwIjoyMDU1NDE3NDYwfQ.9oJv3M7vQWzjRQ9a_0L5mYJjJ5eJ5k5J5k5J5k5J5k5J5k5J5k5J5k'
  // );

  // const VEILNET_API_BASE = "https://lqghurvonrvrxfwjgkuu.supabase.co/functions/v1";

  // System Spinning Up Overlay Logic - REMOVED (Supabase only)
  function initSystemOverlay() {
    // DISABLED - No more backend spinning up required
    return;
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

  // Unified identity helper using VeilnetAuth
  async function getCurrentUser() {
    try {
      const user = await VeilnetAuth.getUser();
      if (!user) return { loggedIn: false, user: null, profile: null };
      
      let profile = null;
      try { 
        profile = await VeilnetAuth.getMyProfile(); 
      } catch(e) {
        // Profile might not exist yet
      }
      
      return { loggedIn: true, user, profile };
    } catch (error) {
      console.error('Error getting current user:', error);
      return { loggedIn: false, user: null, profile: null };
    }
  }

  // Numeric unread badge management
  function setUnreadBadges(count) {
    const profileBadge = document.getElementById('vnUnreadBadgeProfile');
    const messagesBadge = document.getElementById('vnUnreadBadgeMessages');
    
    if (count <= 0) {
      // Hide both badges
      if (profileBadge) {
        profileBadge.classList.add('vn-badge--hidden');
      }
      if (messagesBadge) {
        messagesBadge.classList.add('vn-badge--hidden');
      }
    } else {
      // Show both badges with count
      const displayText = count > 99 ? '99+' : count.toString();
      
      if (profileBadge) {
        profileBadge.textContent = displayText;
        profileBadge.classList.remove('vn-badge--hidden');
      }
      if (messagesBadge) {
        messagesBadge.textContent = displayText;
        messagesBadge.classList.remove('vn-badge--hidden');
      }
    }
  }

  function computeUnreadCountFromConversations(conversations, username) {
    let unreadCount = 0;
    
    for (const conv of conversations) {
      // Prefer backend fields if available
      if (conv.unreadCount && typeof conv.unreadCount === 'number') {
        unreadCount += conv.unreadCount;
      } else if (conv.hasUnread === true) {
        unreadCount += 1;
      } else {
        // Fallback: use localStorage timestamps
        const lastSeenKey = `veilnet.lastSeenMessageAt.${conv.id}`;
        const lastSeen = storage.get(lastSeenKey, 0);
        
        if (conv.lastMessage && conv.lastMessage.timestamp) {
          const msgTime = new Date(conv.lastMessage.timestamp).getTime();
          if (msgTime > lastSeen && conv.lastMessage.sender !== username) {
            unreadCount += 1;
          }
        }
      }
    }
    
    return unreadCount;
  }

  // refreshUnreadBadges - DISABLED
  async function refreshUnreadBadges() {
    console.log('refreshUnreadBadges disabled');
    return;
  }

  // Unread indicator management (legacy - kept for compatibility)
  function updateUnreadIndicator() {
    const currentUser = getCurrentUser();
    const indicator = document.getElementById('unreadIndicator');
    
    if (!currentUser.loggedIn || !currentUser.username) {
      if (indicator) indicator.style.display = 'none';
      return;
    }

    // For now, hide the old indicator since we're using numeric badges
    if (indicator) indicator.style.display = 'none';
  }

  // NEW: Unread MESSAGE count logic
  function setProfileUnreadBadge(total) {
    const profileBadge = document.getElementById('vnUnreadBadgeProfile');
    
    console.log('setProfileUnreadBadge called with:', total, 'badge element:', profileBadge);
    
    if (total <= 0) {
      // Hide badge
      if (profileBadge) profileBadge.classList.add('vn-badge--hidden');
    } else {
      // Show badge with count
      const displayText = total > 99 ? '99+' : String(total);
      
      if (profileBadge) {
        profileBadge.textContent = displayText;
        profileBadge.classList.remove('vn-badge--hidden');
      }
    }
  }

  function setUnreadMessageBadges(total) {
    const profileBadge = document.getElementById('vnUnreadBadgeProfile');
    const messagesBadge = document.getElementById('vnUnreadBadgeMessages');
    
    if (total <= 0) {
      // Hide both badges
      if (profileBadge) profileBadge.classList.add('vn-badge--hidden');
      if (messagesBadge) messagesBadge.classList.add('vn-badge--hidden');
    } else {
      // Show both badges with count
      const displayText = total > 99 ? '99+' : String(total);
      
      if (profileBadge) {
        profileBadge.textContent = displayText;
        profileBadge.classList.remove('vn-badge--hidden');
      }
      if (messagesBadge) {
        messagesBadge.textContent = displayText;
        messagesBadge.classList.remove('vn-badge--hidden');
      }
    }
  }

  function getTs(obj) {
    if (!obj) return Date.now();
    
    if (obj.timestamp) {
      return typeof obj.timestamp === 'string' ? Date.parse(obj.timestamp) : obj.timestamp;
    }
    if (obj.createdAt) {
      return typeof obj.createdAt === 'string' ? Date.parse(obj.createdAt) : obj.createdAt;
    }
    if (obj.time) {
      return typeof obj.time === 'string' ? Date.parse(obj.time) : obj.time;
    }
    
    return Date.now();
  }

  function sumUnreadFromStorage() {
    let total = 0;
    const prefix = 'veilnet.unreadCount.';
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const value = localStorage.getItem(key);
        const count = parseInt(value, 10) || 0;
        total += count;
      }
    }
    
    console.log('sumUnreadFromStorage calculated total:', total);
    setProfileUnreadBadge(total);
    return total;
  }

  // Cross-tab synchronization - DISABLED
  function initCrossTabSync() {
    console.log('initCrossTabSync disabled');
    return;
  }
  
  function initLocalStorageSync() {
    // Fallback: localStorage events - DISABLED
    console.log('initLocalStorageSync disabled');
    return;
  }
  
  function triggerCrossTabSync() {
    console.log('triggerCrossTabSync disabled');
    return;
  }

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

  // OAuth callback functionality disabled
  async function handleOAuthCallback() {
    console.log('OAuth callback disabled');
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  
  // Check for OAuth callback on page load - disabled
  if (false && (window.location.search.includes('code=') || window.location.search.includes('error='))) {
    handleOAuthCallback();
  }

  // Login modal functions
  function ensureVeilnetLoginModal() {
    let overlay = document.getElementById('veilnet-login-overlay');
    if (overlay) return { overlay, card: overlay.querySelector('#veilnet-login-card'), gsiBtn: overlay.querySelector('#veilnet-gsi-button'), errorEl: overlay.querySelector('#veilnet-gsi-error') };

    overlay = document.createElement('div');
    overlay.id = 'veilnet-login-overlay';
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:9999;
      display:none;
      align-items:center; justify-content:center;
      background: rgba(0,0,0,0.65);
      padding: 24px;
    `;

    const card = document.createElement('div');
    card.id = 'veilnet-login-card';
    card.style.cssText = `
      width: min(520px, 100%);
      background: rgba(10,14,20,0.92);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 18px;
      box-shadow: 0 20px 80px rgba(0,0,0,0.55);
      padding: 28px 26px;
      display:flex;
      flex-direction:column;
      align-items:center;
      gap: 14px;
      position:relative;
    `;

    card.innerHTML = `
      <button id="veilnet-modal-close" style="
        position:absolute; top:16px; right:16px; cursor:pointer;
        background:none; border:none; color:var(--text); font-size:1.5rem;
      ">×</button>
      <h2 style="margin:0; color:var(--text); font-size:1.5rem; font-weight:600;">Sign in to Veilnet</h2>
      <div id="veilnet-gsi-wrap" style="
        width:100%;
        display:flex;
        justify-content:center;
        align-items:center;
      "><div id="veilnet-gsi-button"></div></div>
      <div id="veilnet-gsi-error" style="
        color:#ff6b6b;
        min-height: 20px;
        text-align:center;
        font-size:0.875rem;
      "></div>
      <a id="veilnet-open-login-page" href="/veilnet/login.html" style="
        color:var(--accent);
        text-decoration:none;
        font-size:0.875rem;
        opacity:0.8;
      ">Open login page</a>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // Close handlers
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeVeilnetLoginModal();
    });
    
    card.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    document.getElementById('veilnet-modal-close').addEventListener('click', closeVeilnetLoginModal);
    document.getElementById('veilnet-open-login-page').addEventListener('click', closeVeilnetLoginModal);

    return { overlay, card, gsiBtn: overlay.querySelector('#veilnet-gsi-button'), errorEl: overlay.querySelector('#veilnet-gsi-error') };
  }

  function closeVeilnetLoginModal() {
    const overlay = document.getElementById('veilnet-login-overlay');
    if (overlay) overlay.style.display = 'none';
    window.__veilnet_gis_handler = null;
  }

  async function ensureGisInitialized() {
    if (window.__veilnet_gis_initialized) return;
    
    if (!window.google || !google.accounts || !google.accounts.id) {
      throw new Error("Google Identity Services failed to load.");
    }
    
    google.accounts.id.initialize({
      client_id: VEILNET_CONFIG.GOOGLE_CLIENT_ID,
      callback: (resp) => {
        if (typeof window.__veilnet_gis_handler === "function") {
          window.__veilnet_gis_handler(resp);
        }
      }
    });
    
    window.__veilnet_gis_initialized = true;
  }

  async function openVeilnetLoginModal() {
    const { overlay, gsiBtn, errorEl } = ensureVeilnetLoginModal();
    
    overlay.style.display = "flex";
    errorEl.textContent = "";
    gsiBtn.innerHTML = "";
    gsiBtn.style.cssText = "display:flex; justify-content:center; width:100%";

    // Initialize GIS only once
    if (!window.__veilnet_gis_inited) {
      if (!window.google || !google.accounts || !google.accounts.id) {
        throw new Error("Google Identity Services failed to load.");
      }
      
      google.accounts.id.initialize({
        client_id: VEILNET_CONFIG.GOOGLE_CLIENT_ID,
        callback: (resp) => {
          if (typeof window.__veilnet_gis_handler === "function") {
            window.__veilnet_gis_handler(resp);
          }
        }
      });
      
      window.__veilnet_gis_inited = true;
    }

    // Set handler for this modal session
    window.__veilnet_gis_handler = async (resp) => {
      try {
        errorEl.textContent = "";
        if (!resp || !resp.credential) throw new Error("No credential returned from Google.");

        const { error } = await VeilnetAuth.signInWithGoogleIdToken(resp.credential);
        if (error) throw error;

        const profile = await VeilnetAuth.ensureMyProfile();
        if (!profile?.username) {
          window.location.href = "/veilnet/setup-username.html";
          return;
        }

        overlay.style.display = "none";
        await refreshHeaderUI();
      } catch (e) {
        console.error("Veilnet login failed:", e);
        errorEl.textContent = e?.message || String(e);
      }
    };

    google.accounts.id.renderButton(
      gsiBtn,
      { theme: "outline", size: "large", shape: "pill" }
    );
  }

  async function refreshHeaderUI() {
  const nameEl = document.getElementById("veilnet-display-name");
  const subEl = document.getElementById("veilnet-display-subtext");
  const avatarEl = document.getElementById("veilnet-avatar");
  const loginItem = document.getElementById("veilnet-login-item");
  const logoutItem = document.getElementById("veilnet-logout-item");

  // if dropdown not present, just return (avoid errors on other pages)
  if (!nameEl && !subEl && !avatarEl && !loginItem && !logoutItem) return;

  try {
    const user = await VeilnetAuth.getUser();

    if (!user) {
      if (nameEl) nameEl.textContent = "Not signed in";
      if (subEl) subEl.textContent = "Login to access Veilnet features";
      if (avatarEl) avatarEl.src = "assets/default_pfp.png";
      if (loginItem) loginItem.style.display = "";
      if (logoutItem) logoutItem.style.display = "none";
      return;
    }

    const profile = await VeilnetAuth.ensureMyProfile();
    const displayName = profile?.username || profile?.name || user.email || "Signed in";
    const avatarUrl = profile?.picture || "assets/default_pfp.png";

    if (nameEl) nameEl.textContent = displayName;
    if (avatarEl) avatarEl.src = avatarUrl;

    if (!profile?.username) {
      if (subEl) subEl.textContent = "Choose a username";
      // Show setup username link if available
      const setupLink = document.getElementById("veilnet-setup-username");
      if (setupLink) setupLink.style.display = "";
    } else {
      if (subEl) subEl.textContent = "Online via Google";
      // Hide setup username link if available
      const setupLink = document.getElementById("veilnet-setup-username");
      if (setupLink) setupLink.style.display = "none";
    }

    if (loginItem) loginItem.style.display = "none";
    if (logoutItem) logoutItem.style.display = "";
  } catch (e) {
    console.error("refreshHeaderUI failed:", e);
  }
}

// Expose for debugging
window.refreshHeaderUI = refreshHeaderUI;

  async function ensureHeader(){
    // attach dropdown toggles and login mocks
    const avatarBtn = document.querySelector("[data-veil-avatar]");
    const dd = document.querySelector("[data-veil-dropdown]");
    if(!avatarBtn || !dd) return;

    avatarBtn.addEventListener("click",(e)=>{
      e.stopPropagation();
      dd.classList.toggle("open");
    });
    document.addEventListener("click",()=> dd.classList.remove("open"));

    const currentUser = await getCurrentUser();
    
    // Get display identity from VeilnetAuth
    const identity = await VeilnetAuth.getDisplayIdentity();
    
    // Avatar image
    const avatarImg = document.querySelector("[data-veil-avatar-img]");
    const ddImg = document.querySelector("[data-veil-dd-img]");
    const ddTitle = document.querySelector("[data-veil-dd-title]");
    const ddSub = document.querySelector("[data-veil-dd-sub]");
    const ddLogin = document.querySelector("[data-veil-login]");
    const ddLogout = document.querySelector("[data-veil-logout]");
    const ddMyProfile = document.querySelector("[data-veil-myprofile]");
    const ddSettings = document.querySelector("[data-veil-settings]");

    const pfp = identity?.picture || ASSET("default_pfp.png");
    if(avatarImg) avatarImg.src = pfp;
    if(ddImg) ddImg.src = pfp;
    
    if(identity){
      if(ddTitle) ddTitle.textContent = identity.displayName;
      if(ddSub) ddSub.textContent = "Online via Google";
      if(ddLogin) ddLogin.style.display="none";
      if(ddLogout) ddLogout.style.display="flex";
      if(ddMyProfile) ddMyProfile.style.display="flex";
      if(ddSettings) ddSettings.style.display="flex";
      // ring color based on user status
      const ring = document.querySelector("[data-veil-ring]");
      const ring2 = document.querySelector("[data-veil-ring2]");
      if(ring){ ring.style.setProperty("--ring", "rgba(56,225,255,.25)"); ring.style.opacity=".55"; }
      if(ring2){ ring2.style.setProperty("--ring", "rgba(56,225,255,.25)"); ring2.style.opacity=".55"; }
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
      ddLogin.addEventListener("click",async ()=>{
        dd.classList.remove("open");
        openVeilnetLoginModal();
      });
    }
    if(ddLogout){
      ddLogout.addEventListener("click",async ()=>{
        await VeilnetAuth.logout();
        await refreshHeaderUI();
      });
    }

    if(ddMyProfile){
      ddMyProfile.addEventListener("click",()=>{
        const username = currentUser.profile?.username || currentUser.user?.email;
        const dest = (location.pathname.includes("/veilnet/") && !location.pathname.endsWith("/veilnet/") && !location.pathname.endsWith("/veilnet/index.html"))
          ? `../profile/?u=${encodeURIComponent(username)}`
          : `profile/?u=${encodeURIComponent(username)}`;
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
    
    // Refresh header UI with auth state
    await refreshHeaderUI();
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
      const authorHref = "./../profile/?u=" + encodeURIComponent(p.author);
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
    const authorHref = "./../profile/?u=" + encodeURIComponent(p.author);
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

  // renderMessages - DISABLED
  async function renderMessages(){
    console.log('renderMessages disabled');
    return;
  }

  function renderSettings(){
    const root = document.querySelector("[data-veil-settings]");
    if(!root) return;
    
    const currentUser = getCurrentUser();
    const loggedIn = currentUser.loggedIn;
    
    root.innerHTML = `
      <div class="panel">
        <h3>Account</h3>
        <div class="inner">
          <div style="font-weight:900; margin-bottom:6px">Account Status</div>
          <div class="small">Logged in (demo): <b>${loggedIn ? "Yes" : "No"}</b></div>
        </div>
      </div>
    `;
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    // initSystemOverlay(); // DISABLED - No more backend spinning up
    ensureHeader();
    renderHome();
    renderCommunity();
    renderPost();
    renderProfile();
    // renderMessages(); // DISABLED
    renderSettings();
    
    // Initialize unread indicator for all pages
    updateUnreadIndicator();
    
    // Initialize numeric unread MESSAGE badges for all pages
    // refreshUnreadFromServer(); // DISABLED
    
    // Initialize cross-tab synchronization
    // initCrossTabSync(); // DISABLED
    
    // Refresh header UI with auth state
    refreshHeaderUI();
  });
})();

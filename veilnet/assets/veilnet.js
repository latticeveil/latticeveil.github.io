/* Veilnet Demo JS (no backend) */
(function(){
  const VEILNET_API_BASE = "https://lqghurvonrvrxfwjgkuu.supabase.co/functions/v1/veilnet-auth-v2";

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

  // Unified identity helper
  function getCurrentUser() {
    const loggedIn = storage.get('veilnet.loggedIn', false);
    const username = storage.get('veilnet.username', null);
    return { loggedIn, username };
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

  async function refreshUnreadBadges() {
    const currentUser = getCurrentUser();
    
    if (!currentUser.loggedIn || !currentUser.username) {
      setUnreadBadges(0);
      return;
    }

    try {
      const response = await fetch(`${VEILNET_API_BASE}/api/conversations`, {
        headers: {
          'X-Veilnet-User': currentUser.username,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const conversations = await response.json();
        const unreadCount = computeUnreadCountFromConversations(conversations, currentUser.username);
        setUnreadBadges(unreadCount);
      } else {
        setUnreadBadges(0);
      }
    } catch (error) {
      console.error('Failed to refresh unread badges:', error);
      setUnreadBadges(0);
    }
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

  async function refreshUnreadFromServer() {
    const user = getCurrentUser();
    if (!user.loggedIn || !user.username) {
      setProfileUnreadBadge(0);
      return;
    }

    try {
      const response = await fetch(`${VEILNET_API_BASE}/api/conversations`, {
        headers: {
          'X-Veilnet-User': user.username,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        setProfileUnreadBadge(0);
        return;
      }
      
      const conversations = await response.json();
      
      for (const conv of conversations) {
        const convId = conv.id;
        const unreadKey = `veilnet.unreadCount.${convId}`;
        const lastSeenKey = `veilnet.lastSeenMessageAt.${convId}`;
        
        // Prefer backend unread count if available
        if (conv.unreadCount && typeof conv.unreadCount === 'number') {
          localStorage.setItem(unreadKey, String(conv.unreadCount));
        } else if (conv.unreadMessages && typeof conv.unreadMessages === 'number') {
          localStorage.setItem(unreadKey, String(conv.unreadMessages));
        } else {
          // Fallback: set minimum count (1) if there's an unread message
          const existingCount = parseInt(localStorage.getItem(unreadKey) || '0', 10);
          const lastSeen = parseInt(localStorage.getItem(lastSeenKey) || '0', 10);
          
          if (conv.lastMessage && conv.lastMessage.sender !== user.username) {
            const msgTs = getTs(conv.lastMessage);
            if (msgTs > lastSeen) {
              // At least 1 unread message
              const newCount = Math.max(existingCount, 1);
              localStorage.setItem(unreadKey, String(newCount));
            }
          }
        }
      }
      
      sumUnreadFromStorage();
    } catch (error) {
      console.error('Failed to refresh unread from server:', error);
      setProfileUnreadBadge(0);
    }
  }

  // Cross-tab synchronization
  let broadcastChannel = null;
  
  function initCrossTabSync() {
    // Preferred: BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        broadcastChannel = new BroadcastChannel('veilnet');
        broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'unread:changed') {
            sumUnreadFromStorage();
            // If on messages page and loadConversations is available, refresh conversation list
            if (location.pathname.includes('/veilnet/messages/')) {
              try {
                if (typeof loadConversations === 'function') {
                  loadConversations();
                }
              } catch (error) {
                console.log('loadConversations not available in this context');
              }
            }
          }
        };
      } catch (error) {
        console.log('BroadcastChannel not available, falling back to localStorage');
        initLocalStorageSync();
      }
    } else {
      initLocalStorageSync();
    }
  }
  
  function initLocalStorageSync() {
    // Fallback: localStorage events
    window.addEventListener('storage', (event) => {
      if (event.key === 'veilnet.sync') {
        sumUnreadFromStorage();
        // If on messages page and loadConversations is available, refresh conversation list
        if (location.pathname.includes('/veilnet/messages/')) {
          try {
            if (typeof loadConversations === 'function') {
              loadConversations();
            }
          } catch (error) {
            console.log('loadConversations not available in this context');
          }
        }
      }
    });
  }
  
  function triggerCrossTabSync() {
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'unread:changed' });
    } else {
      // Fallback: localStorage
      localStorage.setItem('veilnet.sync', Date.now().toString());
    }
  }

  async function fetchUnreadStatus(username) {
    const indicator = document.getElementById('unreadIndicator');
    if (!indicator) return;

    try {
      const response = await fetch(`${VEILNET_API_BASE}/api/conversations`, {
        headers: {
          'X-Veilnet-User': username,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const conversations = await response.json();
        const hasUnread = conversations.some(conv => {
          // Check backend unread signals
          if (conv.hasUnread || conv.unreadCount > 0) return true;
          
          // Fallback: check last seen timestamps
          const lastSeenKey = `veilnet.lastSeenMessageAt.${conv.id}`;
          const lastSeen = storage.get(lastSeenKey, 0);
          
          if (conv.lastMessage && conv.lastMessage.timestamp) {
            const msgTime = new Date(conv.lastMessage.timestamp).getTime();
            return msgTime > lastSeen && conv.lastMessage.sender !== username;
          }
          
          return false;
        });
        
        indicator.style.display = hasUnread ? 'block' : 'none';
      }
    } catch (error) {
      console.error('Failed to fetch unread status:', error);
      indicator.style.display = 'none';
    }
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

  // Handle OAuth callback
    function handleOAuthCallback() {
      const urlParams = new URLSearchParams(window.location.search);
      const loginStatus = urlParams.get('login');
      const userData = urlParams.get('user');
      
      if (loginStatus === 'success' && userData) {
        try {
          const user = JSON.parse(decodeURIComponent(userData));
          storage.set("veilnet.loggedIn", true);
          storage.set("veilnet.username", user.username || user.email);
          storage.set("veilnet.user", JSON.stringify(user));
          
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Update UI
          ensureHeader();
          console.log('User logged in:', user.username || user.email);
        } catch (error) {
          console.error('Failed to parse user data:', error);
        }
      } else if (loginStatus === 'error') {
        console.error('Login failed');
      }
    }
    
    // Check for OAuth callback on page load
    if (window.location.search.includes('login=')) {
      handleOAuthCallback();
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
    const username = storage.get("veilnet.username", "");
    const userData = storage.get("veilnet.user", "{}");
    
    let user = {};
    try {
      user = JSON.parse(userData);
    } catch (e) {
      // Fallback to demo user if no real user data
      user = { email: username };
    }

    // Avatar image
    const avatarImg = document.querySelector("[data-veil-avatar-img]");
    const ddImg = document.querySelector("[data-veil-dd-img]");
    const ddTitle = document.querySelector("[data-veil-dd-title]");
    const ddSub = document.querySelector("[data-veil-dd-sub]");
    const ddLogin = document.querySelector("[data-veil-login]");
    const ddLogout = document.querySelector("[data-veil-logout]");
    const ddMyProfile = document.querySelector("[data-veil-myprofile]");
    const ddSettings = document.querySelector("[data-veil-settings]");

    const pfp = user.picture || ASSET("default_pfp.png");
    if(avatarImg) avatarImg.src = pfp;
    if(ddImg) ddImg.src = pfp;
    
    if(loggedIn){
      if(ddTitle) ddTitle.textContent = user.username || user.name || user.email;
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
      ddLogin.addEventListener("click",()=>{
        // Redirect to Google OAuth on your existing Veilnet backend
        const authUrl = 'https://veilnet.onrender.com/auth/google';
        window.location.href = authUrl;
      });
    }
    if(ddLogout){
      ddLogout.addEventListener("click",async ()=>{
        try {
          // Call your existing Veilnet backend logout
          const response = await fetch('https://veilnet.onrender.com/api/logout', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            storage.set("veilnet.loggedIn", false);
            storage.set("veilnet.username", "");
            storage.set("veilnet.user", "");
            location.reload();
          } else {
            console.error('Logout failed:', response.status);
            // Force logout on frontend even if backend fails
            storage.set("veilnet.loggedIn", false);
            storage.set("veilnet.username", "");
            storage.set("veilnet.user", "");
            location.reload();
          }
        } catch (error) {
          console.error('Logout error:', error);
          // Force logout on frontend even if network fails
          storage.set("veilnet.loggedIn", false);
          storage.set("veilnet.username", "");
          storage.set("veilnet.user", "");
          location.reload();
        }
      });
    }

    if(ddMyProfile){
      ddMyProfile.addEventListener("click",()=>{
        // /profile/?u=USERNAME or ../profile/?u=USERNAME
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

  function renderMessages(){
    const list = document.querySelector("[data-veil-convos]");
    const chat = document.querySelector("[data-veil-chat]");
    if(!list || !chat) return;

    // Only run on messages page
    if (!location.pathname.includes("/veilnet/messages/")) return;

    const VEILNET_API_BASE = "https://lqghurvonrvrxfwjgkuu.supabase.co/functions/v1/veilnet-auth-v2";
    let socket = null;
    let currentConversationId = null;
    const currentUser = getCurrentUser();
    let currentUsername = currentUser.username || "RedactedDev";
    const isGuest = !currentUser.loggedIn || !currentUsername || currentUsername === "guest";
    
    // Message deduplication and resync
    const seenMessages = new Set();
    let socketInitialized = false;
    let resyncInterval = null;
    let isResyncing = false;
    
    // Conversation state management
    let conversationsById = new Map();
    let lastMessagePreview = new Map();

    // Connection banner and retry logic
    const connectionBanner = document.getElementById('connectionBanner');
    let connectionAttempts = 0;
    const maxConnectionAttempts = 10;

    function showConnectionBanner() {
      if (connectionBanner) {
        connectionBanner.style.display = 'flex';
      }
    }

    function hideConnectionBanner() {
      if (connectionBanner) {
        connectionBanner.style.display = 'none';
      }
    }

    function showReconnectingBanner() {
      if (connectionBanner) {
        connectionBanner.innerHTML = `
          <div class="banner-content">
            <span>Reconnecting…</span>
            <div class="banner-spinner"></div>
          </div>
        `;
        connectionBanner.style.display = 'flex';
      }
    }

    function startResync() {
      if (resyncInterval || isGuest) return;
      
      resyncInterval = setInterval(async () => {
        // Only resync when page is visible
        if (document.visibilityState === 'visible') {
          // Resync active conversation messages
          if (currentConversationId) {
            await resyncConversation(currentConversationId);
          }
          
          // Resync conversation list for new messages
          await resyncConversationsList();
        }
      }, 5000);
    }

    function stopResync() {
      if (resyncInterval) {
        clearInterval(resyncInterval);
        resyncInterval = null;
      }
    }

    async function resyncConversation(conversationId) {
      if (isResyncing || !conversationId) return;
      
      isResyncing = true;
      try {
        const messages = await apiCall(`${VEILNET_API_BASE}/api/conversations/${conversationId}/messages?limit=50`);
        const container = document.getElementById('messagesContainer');
        
        if (container) {
          messages.forEach(msg => {
            if (!isDuplicateMessage(msg)) {
              container.insertAdjacentHTML('beforeend', renderMessage(msg));
            }
          });
          container.scrollTop = container.scrollHeight;
        }
      } catch (error) {
        console.error('Resync failed:', error);
      } finally {
        isResyncing = false;
      }
    }

    async function resyncConversationsList() {
      try {
        const conversations = await apiCall(`${VEILNET_API_BASE}/api/conversations`);
        
        // Check for new messages and update state
        conversations.forEach(conv => {
          const existingConv = conversationsById.get(conv.id);
          const existingPreview = lastMessagePreview.get(conv.id);
          
          // Update conversation state
          conversationsById.set(conv.id, conv);
          
          if (conv.lastMessage) {
            const newPreview = {
              text: conv.lastMessage.text,
              author: conv.lastMessage.sender,
              time: new Date(conv.lastMessage.timestamp)
            };
            
            // Check if this is a newer message
            if (!existingPreview || newPreview.time > existingPreview.time) {
              lastMessagePreview.set(conv.id, newPreview);
            }
          }
        });
        
        // Re-render conversation list with updated state
        renderConversationList(conversations);
        
      } catch (error) {
        console.error('Conversation list resync failed:', error);
      }
    }

    function showGuestBanner() {
      if (connectionBanner) {
        connectionBanner.innerHTML = `
          <div class="banner-content">
            <span>Log in to message.</span>
          </div>
        `;
        connectionBanner.style.display = 'flex';
      }
    }

    function getMessageSignature(message) {
      // Create a unique signature for deduplication
      if (message.id) {
        return `id:${message.id}`;
      }
      // Fallback to content-based signature
      return `${message.sender}|${message.text}|${message.timestamp}`;
    }

    function isDuplicateMessage(message) {
      const signature = getMessageSignature(message);
      if (seenMessages.has(signature)) {
        return true;
      }
      seenMessages.add(signature);
      // Keep only last 1000 signatures to prevent memory leak
      if (seenMessages.size > 1000) {
        const firstItem = seenMessages.values().next().value;
        seenMessages.delete(firstItem);
      }
      return false;
    }

    async function apiCall(url, options = {}) {
      const defaultOptions = {
        headers: {
          'Content-Type': 'application/json',
          'X-Veilnet-User': currentUsername
        }
      };

      const response = await fetch(url, { ...defaultOptions, ...options });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    }

    async function loadConversations() {
      try {
        const conversations = await apiCall(`${VEILNET_API_BASE}/api/conversations`);
        
        // Update conversation state
        conversationsById.clear();
        conversations.forEach(conv => {
          conversationsById.set(conv.id, conv);
          if (conv.lastMessage) {
            lastMessagePreview.set(conv.id, {
              text: conv.lastMessage.text,
              author: conv.lastMessage.sender,
              time: new Date(conv.lastMessage.timestamp)
            });
          }
        });
        
        renderConversationList(conversations);
        hideConnectionBanner();
        
        // Auto-select first conversation if available (non-guest only)
        if (conversations.length > 0 && !currentConversationId && !isGuest) {
          selectConversation(conversations[0].id);
        } else if (isGuest) {
          showGuestBanner();
        }
      } catch (error) {
        console.error('Failed to load conversations:', error);
        if (connectionAttempts < maxConnectionAttempts) {
          connectionAttempts++;
          showConnectionBanner();
          setTimeout(loadConversations, 2000);
        } else {
          hideConnectionBanner();
          if (isGuest) {
            showGuestBanner();
          } else {
            renderEmptyState();
          }
        }
      }
    }

    function renderConversationList(conversations) {
      if (conversations.length === 0) {
        renderEmptyState();
        return;
      }

      // Sort conversations by last message time
      const sortedConversations = [...conversations].sort((a, b) => {
        const aTime = a.lastMessage ? new Date(a.lastMessage.timestamp) : new Date(0);
        const bTime = b.lastMessage ? new Date(b.lastMessage.timestamp) : new Date(0);
        return bTime - aTime;
      });

      list.innerHTML = sortedConversations.map(conv => {
        const otherUser = conv.participants.find(p => p !== currentUsername) || 'Unknown';
        const isActive = conv.id === currentConversationId;
        const unreadKey = `veilnet.unreadCount.${conv.id}`;
        const unreadCount = parseInt(storage.get(unreadKey) || '0', 10);
        const isUnread = unreadCount > 0;
        const lastMsg = conv.lastMessage;
        const preview = lastMessagePreview.get(conv.id);
        
        return `
          <a class="side-link conversation-item" href="#" data-conversation-id="${conv.id}" style="${isActive?'background: rgba(56,225,255,.07); box-shadow: 0 0 0 1px rgba(56,225,255,.12) inset':''}">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
              <span style="font-weight:1000; ${isUnread ? 'color: var(--cyan);' : ''}">${escapeHtml(otherUser)}</span>
              ${isUnread ? '<span class="unread-badge">NEW</span>' : '<span class="tag" style="border-color: rgba(56,225,255,.25); color: var(--cyan);">—</span>'}
            </div>
            ${preview ? `<div class="small" style="margin-top: 4px; opacity: 0.7;">${escapeHtml(preview.author)}: ${escapeHtml(preview.text.substring(0, 50))}${preview.text.length > 50 ? '...' : ''}</div>` : ''}
          </a>
        `;
      }).join('');

      // Add click handlers
      list.querySelectorAll('.conversation-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          const convId = parseInt(item.dataset.conversationId);
          selectConversation(convId);
        });
      });
    }

    function renderEmptyState() {
      if (isGuest) {
        list.innerHTML = `
          <div style="text-align: center; padding: 20px; color: var(--muted);">
            <div style="margin-bottom: 16px;">No conversations yet</div>
            <div style="margin-bottom: 16px; color: var(--red);">Log in to start messaging.</div>
          </div>
        `;
      } else {
        list.innerHTML = `
          <div style="text-align: center; padding: 20px; color: var(--muted);">
            <div style="margin-bottom: 16px;">No conversations yet</div>
            <button class="btn" onclick="startNewChat()">Start Chat</button>
          </div>
        `;
      }
    }

    function startNewChat() {
      if (isGuest) {
        alert('Log in to start messaging.');
        return;
      }
      
      const otherUser = prompt('Enter username to chat with:');
      if (!otherUser || otherUser.trim() === '') return;
      
      createConversation(otherUser.trim());
    }

    async function createConversation(otherUser) {
      try {
        const conversation = await apiCall(`${VEILNET_API_BASE}/api/conversations`, {
          method: 'POST',
          body: JSON.stringify({ with: otherUser })
        });
        
        // Reload conversations and select the new one
        await loadConversations();
        selectConversation(conversation.id);
      } catch (error) {
        console.error('Failed to create conversation:', error);
        alert('Failed to create conversation. Please try again.');
      }
    }

    async function selectConversation(conversationId) {
      if (isGuest) {
        alert('Log in to view conversations.');
        return;
      }

      const prevConversationId = currentConversationId;
      currentConversationId = conversationId;
      
      // Update conversation list to remove unread badge
      const conv = conversationsById.get(conversationId);
      if (conv) {
        renderConversationList(Array.from(conversationsById.values()));
      }
      
      // Update UI selection
      list.querySelectorAll('.conversation-item').forEach(item => {
        const isActive = parseInt(item.dataset.conversationId) === conversationId;
        if (isActive) {
          item.style.background = 'rgba(56,225,255,.07)';
          item.style.boxShadow = '0 0 0 1px rgba(56,225,255,.12) inset';
        } else {
          item.style.background = '';
          item.style.boxShadow = '';
        }
      });

      // Stop previous resync and start new one
      stopResync();

      // Leave previous room and join new one
      if (socket) {
        if (prevConversationId && prevConversationId !== conversationId) {
          socket.emit('conversation:leave', { conversationId: prevConversationId });
        }
        socket.emit('conversation:join', { conversationId });
      }

      // Load messages
      await loadMessages(conversationId);
      
      // Clear unread count for this conversation
      const unreadKey = `veilnet.unreadCount.${conversationId}`;
      const lastSeenKey = `veilnet.lastSeenMessageAt.${conversationId}`;
      storage.set(unreadKey, '0');
      
      // Update last seen timestamp for this conversation
      const selectedConv = conversationsById.get(conversationId);
      if (selectedConv && selectedConv.lastMessage) {
        storage.set(lastSeenKey, getTs(selectedConv.lastMessage));
      } else {
        storage.set(lastSeenKey, Date.now());
      }
      
      // Update badges and sync
      sumUnreadFromStorage();
      triggerCrossTabSync();
      
      // Start resync for this conversation
      startResync();
    }

    async function loadMessages(conversationId) {
      try {
        const messages = await apiCall(`${VEILNET_API_BASE}/api/conversations/${conversationId}/messages?limit=50`);
        renderChatMessages(messages);
      } catch (error) {
        console.error('Failed to load messages:', error);
        chat.innerHTML = '<div class="panel" style="padding: 20px; text-align: center; color: var(--red);">Failed to load messages</div>';
      }
    }

    function renderChatMessages(messages) {
      // Get other user from conversation data
      let otherUser = 'Unknown';
      const conv = conversationsById.get(currentConversationId);
      if (conv && conv.participants) {
        otherUser = conv.participants.find(p => p !== currentUsername) || 'Unknown';
      } else if (messages.length > 0) {
        // Fallback: infer from message senders
        const senders = new Set(messages.map(msg => msg.sender));
        const otherSenders = Array.from(senders).filter(s => s !== currentUsername);
        otherUser = otherSenders.length > 0 ? otherSenders[0] : 'Unknown';
      }

      // Add all loaded messages to seen set to prevent duplicates
      messages.forEach(msg => seenMessages.add(getMessageSignature(msg)));

      const isDisabled = isGuest ? 'disabled' : '';
      const disabledPlaceholder = isGuest ? 'Log in to message...' : 'Message…';

      chat.innerHTML = `
        <div class="chat panel">
          <h3 style="padding:14px 14px 10px">Chat with ${escapeHtml(otherUser)}</h3>
          <div class="msgs" id="messagesContainer">
            ${messages.map(msg => renderMessage(msg)).join('')}
          </div>
          <div class="composer">
            <input id="messageInput" style="flex:1" placeholder="${disabledPlaceholder}" onkeypress="if(event.key==='Enter') sendMessage()" ${isDisabled}>
            <button class="btn" type="button" onclick="sendMessage()" ${isDisabled}>Send</button>
          </div>
        </div>
      `;

      // Auto-scroll to bottom
      const container = document.getElementById('messagesContainer');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }

    function renderMessage(message) {
      const isMe = message.sender === currentUsername;
      const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      return `
        <div class="msg ${isMe ? 'me' : ''}">
          <div class="meta">${escapeHtml(message.sender)} • ${time}</div>
          ${escapeHtml(message.text)}
        </div>
      `;
    }

    async function sendMessage() {
      if (isGuest) {
        alert('Log in to send messages.');
        return;
      }

      const input = document.getElementById('messageInput');
      const text = input.value.trim();
      
      if (!text || !currentConversationId) return;

      // Clear input immediately
      input.value = '';

      try {
        const savedMessage = await apiCall(`${VEILNET_API_BASE}/api/conversations/${currentConversationId}/messages`, {
          method: 'POST',
          body: JSON.stringify({ text })
        });
        
        // Don't add to seen set here - let the socket event handle it
        // This allows the sender to see their own message via socket
        
        // After sending, refresh conversations to show updated state
        setTimeout(() => {
          loadConversations();
        }, 500);
        
      } catch (error) {
        console.error('Failed to send message:', error);
        // Restore input text on error
        input.value = text;
        alert('Failed to send message. Please try again.');
      }
    }

    // Initialize Socket.IO
    function initSocket() {
      if (typeof io === 'undefined' || socketInitialized) return;
      
      socket = io(VEILNET_API_BASE, { transports: ["websocket", "polling"] });
      socketInitialized = true;
      
      socket.on('connect', () => {
        console.log('Connected to Veilnet backend');
        hideConnectionBanner();
        if (currentConversationId && !isGuest) {
          socket.emit('conversation:join', { conversationId: currentConversationId });
        }
        // Trigger immediate resync on reconnect
        if (currentConversationId) {
          resyncConversation(currentConversationId);
        }
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from Veilnet backend');
        showReconnectingBanner();
      });

      socket.on('reconnect', () => {
        console.log('Reconnected to Veilnet backend');
        hideConnectionBanner();
        if (currentConversationId) {
          resyncConversation(currentConversationId);
        }
      });

      // Remove existing listener before adding new one
      socket.off('message:new');
      socket.on('message:new', (payload) => {
        console.log('Received message:new event:', payload);
        
        // Update conversation state
        const conv = conversationsById.get(payload.conversationId);
        if (conv && payload.message) {
          conv.lastMessage = payload.message;
          conversationsById.set(payload.conversationId, conv);
          
          // Update message preview
          lastMessagePreview.set(payload.conversationId, {
            text: payload.message.text,
            author: payload.message.sender,
            time: new Date(payload.message.timestamp)
          });
        }

        // Handle new message with unread MESSAGE count logic
        const user = getCurrentUser();
        if (!user.loggedIn || !user.username) {
          return; // Ignore if not logged in
        }

        const conversationId = payload.conversationId;
        const message = payload.message;
        
        // Ignore messages from self
        if (message.sender === user.username) {
          return;
        }

        const unreadKey = `veilnet.unreadCount.${conversationId}`;
        const lastSeenKey = `veilnet.lastSeenMessageAt.${conversationId}`;
        const messageTs = getTs(message);

        if (conversationId === currentConversationId && !isGuest) {
          // Message is for currently open conversation - treat as read
          storage.set(unreadKey, '0');
          storage.set(lastSeenKey, messageTs);
          
          // Add message to UI if on messages page
          const container = document.getElementById('messagesContainer');
          if (container) {
            if (!isDuplicateMessage(message)) {
              container.insertAdjacentHTML('beforeend', renderMessage(message));
              container.scrollTop = container.scrollHeight;
            }
          }
        } else {
          // Message is for different conversation - increment unread count
          const currentCount = parseInt(storage.get(unreadKey) || '0', 10);
          const newCount = currentCount + 1;
          storage.set(unreadKey, String(newCount));
          storage.set(lastSeenKey, messageTs); // Update last seen to avoid double counting
          
          // Update conversation list if on messages page
          if (location.pathname.includes('/veilnet/messages/')) {
            const conv = conversationsById.get(conversationId);
            if (conv && conv.lastMessage) {
              conv.lastMessage = message;
              conversationsById.set(conversationId, conv);
              renderConversationList(Array.from(conversationsById.values()));
            }
            
            // If this is a new conversation not in our list, reload conversations
            if (!conversationsById.has(conversationId)) {
              console.log('New conversation detected, reloading list');
              loadConversations();
            }
          }
        }

        // Update badges and sync across tabs
        sumUnreadFromStorage();
        triggerCrossTabSync();
      });

      // Handle messages cleared event
      socket.off('messages:cleared');
      socket.on('messages:cleared', (payload) => {
        console.log('Messages cleared event received:', payload);
        
        // Clear all local state
        conversationsById.clear();
        // Clear all unread message counts from localStorage
        const prefix = 'veilnet.unreadCount.';
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            localStorage.removeItem(key);
          }
        }
        lastMessagePreview.clear();
        seenMessages.clear();
        currentConversationId = null;
        
        // Stop resync
        stopResync();
        
        // Reload conversations list (will be empty)
        loadConversations();
        
        // Update badges to reflect cleared state
        sumUnreadFromStorage();
        
        // Clear chat panel
        const chat = document.querySelector('[data-veil-chat]');
        if (chat) {
          chat.innerHTML = '<div class="panel" style="padding: 20px; text-align: center; color: var(--cyan);">All conversations have been cleared.</div>';
        }
      });

      // Handle conversation updated event (for cross-tab refreshes)
      socket.off('conversation:updated');
      socket.on('conversation:updated', (payload) => {
        console.log('Conversation updated event received:', payload);
        
        // Update conversation state
        const conv = conversationsById.get(payload.conversationId);
        if (conv && payload.lastMessage) {
          conv.lastMessage = payload.lastMessage;
          conversationsById.set(payload.conversationId, conv);
          
          // Update message preview
          lastMessagePreview.set(payload.conversationId, {
            text: payload.lastMessage.text,
            author: payload.lastMessage.sender,
            time: new Date(payload.lastMessage.timestamp)
          });
        }
        
        // Always refresh conversation list to show latest updates
        renderConversationList(Array.from(conversationsById.values()));
      });
    }

    // Make sendMessage globally available
    window.sendMessage = sendMessage;
    window.startNewChat = startNewChat;

    // Handle visibility changes for resync
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && currentConversationId && !isGuest) {
        startResync();
      } else {
        stopResync();
      }
    });

    // Initialize
    initSocket();
    loadConversations();
    
    // Initialize unread indicator for all pages
    updateUnreadIndicator();
    
    // Initialize numeric unread MESSAGE badges for all pages
    refreshUnreadFromServer();
    
    // Initialize cross-tab synchronization
    initCrossTabSync();
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
    
    // Initialize unread indicator for all pages
    updateUnreadIndicator();
    
    // Initialize numeric unread MESSAGE badges for all pages
    refreshUnreadFromServer();
    
    // Initialize cross-tab synchronization
    initCrossTabSync();
  });
})();

// Reader Configuration & State - Initialized with safe defaults
const state = {
    theme: 'theme-oled',
    font: 'font-serif',
    size: 18,
    zoom: 1.0,
    lineHeight: 1.6,
    letterSpacing: 0,
    paraSpacing: 1.5,
    pageWidth: 700,
    textAlign: 'justify',
    scroll: 0,
    chapter: 1,
    highContrast: false,
    focusMode: false,
    voiceName: '',
    tempo: 250,
    showLore: true,
    showHighlight: true,
    zoomLocked: false,
    highlightMode: false,
    highlightStart: null,
    selectedColor: 'rgba(242, 193, 78, 0.4)',
    wakeLock: false,
    speaking: false,
    readAlongActive: false,
    comments: {}
};

// Load state from localStorage safely
function loadPersistentState() {
    try {
        state.theme = localStorage.getItem('reader_theme') || 'theme-oled';
        state.font = localStorage.getItem('reader_font') || 'font-serif';
        state.size = parseInt(localStorage.getItem('reader_size')) || 18;
        state.zoom = parseFloat(localStorage.getItem('reader_zoom')) || 1.0;
        state.lineHeight = parseFloat(localStorage.getItem('reader_lh')) || 1.6;
        state.letterSpacing = parseFloat(localStorage.getItem('reader_ls')) || 0;
        state.paraSpacing = parseFloat(localStorage.getItem('reader_ps')) || 1.5;
        state.pageWidth = parseInt(localStorage.getItem('reader_pw')) || 700;
        state.textAlign = localStorage.getItem('reader_align') || 'justify';
        state.highContrast = localStorage.getItem('reader_high_contrast') === 'true';
        state.focusMode = localStorage.getItem('reader_focus') === 'true';
        state.voiceName = localStorage.getItem('reader_voice') || '';
        state.tempo = parseInt(localStorage.getItem('reader_tempo')) || 250;
        state.showLore = localStorage.getItem('reader_show_lore') !== 'false';
        state.showHighlight = localStorage.getItem('reader_show_highlight') !== 'false';
        state.zoomLocked = localStorage.getItem('reader_zoom_locked') === 'true';
        
        const savedComments = localStorage.getItem('reader_comments');
        if (savedComments) state.comments = JSON.parse(savedComments);
    } catch (e) {
        console.warn("Storage load error, using defaults", e);
    }
}

// Lore Database
const loreData = {
    "Avery": { role: "Character", img: "assets/img/hero_bg.png", desc: "Avery Hale, lead Continuist Surveyor. Measured, procedural, and stubbornly humane." },
    "Eli": { role: "Character", desc: "Eli, 'The Listener.' Uses alcohol as a crude limiter to dull the constant mental noise of the Echo." },
    "Sister Orin": { role: "Character", desc: "Principles Veilkeeper Sealwright. Believes an open door is a debt unpaid." },
    "Kade Rowan": { role: "Character", desc: "Veteran Hearthward Guide. Specialist in safe routes and community discipline." },
    "Rook": { role: "Character", desc: "Ascendant Breaker. Charismatic risk-taker who 'runs systems hot'." },
    "Continuist": { role: "Faction", desc: "Believes reality is built on procedure and the Rule of Three." },
    "Veilkeepers": { role: "Faction", desc: "Dedicated to closing breaches. 'Containment first, curiosity second.'" },
    "Hearthward": { role: "Faction", desc: "Focuses on communal survival holds and practical discipline." },
    "Echo Faith": { role: "Faction", desc: "Listeners who interpret the Echo's patterns as messages." },
    "Ascendants": { role: "Faction", desc: "Pressure-seekers who believe limits are lies." },
    "Veil": { role: "Phenomenon", desc: "The separation between places, states, and routes." },
    "Echo": { role: "Phenomenon", desc: "Pressure that seeks completion at a heavy cost." },
    "Limiter": { role: "Concept", desc: "Termination condition that prevents system breakage." },
    "Timed Limiter": { role: "Concept", desc: "A device designed to force an ending onto a local pattern." },
    "Nullrock": { role: "Block", img: "assets/img/nullrock.png", desc: "World bottom (Y=0). 'Refusal made physical'." },
    "Veilglass": { role: "Block", img: "assets/img/veilglass.png", desc: "Material tuned to the frequency of the Veil." },
    "Runestone": { role: "Block", img: "assets/img/runestone.png", desc: "Continuist stone used to anchor rites." },
    "Artificer Bench": { role: "Item", img: "assets/img/artificer_bench.png", desc: "Canonical workstation for gatecraft." },
    "Embercoal": { role: "Block", img: "assets/img/coal.png", desc: "Fuel source that burns with a memory of heat." }
};

let wakeLockObj = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadPersistentState();
    setupEventListeners(); // Bind early
    prepareTextForReading();
    applySettings();
    setupLoreLinks();
    
    // Chapter / URL Sync
    const urlParams = new URLSearchParams(window.location.search);
    const chParam = urlParams.get('chapter');
    
    if (chParam) {
        switchChapter(parseInt(chParam), false);
    } else {
        // Force ?chapter=1 by default
        switchChapter(1, true);
    }

    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = populateVoices;
        populateVoices();
    }
});

function prepareTextForReading() {
    const paragraphs = document.querySelectorAll('#bookContent p');
    paragraphs.forEach((p, pIdx) => {
        let html = p.innerHTML;
        const sentences = html.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [html];
        p.innerHTML = sentences.map((s, sIdx) => {
            const id = `s-${pIdx}-${sIdx}`;
            return `<span class="read-span" id="${id}">${s}</span>`;
        }).join(' ');
    });
}

function applySettings() {
    const root = document.documentElement;
    const body = document.body;

    body.className = `${state.theme} ${state.font}`;
    if (state.highContrast) body.classList.add('high-contrast');
    if (state.focusMode) body.classList.add('focus-mode');
    
    const scaledSize = state.size * state.zoom;
    root.style.setProperty('--reader-size', `${scaledSize}px`);
    root.style.setProperty('--reader-line-height', state.lineHeight);
    root.style.setProperty('--reader-letter-spacing', `${state.letterSpacing}px`);
    root.style.setProperty('--reader-para-spacing', `${state.paraSpacing}em`);
    root.style.setProperty('--reader-max-width', `${state.pageWidth}px`);
    root.style.setProperty('--reader-align', state.textAlign);
    
    // UI Sync
    const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
    const setCheck = (id, val) => { const el = document.getElementById(id); if(el) el.checked = val; };
    
    setVal('zoomSlider', state.zoom);
    setVal('lineHeightSlider', state.lineHeight);
    setVal('letterSpacingSlider', state.letterSpacing);
    setVal('pageWidthSlider', state.pageWidth);
    setVal('tempoSlider', state.tempo);
    setVal('chapterSelect', state.chapter);
    
    const tl = document.getElementById('tempoLabel'); if(tl) tl.innerText = `TEMPO: ${state.tempo} WPM`;
    
    setCheck('contrastToggle', state.highContrast);
    setCheck('focusModeToggle', state.focusMode);
    setCheck('wakeLockToggle', state.wakeLock);
    setCheck('toggleLore', state.showLore);
    setCheck('toggleHighlight', state.showHighlight);
    
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === state.theme));
    document.querySelectorAll('.btn-toggle[data-align]').forEach(b => b.classList.toggle('active', b.dataset.align === state.textAlign));
    document.querySelectorAll('.btn-toggle[data-font]').forEach(b => b.classList.toggle('active', b.dataset.font === state.font));
    
    const hb = document.getElementById('highlightModeBtn');
    if (hb) {
        hb.classList.toggle('active', state.highlightMode);
        body.classList.toggle('highlight-mode-active', state.highlightMode);
    }
    
    const lb = document.getElementById('lockBtn');
    if(lb) {
        lb.innerHTML = state.zoomLocked ? '<i class="fas fa-lock"></i>' : '<i class="fas fa-lock-open"></i>';
        lb.classList.toggle('active', state.zoomLocked);
    }

    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        if (state.zoomLocked) viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        else viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
    }
}

function setupEventListeners() {
    const bind = (id, key, isFloat = true) => {
        const el = document.getElementById(id);
        if(el) el.oninput = (e) => { state[key] = isFloat ? parseFloat(e.target.value) : parseInt(e.target.value); saveState(); applySettings(); };
    };
    bind('zoomSlider', 'zoom');
    bind('lineHeightSlider', 'lineHeight');
    bind('letterSpacingSlider', 'letterSpacing');
    bind('pageWidthSlider', 'pageWidth', false);
    bind('tempoSlider', 'tempo', false);

    const click = (id, fn) => { const el = document.getElementById(id); if(el) el.onclick = fn; };

    click('zoomReset', () => { state.zoom = 1.0; saveState(); applySettings(); });
    click('tempoReset', () => { state.tempo = 250; saveState(); applySettings(); });
    click('defaultAllBtn', () => {
        Object.assign(state, { theme: 'theme-oled', font: 'font-serif', zoom: 1.0, lineHeight: 1.6, letterSpacing: 0, paraSpacing: 1.5, pageWidth: 700, textAlign: 'justify', highContrast: false, focusMode: false, tempo: 250, showLore: true, showHighlight: true });
        saveState(); applySettings();
    });

    // Settings Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn, .tab-content-area').forEach(el => el.classList.remove('active'));
            btn.classList.add('active');
            const content = document.getElementById(btn.dataset.tab);
            if (content) content.classList.add('active');
        };
    });

    document.querySelectorAll('.btn-toggle[data-font]').forEach(b => { b.onclick = () => { state.font = b.dataset.font; saveState(); applySettings(); }; });
    document.querySelectorAll('.btn-toggle[data-align]').forEach(b => { b.onclick = () => { state.textAlign = b.dataset.align; saveState(); applySettings(); }; });
    document.querySelectorAll('.theme-btn[data-theme]').forEach(b => { b.onclick = () => { state.theme = b.dataset.theme; saveState(); applySettings(); }; });

    click('settingsBtn', () => togglePanel('settingsPanel'));
    click('helpBtn', () => togglePanel('helpPanel'));
    click('closeSettings', () => togglePanel(null));
    // Header Close button
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.onclick = () => togglePanel(null);
    });

    click('ttsBtn', toggleReading);
    click('previewVoiceBtn', previewVoice);
    click('downloadBtn', downloadBook);
    click('lockBtn', () => { state.zoomLocked = !state.zoomLocked; saveState(); applySettings(); });

    const chSelect = document.getElementById('chapterSelect');
    if(chSelect) chSelect.onchange = (e) => switchChapter(parseInt(e.target.value));

    // Highlight Mode
    click('highlightModeBtn', () => {
        state.highlightMode = !state.highlightMode;
        state.highlightStart = null;
        document.querySelectorAll('.tap-indicator, .highlight-start-marker').forEach(el => {
            if (el.classList.contains('tap-indicator')) el.remove();
            else el.classList.remove('highlight-start-marker');
        });
        applySettings();
    });

    const area = document.getElementById('readingArea');
    if(area) {
        area.onclick = (e) => {
            const span = e.target.closest('.read-span');
            if (state.highlightMode && span) handleManualHighlight(e, span);
            else handleNoteTap(e);
        };
        // Drag support for manual mode
        area.onmouseup = (e) => {
            if (!state.highlightMode) return;
            const sel = window.getSelection();
            if (sel.toString().trim().length > 5) {
                const range = sel.getRangeAt(0);
                state.tempRange = range;
                togglePanel('commentPanel');
            }
        };
    }

    document.querySelectorAll('.color-pick').forEach(b => {
        b.onclick = () => {
            state.selectedColor = b.dataset.color;
            document.querySelectorAll('.color-pick').forEach(el => el.classList.remove('active'));
            b.classList.add('active');
        };
    });

    click('saveHighlightBtn', saveManualHighlight);
    click('closeComment', () => {
        togglePanel(null); state.highlightStart = null;
        document.querySelectorAll('.tap-indicator, .highlight-start-marker').forEach(el => {
            if(el.classList.contains('tap-indicator')) el.remove();
            else el.classList.remove('highlight-start-marker');
        });
    });

    const toggle = (id, key) => { const el = document.getElementById(id); if(el) el.onchange = (e) => { state[key] = e.target.checked; saveState(); applySettings(); }; };
    toggle('contrastToggle', 'highContrast');
    toggle('focusModeToggle', 'focusMode');
    toggle('toggleLore', 'showLore');
    toggle('toggleHighlight', 'showHighlight');
    
    const wake = document.getElementById('wakeLockToggle');
    if(wake) wake.onchange = toggleWakeLock;

    window.addEventListener('scroll', () => {
        state.scroll = window.scrollY;
        localStorage.setItem(`reader_scroll_ch${state.chapter}`, state.scroll);
        const progress = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        const bar = document.getElementById('progressBar'); if(bar) bar.style.width = progress + '%';
    });
}

function switchChapter(num, autoScroll = true) {
    state.chapter = num;
    const url = new URL(window.location);
    url.searchParams.set('chapter', num);
    window.history.pushState({}, '', url);
    
    document.querySelectorAll('section[data-chapter]').forEach(s => s.style.display = 'none');
    const ch = document.querySelector(`section[data-chapter="${num}"]`);
    if (ch) {
        ch.style.display = 'block';
        if (autoScroll) {
            const savedScroll = parseInt(localStorage.getItem(`reader_scroll_ch${num}`)) || 0;
            window.scrollTo(0, savedScroll);
        }
    }
    applySettings();
}

function handleManualHighlight(e, span) {
    if (!state.highlightStart) {
        state.highlightStart = span.id;
        span.classList.add('highlight-start-marker');
        const indicator = document.createElement('div');
        indicator.className = 'tap-indicator';
        indicator.style.left = `${e.pageX}px`;
        indicator.style.top = `${e.pageY - 12}px`;
        document.body.appendChild(indicator);
    } else {
        const start = document.getElementById(state.highlightStart);
        if (!start) { state.highlightStart = null; return; }
        const range = document.createRange();
        range.setStartBefore(start);
        range.setEndAfter(span);
        state.tempRange = range;
        togglePanel('commentPanel');
    }
}

function saveManualHighlight() {
    const input = document.getElementById('commentInput');
    const note = input ? input.value : "";
    const id = "h-" + Date.now();
    const wrap = document.createElement('span');
    wrap.className = 'user-highlight';
    wrap.style.backgroundColor = state.selectedColor;
    wrap.dataset.id = id;
    
    if (note) {
        const tip = document.createElement('span');
        tip.className = 'note-tooltip';
        tip.innerText = note;
        wrap.appendChild(tip);
        state.comments[id] = note;
    }

    try { state.tempRange.surroundContents(wrap); } catch(e) { console.warn("Complex selection"); }

    state.highlightMode = false; state.highlightStart = null;
    document.querySelectorAll('.tap-indicator, .highlight-start-marker').forEach(el => {
        if(el.classList.contains('tap-indicator')) el.remove();
        else el.classList.remove('highlight-start-marker');
    });
    saveState(); applySettings(); togglePanel(null);
    window.getSelection().removeAllRanges();
}

function handleNoteTap(e) {
    const h = e.target.closest('.user-highlight');
    if (h && h.querySelector('.note-tooltip')) {
        const wasActive = h.classList.contains('active-note');
        document.querySelectorAll('.user-highlight').forEach(el => el.classList.remove('active-note'));
        if (!wasActive) {
            h.classList.add('active-note');
            setTimeout(() => {
                const clear = (ev) => { if (!h.contains(ev.target)) { h.classList.remove('active-note'); window.removeEventListener('click', clear); } };
                window.addEventListener('click', clear);
            }, 10);
        }
    }
}

function setupLoreLinks() {
    document.querySelectorAll('.lore-link').forEach(link => {
        link.onclick = (e) => {
            if (!state.showLore) return;
            e.preventDefault();
            const key = link.dataset.lore;
            if (loreData[key]) showLore(key, loreData[key]);
        };
    });
}

function showLore(title, data) {
    const t = document.getElementById('loreTitle'); if(t) t.innerText = title;
    const r = document.getElementById('loreRole'); if(r) r.innerText = data.role;
    const d = document.getElementById('loreDesc'); if(d) d.innerText = data.desc;
    const img = document.getElementById('loreImg');
    if (img) { if (data.img) { img.src = data.img; img.style.display = 'block'; } else img.style.display = 'none'; }
    togglePanel('lorePanel');
}

function togglePanel(id) {
    document.querySelectorAll('.panel-overlay').forEach(p => p.classList.remove('active'));
    if (id) { const p = document.getElementById(id); if(p) p.classList.add('active'); }
}

function populateVoices() {
    if(!window.speechSynthesis) return;
    const vs = document.getElementById('voiceSelect'); if (!vs) return;
    let voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
    voices.sort((a, b) => (b.name.includes('Natural') ? 10 : 0) - (a.name.includes('Natural') ? 10 : 0));
    vs.innerHTML = voices.map(v => `<option value="${v.name}" ${v.name === state.voiceName ? 'selected' : ''}>${v.name}</option>`).join('');
    if (!state.voiceName && voices.length > 0) { state.voiceName = voices[0].name; saveState(); }
}

function getSelectedVoice() {
    const voices = window.speechSynthesis.getVoices();
    return voices.find(v => v.name === state.voiceName) || voices[0];
}

function previewVoice() {
    if(!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const voice = getSelectedVoice();
    const utter = new SpeechSynthesisUtterance("Continuist system check.");
    if(voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
}

function toggleReading() {
    if (window.speechSynthesis.speaking || state.readAlongActive) stopReading();
    else startReadAlong();
}

function startReadAlong() {
    state.readAlongActive = true;
    const btn = document.getElementById('ttsBtn'); if(btn) btn.innerHTML = '<i class="fas fa-pause"></i>';
    const spans = Array.from(document.querySelectorAll(`section[data-chapter="${state.chapter}"] .read-span`));
    let idx = spans.indexOf(spans.find(s => s.getBoundingClientRect().top > 100)) || 0;

    const next = () => {
        if (!state.readAlongActive || idx >= spans.length) { stopReading(); return; }
        const s = spans[idx];
        document.querySelectorAll('.read-span').forEach(el => el.classList.remove('reading-highlight'));
        if (state.showHighlight) { s.classList.add('reading-highlight'); s.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        const utter = new SpeechSynthesisUtterance(s.innerText);
        utter.voice = getSelectedVoice();
        utter.rate = state.tempo / 200;
        utter.onend = () => { idx++; next(); };
        window.speechSynthesis.speak(utter);
    };
    next();
}

function stopReading() {
    window.speechSynthesis.cancel();
    state.readAlongActive = false;
    const btn = document.getElementById('ttsBtn'); if(btn) btn.innerHTML = '<i class="fas fa-play"></i>';
    document.querySelectorAll('.read-span').forEach(el => el.classList.remove('reading-highlight'));
}

async function toggleWakeLock(e) {
    state.wakeLock = e.target.checked;
    if (state.wakeLock && navigator.wakeLock) { try { wakeLockObj = await navigator.wakeLock.request('screen'); } catch (err) {} }
    else if (wakeLockObj) { await wakeLockObj.release(); wakeLockObj = null; }
    saveState();
}

function saveState() {
    localStorage.setItem('reader_theme', state.theme);
    localStorage.setItem('reader_font', state.font);
    localStorage.setItem('reader_size', state.size);
    localStorage.setItem('reader_zoom', state.zoom);
    localStorage.setItem('reader_lh', state.lineHeight);
    localStorage.setItem('reader_ls', state.letterSpacing);
    localStorage.setItem('reader_ps', state.paraSpacing);
    localStorage.setItem('reader_pw', state.pageWidth);
    localStorage.setItem('reader_align', state.textAlign);
    localStorage.setItem('reader_focus', state.focusMode);
    localStorage.setItem('reader_voice', state.voiceName);
    localStorage.setItem('reader_tempo', state.tempo);
    localStorage.setItem('reader_show_lore', state.showLore);
    localStorage.setItem('reader_show_highlight', state.showHighlight);
    localStorage.setItem('reader_zoom_locked', state.zoomLocked);
    localStorage.setItem('reader_high_contrast', state.highContrast);
    localStorage.setItem('reader_comments', JSON.stringify(state.comments));
}

function restoreProgress() {
    const savedScroll = parseInt(localStorage.getItem(`reader_scroll_ch${state.chapter}`)) || 0;
    if (savedScroll > 0) window.scrollTo(0, savedScroll);
}

function downloadBook() {
    const blob = new Blob([document.getElementById('bookContent').innerText], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ECHOES_OF_THE_CONTINUIST.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

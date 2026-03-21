// Reader Configuration & State
const state = {
    theme: localStorage.getItem('reader_theme') || 'theme-oled',
    font: localStorage.getItem('reader_font') || 'font-serif',
    size: parseInt(localStorage.getItem('reader_size')) || 18,
    zoom: parseFloat(localStorage.getItem('reader_zoom')) || 1.0,
    lineHeight: parseFloat(localStorage.getItem('reader_lh')) || 1.6,
    letterSpacing: parseFloat(localStorage.getItem('reader_ls')) || 0,
    paraSpacing: parseFloat(localStorage.getItem('reader_ps')) || 1.5,
    pageWidth: parseInt(localStorage.getItem('reader_pw')) || 700,
    textAlign: localStorage.getItem('reader_align') || 'justify',
    scroll: parseInt(localStorage.getItem('reader_scroll')) || 0,
    highContrast: localStorage.getItem('reader_high_contrast') === 'true',
    focusMode: localStorage.getItem('reader_focus') === 'true',
    voiceName: localStorage.getItem('reader_voice') || '',
    tempo: parseInt(localStorage.getItem('reader_tempo')) || 250,
    showLore: localStorage.getItem('reader_show_lore') !== 'false',
    showHighlight: localStorage.getItem('reader_show_highlight') !== 'false',
    zoomLocked: localStorage.getItem('reader_zoom_locked') === 'true',
    highlightMode: false,
    highlightStart: null,
    selectedColor: 'rgba(242, 193, 78, 0.4)',
    wakeLock: false,
    speaking: false,
    readAlongActive: false,
    comments: {}
};

// Safe JSON Parse for Comments
try {
    const saved = localStorage.getItem('reader_comments');
    if (saved) state.comments = JSON.parse(saved);
} catch(e) { state.comments = {}; }

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
    "Nullrock": { role: "Block", img: "assets/img/nullrock.png", desc: "World bottom (Y=0). 'Refusal made physical'." },
    "Veilglass": { role: "Block", img: "assets/img/veilglass.png", desc: "Material tuned to the frequency of the Veil." },
    "Runestone": { role: "Block", img: "assets/img/runestone.png", desc: "Continuist stone used to anchor rites." },
    "Artificer Bench": { role: "Item", img: "assets/img/artificer_bench.png", desc: "Canonical workstation for gatecraft." },
    "Embercoal": { role: "Block", img: "assets/img/coal.png", desc: "Fuel source that burns with a memory of heat." }
};

let wakeLockObj = null;

document.addEventListener('DOMContentLoaded', () => {
    prepareTextForReading();
    applySettings();
    setupEventListeners();
    setupLoreLinks();
    restoreProgress();
    
    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = populateVoices;
        populateVoices();
    }
});

function prepareTextForReading() {
    const paragraphs = document.querySelectorAll('#bookContent p');
    paragraphs.forEach((p, pIdx) => {
        let html = p.innerHTML;
        // Split into sentences, preserving HTML tags within them
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
    
    // Sync UI components
    const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
    const setCheck = (id, val) => { const el = document.getElementById(id); if(el) el.checked = val; };
    
    setVal('zoomSlider', state.zoom);
    setVal('lineHeightSlider', state.lineHeight);
    setVal('letterSpacingSlider', state.letterSpacing);
    setVal('pageWidthSlider', state.pageWidth);
    setVal('tempoSlider', state.tempo);
    
    const tl = document.getElementById('tempoLabel'); if(tl) tl.innerText = `TEMPO: ${state.tempo} WPM`;
    
    setCheck('contrastToggle', state.highContrast);
    setCheck('focusModeToggle', state.focusMode);
    setCheck('wakeLockToggle', state.wakeLock);
    setCheck('toggleLore', state.showLore);
    setCheck('toggleHighlight', state.showHighlight);
    
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === state.theme));
    document.querySelectorAll('.align-btn, .btn-toggle[data-align]').forEach(b => b.classList.toggle('active', b.dataset.align === state.textAlign));
    document.querySelectorAll('.btn-toggle[data-font]').forEach(b => b.classList.toggle('active', b.dataset.font === state.font));
    
    const hb = document.getElementById('highlightModeBtn'); if(hb) hb.classList.toggle('active', state.highlightMode);
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

    document.querySelectorAll('.btn-toggle[data-font]').forEach(b => { b.onclick = () => { state.font = b.dataset.font; saveState(); applySettings(); }; });
    document.querySelectorAll('.btn-toggle[data-align]').forEach(b => { b.onclick = () => { state.textAlign = b.dataset.align; saveState(); applySettings(); }; });
    document.querySelectorAll('.theme-btn').forEach(b => { b.onclick = () => { state.theme = b.dataset.theme; saveState(); applySettings(); }; });

    click('settingsBtn', () => togglePanel('settingsPanel'));
    click('helpBtn', () => togglePanel('helpPanel'));
    click('closeSettings', () => togglePanel(null));
    click('ttsBtn', toggleReading);
    click('previewVoiceBtn', previewVoice);
    click('downloadBtn', downloadBook);
    click('lockBtn', () => { state.zoomLocked = !state.zoomLocked; saveState(); applySettings(); });

    click('highlightModeBtn', () => {
        state.highlightMode = !state.highlightMode;
        state.highlightStart = null;
        document.querySelectorAll('.tap-indicator').forEach(i => i.remove());
        document.querySelectorAll('.read-span').forEach(s => s.classList.remove('highlight-start-marker'));
        applySettings();
    });

    const area = document.getElementById('readingArea');
    if(area) {
        area.onclick = (e) => {
            const span = e.target.closest('.read-span');
            if (state.highlightMode && span) handleManualHighlight(e, span);
            else handleNoteTap(e);
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
        document.querySelectorAll('.tap-indicator, .highlight-start-marker').forEach(el => el.classList.remove('highlight-start-marker'));
        document.querySelectorAll('.tap-indicator').forEach(el => el.remove());
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
        localStorage.setItem('reader_scroll', state.scroll);
        const progress = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        const bar = document.getElementById('progressBar'); if(bar) bar.style.width = progress + '%';
    });
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

    try { state.tempRange.surroundContents(wrap); } 
    catch(e) { 
        // Fallback for complex ranges: wrap individual spans
        console.warn("Complex highlight fallback");
    }

    state.highlightMode = false; state.highlightStart = null;
    document.querySelectorAll('.tap-indicator, .highlight-start-marker').forEach(el => {
        if(el.classList.contains('tap-indicator')) el.remove();
        else el.classList.remove('highlight-start-marker');
    });
    saveState(); applySettings(); togglePanel(null);
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
    const vs = document.getElementById('voiceSelect'); if(!vs) return;
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
    window.speechSynthesis.cancel();
    const voice = getSelectedVoice();
    const utter = new SpeechSynthesisUtterance("System check complete.");
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
    const spans = Array.from(document.querySelectorAll('.read-span'));
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
    if (state.wakeLock && navigator.wakeLock) { try { wakeLockObj = await navigator.wakeLock.request('screen'); } catch(err) {} }
    else if (wakeLockObj) { await wakeLockObj.release(); wakeLockObj = null; }
    saveState();
}

function saveState() {
    const keys = ['theme', 'font', 'size', 'zoom', 'lh', 'ls', 'ps', 'pw', 'align', 'scroll', 'high_contrast', 'focus', 'voice', 'tempo', 'show_lore', 'show_highlight', 'zoom_locked'];
    const map = { lh: 'lineHeight', ls: 'letterSpacing', ps: 'paraSpacing', pw: 'pageWidth', align: 'textAlign', focus: 'focusMode', voice: 'voiceName', show_lore: 'showLore', show_highlight: 'showHighlight', zoom_locked: 'zoomLocked', high_contrast: 'highContrast' };
    keys.forEach(k => localStorage.setItem(`reader_${k}`, state[map[k] || k]));
    localStorage.setItem('reader_comments', JSON.stringify(state.comments));
}

function restoreProgress() { if (state.scroll > 0) window.scrollTo(0, state.scroll); }

function downloadBook() {
    const blob = new Blob([document.getElementById('bookContent').innerText], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'ECHOES_OF_THE_CONTINUIST.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

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
    "Avery": { role: "Character", img: "assets/img/hero_bg.png", desc: "A field surveyor who adheres strictly to procedure." },
    "Eli": { role: "Character", desc: "Avery's companion. He 'hears' the Veil and the Echo." },
    "Continuist": { role: "Faction", desc: "A faction dedicated to measuring, regulating, and stabilizing reality." },
    "Veil": { role: "Phenomenon", desc: "The separation between places, states, and routes." },
    "Echo": { role: "Phenomenon", desc: "Pressure that seeks completion." },
    "Limiter": { role: "Concept", desc: "The third part of the Rule of Three." },
    "Timed Limiter": { role: "Item", desc: "A device that enforces a termination condition on a local system." },
    "Veilglass": { role: "Block", img: "assets/img/veilglass.png", desc: "A material that vibrates in sympathy with the Veil." },
    "Nullrock": { role: "Block", img: "assets/img/nullrock.png", desc: "The world's bottom layer (Y=0)." },
    "Runestone": { role: "Block", img: "assets/img/runestone.png", desc: "Continuist carved stone used to anchor rites." },
    "Artificer Bench": { role: "Item", img: "assets/img/artificer_bench.png", desc: "A specialized station for advanced crafting." },
    "Embercoal": { role: "Block", img: "assets/img/coal.png", desc: "A fuel source that burns with a memory of heat." }
};

let wakeLockObj = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    prepareTextForReading();
    applySettings();
    setupEventListeners();
    setupLoreLinks();
    restoreProgress();
    checkInstallPrompt();
    
    if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = populateVoices;
    }
    populateVoices();
});

function prepareTextForReading() {
    const paragraphs = document.querySelectorAll('#bookContent p');
    paragraphs.forEach((p, pIdx) => {
        let html = p.innerHTML;
        // Basic sentence split that attempts to avoid breaking tags
        const sentences = html.split(/(?<=[.!?])\s+(?=[^>]*?(?:<|$))/g);
        p.innerHTML = sentences.map((s, sIdx) => `<span class="read-span" id="s-${pIdx}-${sIdx}">${s}</span>`).join(' ');
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
    
    // UI Sync - Wrap in null checks
    const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
    const setCheck = (id, val) => { const el = document.getElementById(id); if(el) el.checked = val; };
    
    setVal('zoomSlider', state.zoom);
    setVal('lineHeightSlider', state.lineHeight);
    setVal('letterSpacingSlider', state.letterSpacing);
    setVal('paraSpacingSlider', state.paraSpacing);
    setVal('pageWidthSlider', state.pageWidth);
    setVal('tempoSlider', state.tempo);
    
    const tempoLabel = document.getElementById('tempoLabel');
    if(tempoLabel) tempoLabel.innerText = `READ-ALONG: ${state.tempo} WPM`;
    
    setCheck('contrastToggle', state.highContrast);
    setCheck('focusModeToggle', state.focusMode);
    setCheck('wakeLockToggle', state.wakeLock);
    setCheck('toggleLore', state.showLore);
    setCheck('toggleHighlight', state.showHighlight);
    
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === state.theme));
    document.querySelectorAll('.align-btn').forEach(b => b.classList.toggle('active', b.dataset.align === state.textAlign));
    
    const hb = document.getElementById('highlightModeBtn');
    if(hb) hb.classList.toggle('active', state.highlightMode);
    
    const lockBtn = document.getElementById('lockBtn');
    if(lockBtn) {
        lockBtn.innerHTML = state.zoomLocked ? '<i class="fas fa-lock"></i>' : '<i class="fas fa-lock-open"></i>';
        lockBtn.classList.toggle('lock-active', state.zoomLocked);
    }

    // Viewport Lock
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        if (state.zoomLocked) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        } else {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes');
        }
    }
}

function setupEventListeners() {
    const bindInput = (id, key) => {
        const el = document.getElementById(id);
        if(el) el.oninput = (e) => { state[key] = parseFloat(e.target.value); saveState(); applySettings(); };
    };

    bindInput('zoomSlider', 'zoom');
    bindInput('lineHeightSlider', 'lineHeight');
    bindInput('letterSpacingSlider', 'letterSpacing');
    bindInput('paraSpacingSlider', 'paraSpacing');
    bindInput('pageWidthSlider', 'pageWidth');
    bindInput('tempoSlider', 'tempo');

    const click = (id, fn) => { const el = document.getElementById(id); if(el) el.onclick = fn; };

    click('zoomReset', () => {
        state.zoom = 1.0; state.lineHeight = 1.6; state.letterSpacing = 0;
        state.paraSpacing = 1.5; state.pageWidth = 700;
        saveState(); applySettings();
    });

    document.querySelectorAll('.align-btn').forEach(btn => {
        btn.onclick = () => { state.textAlign = btn.dataset.align; saveState(); applySettings(); };
    });

    click('chapterSelect', (e) => {
        const ch = document.getElementById(`ch-${e.target.value}`);
        if (ch) ch.scrollIntoView({ behavior: 'smooth' });
    });

    click('highlightModeBtn', () => {
        state.highlightMode = !state.highlightMode;
        state.highlightStart = null;
        document.querySelectorAll('.tap-indicator').forEach(i => i.remove());
        document.querySelectorAll('.read-span').forEach(s => s.classList.remove('highlight-start-marker'));
        applySettings();
    });

    const readingArea = document.getElementById('readingArea');
    if(readingArea) {
        readingArea.onclick = (e) => {
            const span = e.target.closest('.read-span');
            if (state.highlightMode && span) handleManualHighlight(e, span);
            else handleNoteTap(e);
        };
    }

    document.querySelectorAll('.color-pick').forEach(btn => {
        btn.onclick = () => {
            state.selectedColor = btn.dataset.color;
            document.querySelectorAll('.color-pick').forEach(b => b.style.border = 'none');
            btn.style.border = '2px solid white';
        };
    });

    click('saveHighlightBtn', saveManualHighlight);
    click('closeComment', () => {
        togglePanel(null);
        state.highlightStart = null;
        document.querySelectorAll('.tap-indicator').forEach(i => i.remove());
        document.querySelectorAll('.read-span').forEach(s => s.classList.remove('highlight-start-marker'));
    });

    click('settingsBtn', () => togglePanel('settingsPanel'));
    click('closeSettings', () => togglePanel(null));
    click('closeLore', () => togglePanel(null));
    click('ttsBtn', toggleReading);
    click('previewVoiceBtn', previewVoice);
    click('downloadBtn', downloadBook);
    click('lockBtn', () => { state.zoomLocked = !state.zoomLocked; saveState(); applySettings(); });

    const wakeToggle = document.getElementById('wakeLockToggle');
    if(wakeToggle) wakeToggle.onchange = toggleWakeLock;
    
    const focusToggle = document.getElementById('focusModeToggle');
    if(focusToggle) focusToggle.onchange = (e) => { state.focusMode = e.target.checked; saveState(); applySettings(); };
    
    const loreToggle = document.getElementById('toggleLore');
    if(loreToggle) loreToggle.onchange = (e) => { state.showLore = e.target.checked; saveState(); applySettings(); };
    
    const highToggle = document.getElementById('toggleHighlight');
    if(highToggle) highToggle.onchange = (e) => { state.showHighlight = e.target.checked; saveState(); applySettings(); };
    
    const contrastToggle = document.getElementById('contrastToggle');
    if(contrastToggle) contrastToggle.onchange = (e) => { state.highContrast = e.target.checked; saveState(); applySettings(); };

    window.addEventListener('scroll', () => {
        state.scroll = window.scrollY;
        localStorage.setItem('reader_scroll', state.scroll);
        const scrolled = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        const bar = document.getElementById("progressBar");
        if(bar) bar.style.width = scrolled + "%";
    });
    
    // Theme BTNs
    document.querySelectorAll('.theme-btn[data-theme]').forEach(btn => {
        btn.onclick = () => { state.theme = btn.dataset.theme; saveState(); applySettings(); };
    });
}

function handleManualHighlight(e, span) {
    if (!state.highlightStart) {
        state.highlightStart = span.id;
        span.classList.add('highlight-start-marker');
        const ind = document.createElement('div');
        ind.className = 'tap-indicator';
        ind.style.left = `${e.pageX}px`; ind.style.top = `${e.pageY - 10}px`;
        document.body.appendChild(ind);
    } else {
        const start = document.getElementById(state.highlightStart);
        if(!start) { state.highlightStart = null; return; }
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
    const wrapper = document.createElement('span');
    wrapper.className = 'user-highlight';
    wrapper.style.backgroundColor = state.selectedColor;
    wrapper.dataset.id = id;
    
    if (note) {
        const tip = document.createElement('span');
        tip.className = 'note-tooltip';
        tip.innerText = note;
        wrapper.appendChild(tip);
        state.comments[id] = note;
    }

    try { state.tempRange.surroundContents(wrapper); } catch(e) { console.warn("Highlight error", e); }

    state.highlightMode = false; state.highlightStart = null;
    document.querySelectorAll('.tap-indicator').forEach(i => i.remove());
    document.querySelectorAll('.read-span').forEach(s => s.classList.remove('highlight-start-marker'));
    saveState(); applySettings(); togglePanel(null);
}

function handleNoteTap(e) {
    const h = e.target.closest('.user-highlight');
    if (h && h.querySelector('.note-tooltip')) {
        document.querySelectorAll('.user-highlight').forEach(el => el.classList.remove('active-note'));
        h.classList.add('active-note');
        setTimeout(() => {
            const clear = (ev) => { if (!h.contains(ev.target)) { h.classList.remove('active-note'); window.removeEventListener('click', clear); } };
            window.addEventListener('click', clear);
        }, 10);
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
    if (img) {
        if (data.img) { img.src = data.img; img.style.display = 'block'; }
        else { img.style.display = 'none'; }
    }
    togglePanel('lorePanel');
}

function togglePanel(panelId) {
    document.querySelectorAll('.panel-overlay').forEach(p => p.classList.remove('active'));
    if (panelId) {
        const p = document.getElementById(panelId);
        if(p) p.classList.add('active');
    }
}

function populateVoices() {
    if(!window.speechSynthesis) return;
    const vs = document.getElementById('voiceSelect');
    if (!vs) return;
    let voices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
    voices.sort((a, b) => (b.name.includes('Natural') ? 1 : 0) - (a.name.includes('Natural') ? 1 : 0));
    vs.innerHTML = voices.map(v => `<option value="${v.name}" ${v.name === state.voiceName ? 'selected' : ''}>${v.name}</option>`).join('');
}

function getSelectedVoice() {
    if(!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    return voices.find(v => v.name === state.voiceName) || voices[0];
}

function previewVoice() {
    if(!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const voice = getSelectedVoice();
    const utter = new SpeechSynthesisUtterance("LatticeVeil system check.");
    if(voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
}

function toggleReading() {
    if (window.speechSynthesis && (window.speechSynthesis.speaking || state.readAlongActive)) stopReading();
    else startReadAlong();
}

function startReadAlong() {
    state.readAlongActive = true;
    const btn = document.getElementById('ttsBtn');
    if(btn) btn.innerHTML = '<i class="fas fa-pause"></i>';
    const spans = Array.from(document.querySelectorAll('.read-span'));
    let currentIdx = spans.indexOf(spans.find(s => s.getBoundingClientRect().top > 50)) || 0;

    const speakNext = () => {
        if (!state.readAlongActive || currentIdx >= spans.length) { stopReading(); return; }
        const span = spans[currentIdx];
        document.querySelectorAll('.read-span').forEach(s => s.classList.remove('reading-highlight'));
        if (state.showHighlight) {
            span.classList.add('reading-highlight');
            span.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        const utter = new SpeechSynthesisUtterance(span.innerText);
        utter.voice = getSelectedVoice();
        utter.rate = state.tempo / 200; 
        utter.onend = () => { currentIdx++; speakNext(); };
        window.speechSynthesis.speak(utter);
    };
    speakNext();
}

function stopReading() {
    if(window.speechSynthesis) window.speechSynthesis.cancel();
    state.readAlongActive = false;
    const btn = document.getElementById('ttsBtn');
    if(btn) btn.innerHTML = '<i class="fas fa-play"></i>';
    document.querySelectorAll('.read-span').forEach(s => s.classList.remove('reading-highlight'));
}

async function toggleWakeLock(e) {
    state.wakeLock = e.target.checked;
    if (state.wakeLock && navigator.wakeLock) { try { wakeLockObj = await navigator.wakeLock.request('screen'); } catch (err) {} }
    else if (wakeLockObj) { await wakeLockObj.release(); wakeLockObj = null; }
    saveState();
}

function saveState() {
    const keys = ['theme', 'font', 'size', 'zoom', 'lh', 'ls', 'ps', 'pw', 'align', 'scroll', 'high_contrast', 'focus', 'voice', 'tempo', 'show_lore', 'show_highlight', 'zoom_locked'];
    const map = { lh: 'lineHeight', ls: 'letterSpacing', ps: 'paraSpacing', pw: 'pageWidth', align: 'textAlign', focus: 'focusMode', voice: 'voiceName', show_lore: 'showLore', show_highlight: 'showHighlight', zoom_locked: 'zoomLocked', high_contrast: 'highContrast' };
    keys.forEach(k => {
        const val = state[map[k] || k];
        if(val !== undefined) localStorage.setItem(`reader_${k}`, val);
    });
    localStorage.setItem('reader_comments', JSON.stringify(state.comments));
}

function restoreProgress() { if (state.scroll > 0) window.scrollTo(0, state.scroll); }

function downloadBook() {
    const content = document.getElementById('bookContent');
    if(!content) return;
    const blob = new Blob([content.innerText], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'ECHOES_OF_THE_CONTINUIST.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function checkInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        const btn = document.getElementById('installBtn');
        if (btn) { btn.style.display = 'block'; btn.onclick = () => { e.prompt(); }; }
    });
}

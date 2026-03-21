// Reader Configuration & State - Hard Initialized
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
    showUserHighlights: true,
    zoomLocked: false,
    highlightMode: false,
    highlightStart: null,
    selectedColor: 'rgba(242, 193, 78, 0.4)',
    wakeLock: false,
    speaking: false,
    readAlongActive: false,
    ttsPaused: false,
    ttsSpanId: '',
    comments: {}
};

// Safe storage mapping
const storageMap = {
    theme: 'reader_theme',
    font: 'reader_font',
    size: 'reader_size',
    zoom: 'reader_zoom',
    lineHeight: 'reader_lh',
    letterSpacing: 'reader_ls',
    paraSpacing: 'reader_ps',
    pageWidth: 'reader_pw',
    textAlign: 'reader_align',
    highContrast: 'reader_high_contrast',
    focusMode: 'reader_focus',
    voiceName: 'reader_voice',
    tempo: 'reader_tempo',
    showLore: 'reader_show_lore',
    showHighlight: 'reader_show_highlight',
    showUserHighlights: 'reader_show_user_highlights',
    zoomLocked: 'reader_zoom_locked',
    selectedColor: 'reader_selected_color',
    ttsPaused: 'reader_tts_paused',
    ttsSpanId: 'reader_tts_span'
};

function loadPersistentState() {
    try {
        Object.keys(storageMap).forEach(key => {
            const val = localStorage.getItem(storageMap[key]);
            if (val !== null) {
                if (val === 'true') state[key] = true;
                else if (val === 'false') state[key] = false;
                else if (!isNaN(val) && val !== "" && key !== 'theme' && key !== 'font' && key !== 'textAlign' && key !== 'voiceName') {
                    state[key] = parseFloat(val);
                } else {
                    state[key] = val;
                }
            }
        });
        const savedComments = localStorage.getItem('reader_comments');
        if (savedComments) state.comments = JSON.parse(savedComments);
    } catch (e) { console.warn("Storage reset to defaults"); }
}

const loreData = {
    "Avery": { role: "Character", img: "assets/img/hero_bg.png", desc: "Avery Hale — lead Continuist Surveyor. He treats procedure like armor: measure first, name second, improvise never. He’s stubbornly humane in a landscape that rewards clean patterns over messy people." },
    "Eli": { role: "Character", desc: "Eli, 'The Listener.' Sensitive to the Echo’s pressure and the way places try to complete themselves. He uses alcohol as a crude, risky limiter to blur the signal—buying clarity later at the cost of himself." },
    "Sister Orin": { role: "Character", desc: "Principles Veilkeeper Sealwright. Believes an open door is a debt unpaid." },
    "Kade Rowan": { role: "Character", desc: "Veteran Hearthward Guide. Specialist in safe routes and community discipline." },
    "Rook": { role: "Character", desc: "Ascendant Breaker. Charismatic risk-taker who 'runs systems hot'." },
    "Continuist": { role: "Faction", desc: "Continuists treat reality like a system you can stabilize: repeatable steps, logged observations, and the Rule of Three. They don’t worship artifacts; they trust process—especially when the Veil starts rewriting the rules." },
    "Veilkeepers": { role: "Faction", desc: "Veilkeepers are sealwrights, wardens, and boundary engineers. They prioritize containment over discovery: close the breach, cap the conduit, deny the loop—then argue about meaning later." },
    "Hearthward": { role: "Faction", desc: "Focuses on communal survival holds and practical discipline." },
    "Echo Faith": { role: "Faction", desc: "Listeners who interpret the Echo's patterns as messages." },
    "Ascendants": { role: "Faction", desc: "Pressure-seekers who believe limits are lies." },
    "Veil": { role: "Phenomenon", desc: "The Veil is the boundary between places, states, and routes—thin in some corridors, welded shut in others. When it loosens, the world starts offering ‘second doors’: outcomes that feel inevitable until you refuse to complete them." },
    "Echo": { role: "Phenomenon", desc: "The Echo is pattern-pressure: a pull toward completion. It rewards repetition, loops, and clean endings—usually by shaving away detail. People don’t vanish loudly here; they simplify." },
    "Limiter": { role: "Concept", desc: "A limiter is a termination condition—an enforced stop that prevents a system from escalating into self-reinforcing collapse. In the field, limiters are less about power and more about refusal." },
    "Timed Limiter": { role: "Concept", desc: "A device designed to force an ending onto a local pattern." },
    "Nullrock": { role: "Block", img: "assets/img/nullrock.png", desc: "World bottom (Y=0). 'Refusal made physical'." },
    "Veilglass": { role: "Block", img: "assets/img/veilglass.png", desc: "Material tuned to the frequency of the Veil." },
    "Runestone": { role: "Block", img: "assets/img/runestone.png", desc: "Continuist stone used to anchor rites." },
    "Artificer Bench": { role: "Item", img: "assets/img/artificer_bench.png", desc: "Canonical workstation for gatecraft." },
    "Embercoal": { role: "Block", img: "assets/img/coal.png", desc: "Fuel source that burns with a memory of heat." }
};

let wakeLockObj = null;

// GLOBAL FUNCTIONS
window.togglePanel = function(id) {
    document.querySelectorAll('.panel-overlay').forEach(p => p.classList.remove('active'));
    if (id) {
        const p = document.getElementById(id);
        if(p) p.classList.add('active');
        
        // Update URL state
        const url = new URL(window.location);
        url.searchParams.set('chapter', state.chapter);
        if (id === 'settingsPanel') url.searchParams.set('settings', '1');
        else if (id === 'helpPanel') url.searchParams.set('help', '1');
        else { url.searchParams.delete('settings'); url.searchParams.delete('help'); }
        window.history.pushState({}, '', url);
    } else {
        const url = new URL(window.location);
        url.searchParams.set('chapter', state.chapter);
        url.searchParams.delete('settings');
        url.searchParams.delete('help');
        window.history.pushState({}, '', url);
    }
};

window.switchChapter = function(num, autoScroll = true) {
    state.chapter = num;
    try {
        const url = new URL(window.location);
        url.searchParams.set('chapter', num);
        window.history.pushState({}, '', url);
    } catch(e) {}
    
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
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Listeners first
    setupEventListeners();
    
    // 2. Load state
    loadPersistentState();
    
    // 3. Prep text
    prepareTextForReading();
    
    // 4. Initial apply
    applySettings();
    setupLoreLinks();
    
    // 5. URL Sync
    const urlParams = new URLSearchParams(window.location.search);
    const chParam = urlParams.get('chapter');
    const setParam = urlParams.get('settings');
    const helpParam = urlParams.get('help');
    
    if (chParam) switchChapter(parseInt(chParam), false);
    else switchChapter(1, true);

    if (setParam) window.togglePanel('settingsPanel');
    if (helpParam) window.togglePanel('helpPanel');

    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = () => ensureVoicesLoaded();
        ensureVoicesLoaded();
    }
});

function prepareTextForReading() {
    const paragraphs = document.querySelectorAll('#bookContent p');
    paragraphs.forEach((p, pIdx) => {
        let html = p.innerHTML;
        const sentences = html.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [html];
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
    
    // UI Sync
    const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
    const setCheck = (id, val) => { const el = document.getElementById(id); if(el) el.checked = val; };
    
    setVal('zoomSlider', state.zoom);
    setVal('lineHeightSlider', state.lineHeight);
    setVal('letterSpacingSlider', state.letterSpacing);
    setVal('pageWidthSlider', state.pageWidth);
    setVal('tempoSlider', state.tempo);
    
    const chSelect = document.getElementById('chapterSelect');
    if(chSelect) chSelect.value = state.chapter;
    
    const tl = document.getElementById('tempoLabel'); if(tl) tl.innerText = `TEMPO: ${state.tempo} WPM`;
    
    setCheck('contrastToggle', state.highContrast);
    setCheck('focusModeToggle', state.focusMode);
    setCheck('wakeLockToggle', state.wakeLock);
    setCheck('toggleLore', state.showLore);
    setCheck('toggleHighlight', state.showUserHighlights);
    setCheck('toggleReadAlong', state.showHighlight);
    
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === state.theme));
    document.querySelectorAll('.btn-toggle[data-align]').forEach(b => b.classList.toggle('active', b.dataset.align === state.textAlign));
    document.querySelectorAll('.btn-toggle[data-font]').forEach(b => b.classList.toggle('active', b.dataset.font === state.font));
    
    const hb = document.getElementById('highlightModeBtn');
    if (hb) {
        hb.classList.toggle('active', state.highlightMode);
        body.classList.toggle('highlight-mode-active', state.highlightMode);
    }
    
    // Apply selected color to color picker
    document.querySelectorAll('.color-pick').forEach(b => {
        const color = b.dataset.color || b.style.backgroundColor;
        if (color === state.selectedColor || 
            (state.selectedColor && color.includes(state.selectedColor.replace(/[^\d,]/g, '').split(',')[0]))) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });
    
    // Apply highlight visibility
    body.classList.toggle('hide-highlights', !state.showUserHighlights);
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
        if(confirm("Restore all reader settings to defaults?")) {
            Object.assign(state, { theme: 'theme-oled', font: 'font-serif', zoom: 1.0, lineHeight: 1.6, letterSpacing: 0, paraSpacing: 1.5, pageWidth: 700, textAlign: 'justify', highContrast: false, focusMode: false, tempo: 250, showLore: true, showHighlight: true });
            saveState(); applySettings();
        }
    });

    // Tab Logic
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

    click('settingsBtn', () => window.togglePanel('settingsPanel'));
    click('helpBtn', () => window.togglePanel('helpPanel'));
    document.querySelectorAll('.close-btn').forEach(btn => { btn.onclick = () => window.togglePanel(null); });
    document.querySelectorAll('.settings-close').forEach(btn => { btn.onclick = () => window.togglePanel(null); });

    document.querySelectorAll('.panel-overlay').forEach(overlay => {
        overlay.addEventListener('mousedown', (e) => {
            if (e.target === overlay) window.togglePanel(null);
        });
        overlay.addEventListener('touchstart', (e) => {
            if (e.target === overlay) window.togglePanel(null);
        }, { passive: true });
    });

    click('ttsBtn', toggleReading);
    click('ttsRestartBtn', restartFromTop);
    click('previewVoiceBtn', previewVoice);
    click('downloadBtn', downloadBook);
    click('lockBtn', () => { state.zoomLocked = !state.zoomLocked; saveState(); applySettings(); });

    const chSelect = document.getElementById('chapterSelect');
    if(chSelect) chSelect.onchange = (e) => window.switchChapter(parseInt(e.target.value));
    
    // Voice selection handler
    const voiceSelect = document.getElementById('voiceSelect');
    if (voiceSelect) {
        voiceSelect.onchange = (e) => {
            state.voiceName = e.target.value;
            saveState();
            // Force voice refresh to apply immediately
            const voices = window.speechSynthesis.getVoices();
            console.log('Voice changed to:', state.voiceName, 'Available voices:', voices.map(v => v.name));
            // Auto-preview with new voice
            setTimeout(() => previewVoice(), 100);
        };
    }

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
        let isDragging = false;
        let dragStartSpan = null;
        
        area.onclick = (e) => {
            // Don't handle clicks while dragging
            if (isDragging) return;
            
            const span = e.target.closest('.read-span');
            if (state.highlightMode && span && !state.highlightStart) {
                handleManualHighlight(e, span);
            } else if (!state.highlightMode) {
                handleNoteTap(e);
            }
        };
        
        // Mouse events for drag highlighting
        area.onmousedown = (e) => {
            if (!state.highlightMode) return;
            isDragging = true;
            dragStartSpan = e.target.closest('.read-span');
            if (dragStartSpan && !state.highlightStart) {
                handleManualHighlight(e, dragStartSpan);
            }
        };
        
        area.onmouseup = (e) => {
            if (!state.highlightMode) return;
            isDragging = false;
            
            // Check if we have a selection from dragging
            const sel = window.getSelection();
            if (sel.toString().trim().length > 5) {
                state.tempRange = sel.getRangeAt(0).cloneRange();
                window.togglePanel('commentPanel');
            } else if (state.highlightStart && dragStartSpan) {
                // Handle click-to-select second span
                const endSpan = e.target.closest('.read-span');
                if (endSpan && endSpan !== dragStartSpan) {
                    handleManualHighlight(e, endSpan);
                }
            }
        };
        
        area.onmousemove = (e) => {
            if (!state.highlightMode || !isDragging) return;
            // Visual feedback for dragging could be added here
        };
        
        // Touch events for mobile
        area.ontouchstart = (e) => {
            if (!state.highlightMode) return;
            isDragging = true;
            const touch = e.touches[0];
            const element = document.elementFromPoint(touch.clientX, touch.clientY);
            dragStartSpan = element?.closest('.read-span');
            if (dragStartSpan && !state.highlightStart) {
                handleManualHighlight(e, dragStartSpan);
            }
        };
        
        area.ontouchend = (e) => {
            if (!state.highlightMode) return;
            isDragging = false;
            
            // Check if we have a selection from touch dragging
            const sel = window.getSelection();
            if (sel.toString().trim().length > 5) {
                state.tempRange = sel.getRangeAt(0).cloneRange();
                window.togglePanel('commentPanel');
            }
        };
    }

    document.querySelectorAll('.color-pick').forEach(b => {
        b.onclick = () => {
            state.selectedColor = b.dataset.color || b.style.backgroundColor;
            document.querySelectorAll('.color-pick').forEach(el => el.classList.remove('active'));
            b.classList.add('active');
        };
    });

    click('saveHighlightBtn', saveManualHighlight);
    click('closeComment', () => { window.togglePanel(null); state.highlightStart = null; });

    const toggle = (id, key) => { const el = document.getElementById(id); if(el) el.onchange = (e) => { state[key] = e.target.checked; saveState(); applySettings(); }; };
    toggle('contrastToggle', 'highContrast');
    toggle('focusModeToggle', 'focusMode');
    toggle('toggleLore', 'showLore');
    toggle('toggleHighlight', 'showUserHighlights');
    toggle('toggleReadAlong', 'showHighlight');
    
    const wake = document.getElementById('wakeLockToggle');
    if(wake) wake.onchange = toggleWakeLock;

    window.addEventListener('scroll', () => {
        state.scroll = window.scrollY;
        localStorage.setItem(`reader_scroll_ch${state.chapter}`, state.scroll);
        const progress = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        const bar = document.getElementById('progressBar'); if(bar) bar.style.width = progress + '%';
    });
    
    // ESC key to close panels
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const activePanel = document.querySelector('.panel-overlay.active');
            if (activePanel) {
                window.togglePanel(null);
            }
        }
    });
}

function handleManualHighlight(e, span) {
    if (!state.highlightStart) {
        state.highlightStart = span.id;
        span.classList.add('highlight-start-marker');
        const ind = document.createElement('div');
        ind.className = 'tap-indicator';
        ind.style.left = `${e.pageX}px`; ind.style.top = `${e.pageY - 12}px`;
        document.body.appendChild(ind);
    } else {
        const start = document.getElementById(state.highlightStart);
        if (!start) { state.highlightStart = null; return; }
        const range = document.createRange();
        range.setStartBefore(start);
        range.setEndAfter(span);
        state.tempRange = range;
        window.togglePanel('commentPanel');
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
        tip.className = 'note-tooltip'; tip.innerText = note;
        wrap.appendChild(tip);
        state.comments[id] = note;
    }
    try { state.tempRange.surroundContents(wrap); } catch(e) {}
    state.highlightMode = false; state.highlightStart = null;
    document.querySelectorAll('.tap-indicator, .highlight-start-marker').forEach(el => {
        if(el.classList.contains('tap-indicator')) el.remove();
        else el.classList.remove('highlight-start-marker');
    });
    saveState(); applySettings(); window.togglePanel(null);
    window.getSelection().removeAllRanges();
}

function handleNoteTap(e) {
    const h = e.target.closest('.user-highlight');
    if (h) {
        // Remove active class from all highlights
        document.querySelectorAll('.user-highlight').forEach(el => el.classList.remove('active-note'));
        
        // Add active class to clicked highlight
        h.classList.add('active-note');
        
        // Auto-hide after clicking elsewhere
        setTimeout(() => {
            const clear = (ev) => { 
                if (!h.contains(ev.target)) { 
                    h.classList.remove('active-note'); 
                    window.removeEventListener('click', clear); 
                } 
            };
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
    if (img) { if (data.img) { img.src = data.img; img.style.display = 'block'; } else img.style.display = 'none'; }
    window.togglePanel('lorePanel');
}

function populateVoices() {
    if(!window.speechSynthesis) return;
    const vs = document.getElementById('voiceSelect'); if (!vs) return;
    let voices = window.speechSynthesis.getVoices();
    console.log('All available voices:', voices.map(v => `${v.name} (${v.lang})`));
    
    // Filter for English voices but include more options
    voices = voices.filter(v => v.lang.startsWith('en'));
    console.log('English voices:', voices.map(v => `${v.name} (${v.lang})`));
    
    // Sort to put natural voices first, then by name
    voices.sort((a, b) => {
        const aNatural = a.name.includes('Natural') || a.name.includes('Google') || a.name.includes('Samantha') || a.name.includes('Karen') || a.name.includes('Daniel');
        const bNatural = b.name.includes('Natural') || b.name.includes('Google') || b.name.includes('Samantha') || b.name.includes('Karen') || b.name.includes('Daniel');
        if (aNatural && !bNatural) return -1;
        if (!aNatural && bNatural) return 1;
        return a.name.localeCompare(b.name);
    });
    
    vs.innerHTML = voices.map(v => `<option value="${v.name}" ${v.name === state.voiceName ? 'selected' : ''}>${v.name} (${v.lang})</option>`).join('');
    if (!state.voiceName && voices.length > 0) { 
        state.voiceName = voices[0].name; 
        saveState(); 
    }
    console.log('Selected voice:', state.voiceName);
}

// Mobile-friendly voice loading with retries
function ensureVoicesLoaded(callback, retries = 0) {
    if (!window.speechSynthesis) {
        if (callback) callback();
        return;
    }
    
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        populateVoices();
        if (callback) callback();
    } else if (retries < 5) {
        setTimeout(() => ensureVoicesLoaded(callback, retries + 1), 200);
    } else {
        // Fallback: try loading after user interaction
        document.addEventListener('click', function initVoices() {
            setTimeout(() => {
                populateVoices();
                if (callback) callback();
            }, 100);
            document.removeEventListener('click', initVoices);
        }, { once: true });
    }
}

function getSelectedVoice() {
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    // Always try to get the selected voice, fallback to first available
    const selected = voices.find(v => v.name === state.voiceName);
    return selected || voices[0];
}

function previewVoice() {
    if(!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const voice = getSelectedVoice();
    const utter = new SpeechSynthesisUtterance("Continuist system check. This is a voice preview.");
    if(voice) {
        utter.voice = voice;
        console.log('Previewing voice:', voice.name);
    }
    window.speechSynthesis.speak(utter);
}

function toggleReading() {
    if (state.readAlongActive) {
        if (state.ttsPaused) {
            resumeReading();
        } else {
            pauseReading();
        }
    } else {
        startReadAlong();
    }
}

function startReadAlong() {
    if (!window.speechSynthesis) return;
    state.readAlongActive = true;
    state.ttsPaused = false;
    const btn = document.getElementById('ttsBtn'); if(btn) btn.innerHTML = '<i class="fas fa-pause"></i>';
    
    // Get all readable elements: headings + spans
    const chapter = document.querySelector(`section[data-chapter="${state.chapter}"]`);
    if (!chapter) return;
    
    const headings = Array.from(chapter.querySelectorAll('h1, h2'));
    const spans = Array.from(chapter.querySelectorAll('.read-span'));
    const allElements = [];
    
    // Add headings with special class
    headings.forEach(h => {
        const wrapper = document.createElement('span');
        wrapper.className = 'tts-heading';
        wrapper.textContent = h.textContent.trim();
        wrapper.dataset.originalId = h.id || '';
        allElements.push(wrapper);
    });
    
    // Add spans
    allElements.push(...spans);
    
    // Find starting position
    let startIndex = 0;
    if (state.ttsSpanId) {
        const idx = allElements.findIndex(el => el.id === state.ttsSpanId || (el.dataset.originalId === state.ttsSpanId));
        if (idx >= 0) startIndex = idx;
    } else {
        // Find first visible element
        const firstVisible = allElements.find(el => {
            if (el.id) {
                const elem = document.getElementById(el.id);
                return elem && elem.getBoundingClientRect().top > 100;
            }
            return false;
        });
        if (firstVisible) startIndex = allElements.indexOf(firstVisible);
    }
    
    window.ttsQueue = allElements.slice(startIndex);
    window.ttsIndex = 0;
    
    speakNext();
}

function speakNext() {
    if (!state.readAlongActive || window.ttsIndex >= window.ttsQueue.length) {
        stopReading();
        return;
    }
    
    const element = window.ttsQueue[window.ttsIndex];
    const text = element.textContent.trim();
    
    if (!text) {
        window.ttsIndex++;
        speakNext();
        return;
    }
    
    // Clear previous highlights
    document.querySelectorAll('.reading-highlight').forEach(el => el.classList.remove('reading-highlight'));
    
    // Highlight current element
    let targetElement;
    if (element.classList.contains('tts-heading')) {
        // Find the actual heading element
        targetElement = element.dataset.originalId ? 
            document.getElementById(element.dataset.originalId) || 
            document.querySelector(`section[data-chapter="${state.chapter}"] h1, section[data-chapter="${state.chapter}"] h2`) :
            document.querySelector(`section[data-chapter="${state.chapter}"] h1, section[data-chapter="${state.chapter}"] h2`);
    } else {
        targetElement = document.getElementById(element.id);
    }
    
    if (targetElement) {
        targetElement.classList.add('reading-highlight');
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Save current position
        state.ttsSpanId = element.id || element.dataset.originalId || '';
        saveState();
    }
    
    const utter = new SpeechSynthesisUtterance(text);
    const voice = getSelectedVoice();
    if (voice) utter.voice = voice;
    utter.rate = state.tempo / 200;
    
    utter.onend = () => {
        window.ttsIndex++;
        speakNext();
    };
    
    utter.onerror = () => {
        window.ttsIndex++;
        speakNext();
    };
    
    window.speechSynthesis.speak(utter);
}

function pauseReading() {
    if (window.speechSynthesis) {
        window.speechSynthesis.pause();
        state.ttsPaused = true;
        const btn = document.getElementById('ttsBtn'); if(btn) btn.innerHTML = '<i class="fas fa-play"></i>';
        saveState();
    }
}

function resumeReading() {
    if (window.speechSynthesis) {
        window.speechSynthesis.resume();
        state.ttsPaused = false;
        const btn = document.getElementById('ttsBtn'); if(btn) btn.innerHTML = '<i class="fas fa-pause"></i>';
        saveState();
    }
}

function stopReading() {
    if(window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    state.readAlongActive = false;
    state.ttsPaused = false;
    const btn = document.getElementById('ttsBtn'); if(btn) btn.innerHTML = '<i class="fas fa-play"></i>';
    document.querySelectorAll('.reading-highlight').forEach(el => el.classList.remove('reading-highlight'));
    window.ttsQueue = [];
    window.ttsIndex = 0;
    saveState();
}

function restartFromTop() {
    // Clear saved position
    state.ttsSpanId = '';
    state.ttsPaused = false;
    
    // Stop current reading
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    
    // Start from top
    state.readAlongActive = false;
    setTimeout(() => startReadAlong(), 100);
}

async function toggleWakeLock(e) {
    state.wakeLock = e.target.checked;
    if (state.wakeLock && navigator.wakeLock) { try { wakeLockObj = await navigator.wakeLock.request('screen'); } catch (err) {} }
    else if (wakeLockObj) { await wakeLockObj.release(); wakeLockObj = null; }
    saveState();
}

function saveState() {
    Object.keys(storageMap).forEach(key => localStorage.setItem(storageMap[key], state[key]));
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

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
    ttsSpanId: 'reader_tts_span',
    readAlongActive: 'reader_read_along_active'
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

// Highlight System Variables
let highlightMode = false;
let highlightStart = null;
let highlightEnd = null;
let isDragging = false;
let currentHighlightColor = '#f2c14e';
let highlightsVisible = true;

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
        else if (id === 'downloadPanel') url.searchParams.set('download', '1');
        else if (id === 'highlightPickerPanel') url.searchParams.set('highlight', '1');
        else { url.searchParams.delete('settings'); url.searchParams.delete('help'); url.searchParams.delete('download'); url.searchParams.delete('highlight'); }
        window.history.pushState({}, '', url);
    } else {
        const url = new URL(window.location);
        url.searchParams.set('chapter', state.chapter);
        url.searchParams.delete('settings');
        url.searchParams.delete('help');
        url.searchParams.delete('download');
        url.searchParams.delete('highlight');
        window.history.pushState({}, '', url);
    }
};

window.toggleHighlightMode = function() {
    highlightMode = !highlightMode;
    highlightStart = null;
    highlightEnd = null;
    isDragging = false;
    
    document.body.classList.toggle('highlight-mode-active', highlightMode);
    
    const btn = document.getElementById('highlightModeBtn');
    if(btn) {
        btn.classList.toggle('active', highlightMode);
        btn.innerHTML = highlightMode ? '<i class="fas fa-highlighter"></i>' : '<i class="fas fa-mouse-pointer"></i>';
    }
    
    // Clear any existing selection when exiting highlight mode
    if (!highlightMode) {
        window.getSelection().removeAllRanges();
    }
};

window.toggleHighlights = function() {
    highlightsVisible = !highlightsVisible;
    document.body.classList.toggle('hide-highlights', !highlightsVisible);
    
    const btn = document.getElementById('toggleHighlightsBtn');
    if(btn) {
        btn.innerHTML = highlightsVisible ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
    }
};

window.saveHighlight = function() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (!selection || selectedText.length === 0) return;
    
    const note = document.getElementById('highlightNote').value.trim();
    const color = document.getElementById('highlightColorPicker').value;
    
    // Create unique ID
    const id = `hl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Store highlight
    state.comments[id] = {
        text: selectedText,
        color: color,
        note: note,
        chapter: state.chapter,
        timestamp: new Date().toISOString()
    };
    
    // Apply highlight to DOM
    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.className = 'user-highlight';
    span.setAttribute('data-id', id);
    span.style.backgroundColor = color;
    span.style.padding = '2px 0';
    span.style.borderRadius = '3px';
    span.style.cursor = 'pointer';
    span.style.position = 'relative';
    
    try {
        range.surroundContents(span);
    } catch(e) {
        // If range can't be applied, clone the contents
        span.appendChild(range.cloneContents());
        range.deleteContents();
        range.insertNode(span);
    }
    
    // Add note tooltip if exists
    if (note) {
        const tooltip = document.createElement('span');
        tooltip.className = 'note-tooltip';
        tooltip.textContent = note;
        tooltip.style.cssText = `
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.7rem;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s;
            z-index: 1000;
        `;
        
        span.appendChild(tooltip);
        
        span.addEventListener('mouseenter', () => {
            tooltip.style.opacity = '1';
        });
        
        span.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
        });
    }
    
    // Add click to open color picker
    span.addEventListener('click', (e) => {
        e.stopPropagation();
        const existingId = span.getAttribute('data-id');
        const existing = state.comments[existingId];
        if (existing) {
            document.getElementById('highlightColorPicker').value = existing.color;
            document.getElementById('highlightNote').value = existing.note || '';
            window.togglePanel('highlightPickerPanel');
        }
    });
    
    // Save and close
    saveState();
    window.togglePanel(null);
    
    // Clear selection and reset
    selection.removeAllRanges();
    document.getElementById('highlightNote').value = '';
};

function applyHighlightToDOM(start, end, id, color, note) {
    const range = document.createRange();
    range.setStart(start, 0);
    range.setEnd(end, end.textContent.length);
    
    const span = document.createElement('span');
    span.className = 'user-highlight';
    span.setAttribute('data-id', id);
    span.style.backgroundColor = color;
    span.style.padding = '2px 0';
    span.style.borderRadius = '3px';
    span.style.cursor = 'pointer';
    span.style.position = 'relative';
    
    try {
        range.surroundContents(span);
    } catch(e) {
        // If range can't be applied, wrap text nodes individually
        const walker = document.createTreeWalker(
            start.parentElement,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        let inRange = false;
        const nodes = [];
        
        while(node = walker.nextNode()) {
            if (node === start) inRange = true;
            if (inRange) nodes.push(node);
            if (node === end) break;
        }
        
        if (nodes.length > 0) {
            const first = nodes[0];
            const last = nodes[nodes.length - 1];
            
            first.parentNode.insertBefore(span, first);
            nodes.forEach(n => span.appendChild(n));
        }
    }
    
    // Add note tooltip if exists
    if (note) {
        const tooltip = document.createElement('span');
        tooltip.className = 'note-tooltip';
        tooltip.textContent = note;
        tooltip.style.cssText = `
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.7rem;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.2s;
            z-index: 1000;
        `;
        
        span.appendChild(tooltip);
        
        span.addEventListener('mouseenter', () => {
            tooltip.style.opacity = '1';
        });
        
        span.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
        });
    }
    
    // Add click to open color picker
    span.addEventListener('click', (e) => {
        e.stopPropagation();
        const existingId = span.getAttribute('data-id');
        const existing = state.comments[existingId];
        if (existing) {
            document.getElementById('highlightColorPicker').value = existing.color;
            document.getElementById('highlightNote').value = existing.note || '';
            window.togglePanel('highlightPickerPanel');
        }
    });
}

function loadHighlights() {
    Object.entries(state.comments).forEach(([id, data]) => {
        if (data.chapter !== state.chapter) return;
        
        // Find and highlight the text
        const text = data.text;
        const walker = document.createTreeWalker(
            document.getElementById('bookContent'),
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        let found = false;
        const nodes = [];
        
        while(node = walker.nextNode()) {
            if (!found && node.textContent.includes(text.substring(0, 10))) {
                found = true;
            }
            if (found) nodes.push(node);
            if (nodes.join('').length >= text.length) break;
        }
        
        if (nodes.length > 0) {
            const start = nodes[0];
            const end = nodes[nodes.length - 1];
            applyHighlightToDOM(start, end, id, data.color, data.note);
        }
    });
}

window.downloadEbook = function(format) {
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) return;
    
    const title = 'Echoes_of_the_Continuist';
    
    switch(format) {
        case 'epub':
            generateEPUB(title, bookContent);
            break;
        case 'pdf':
            generatePDF(title, bookContent);
            break;
        case 'txt':
            generateTXT(title, bookContent);
            break;
        case 'html':
            generateHTML(title, bookContent);
            break;
    }
};

function generateEPUB(title, content) {
    // Create EPUB structure
    const zip = new JSZip();
    
    // 1. mimetype (must be first)
    zip.file('mimetype', 'application/epub+zip');
    
    // 2. META-INF/container.xml
    const containerXml = `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
    <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>`;
    zip.folder('META-INF').file('container.xml', containerXml);
    
    // 3. OEBPS/content.opf (manifest)
    const chapters = content.querySelectorAll('section[data-chapter]');
    let manifestItems = '';
    let spineItems = '';
    
    chapters.forEach((ch, idx) => {
        const chId = `chapter${idx + 1}`;
        manifestItems += `<item id="${chId}" href="${chId}.xhtml" media-type="application/xhtml+xml"/>\n`;
        spineItems += `<itemref idref="${chId}"/>\n`;
    });
    
    const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:identifier id="bookid">${title}</dc:identifier>
        <dc:title>${title.replace(/_/g, ' ')}</dc:title>
        <dc:creator>LatticeVeil</dc:creator>
        <dc:language>en</dc:language>
        <dc:date>${new Date().toISOString().split('T')[0]}</dc:date>
    </metadata>
    <manifest>
        <item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
        <item id="css" href="styles.css" media-type="text/css"/>
        ${manifestItems}
    </manifest>
    <spine toc="toc">
        ${spineItems}
    </spine>
</package>`;
    
    zip.folder('OEBPS').file('content.opf', contentOpf);
    
    // 4. CSS
    const css = `body {
        font-family: 'Merriweather', serif;
        line-height: 1.6;
        color: #333;
        max-width: 700px;
        margin: 0 auto;
        padding: 20px;
    }
    h1 { text-align: center; margin: 2em 0; }
    p { text-indent: 2em; margin: 1em 0; }
    .chapter-title { text-align: center; margin: 3em 0 1em 0; }`;
    
    zip.folder('OEBPS').file('styles.css', css);
    
    // 5. Chapter files
    chapters.forEach((ch, idx) => {
        const chContent = ch.innerHTML
            .replace(/<span[^>]*class="read-span"[^>]*>(.*?)<\/span>/g, '$1')
            .replace(/<span[^>]*class="user-highlight"[^>]*>(.*?)<\/span>/g, '$1');
        
        const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>Chapter ${idx + 1}</title>
    <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
    ${chContent}
</body>
</html>`;
        
        zip.folder('OEBPS').file(`chapter${idx + 1}.xhtml`, xhtml);
    });
    
    // 6. Generate and download
    zip.generateAsync({type: 'blob'}).then(function(content) {
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.epub`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

function generatePDF(title, content) {
    // Simple PDF generation using browser print
    const printWindow = window.open('', '_blank');
    const cleanContent = content.innerHTML
        .replace(/<span[^>]*class="read-span"[^>]*>(.*?)<\/span>/g, '$1')
        .replace(/<span[^>]*class="user-highlight"[^>]*>(.*?)<\/span>/g, '$1')
        .replace(/<section[^>]*data-chapter="[^"]*"[^>]*>/g, '<div class="chapter-break">')
        .replace(/<\/section>/g, '</div>');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title.replace(/_/g, ' ')}</title>
            <style>
                body { font-family: 'Merriweather', serif; line-height: 1.6; color: #000; max-width: 700px; margin: 0 auto; padding: 20px; }
                h1 { text-align: center; margin: 2em 0; }
                p { text-indent: 2em; margin: 1em 0; }
                .chapter-break { page-break-before: always; margin-top: 50px; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <h1>${title.replace(/_/g, ' ')}</h1>
            ${cleanContent}
        </body>
        </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 100);
}

function generateTXT(title, content) {
    const text = content.innerText
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function generateHTML(title, content) {
    const cleanContent = content.innerHTML
        .replace(/<span[^>]*class="read-span"[^>]*>(.*?)<\/span>/g, '$1')
        .replace(/<span[^>]*class="user-highlight"[^>]*>(.*?)<\/span>/g, '$1');
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title.replace(/_/g, ' ')}</title>
    <style>
        body {
            font-family: 'Merriweather', serif;
            line-height: 1.6;
            color: #333;
            max-width: 700px;
            margin: 0 auto;
            padding: 20px;
            background: #fff;
        }
        h1 { text-align: center; margin: 2em 0; }
        p { text-indent: 2em; margin: 1em 0; }
        .chapter-title { text-align: center; margin: 3em 0 1em 0; }
    </style>
</head>
<body>
    <h1>${title.replace(/_/g, ' ')}</h1>
    ${cleanContent}
</body>
</html>`;
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
    window.masterResetAll = function() {
    if(confirm("Reset ALL settings to defaults? This will restore the black theme and reset everything as if the site was new.")) {
        // Clear all localStorage
        localStorage.clear();
        
        // Reset state to defaults
        Object.assign(state, { 
            theme: 'theme-oled', 
            font: 'font-serif', 
            size: 18,
            zoom: 1.0, 
            lineHeight: 1.6, 
            letterSpacing: 0, 
            paraSpacing: 1.5, 
            pageWidth: 700, 
            textAlign: 'justify', 
            highContrast: false, 
            focusMode: false, 
            tempo: 250, 
            showLore: true, 
            showHighlight: true, 
            showUserHighlights: true,
            zoomLocked: false,
            selectedColor: 'rgba(242, 193, 78, 0.4)',
            wakeLock: false,
            readAlongActive: false,
            ttsPaused: false,
            ttsSpanId: '',
            voiceName: '',
            comments: {}
        });
        
        // Apply settings and close panel
        applySettings();
        window.togglePanel(null);
        
        // Reload page to ensure clean state
        setTimeout(() => {
            window.location.reload();
        }, 100);
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
    
    // 5. Load highlights
    loadHighlights();
    
    // 6. URL Sync
    const urlParams = new URLSearchParams(window.location.search);
    const chParam = urlParams.get('chapter');
    const setParam = urlParams.get('settings');
    const helpParam = urlParams.get('help');
    const downloadParam = urlParams.get('download');
    const highlightParam = urlParams.get('highlight');
    
    if (chParam) switchChapter(parseInt(chParam), false);
    else switchChapter(1, true);

    if (setParam) window.togglePanel('settingsPanel');
    if (helpParam) window.togglePanel('helpPanel');
    if (downloadParam) window.togglePanel('downloadPanel');
    if (highlightParam) window.togglePanel('highlightPickerPanel');

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
    const body = document.body;
    body.className = `${state.theme} ${state.font} ${state.highContrast ? 'high-contrast' : ''} ${state.focusMode ? 'focus-mode' : ''} ${state.showUserHighlights ? '' : 'hide-highlights'}`;
    
    document.documentElement.style.setProperty('--reader-font', state.font === 'font-serif' ? "'Merriweather', serif" : state.font === 'font-sans' ? "'Inter', sans-serif" : "'VT323', monospace");
    document.documentElement.style.setProperty('--reader-size', `${state.size * state.zoom}px`);
    document.documentElement.style.setProperty('--reader-line-height', state.lineHeight);
    document.documentElement.style.setProperty('--reader-letter-spacing', `${state.letterSpacing}px`);
    document.documentElement.style.setProperty('--reader-max-width', `${state.pageWidth}px`);
    
    const bookContent = document.getElementById('bookContent');
    if (bookContent) bookContent.style.textAlign = state.textAlign;
    bookContent.style.setProperty('--reader-para-spacing', `${state.paraSpacing}em`);
    
    // Update text preview
    const preview = document.getElementById('textPreview');
    if (preview) {
        preview.style.fontFamily = state.font === 'font-serif' ? "'Merriweather', serif" : state.font === 'font-sans' ? "'Inter', sans-serif" : "'VT323', monospace";
        preview.style.fontSize = `${state.size * state.zoom * 0.9}px`;
        preview.style.lineHeight = state.lineHeight;
        preview.style.letterSpacing = `${state.letterSpacing}px`;
        preview.style.maxWidth = `${state.pageWidth}px`;
        preview.style.textAlign = state.textAlign;
    }
    
    // Update sliders and buttons
    const chSelect = document.getElementById('chapterSelect');
    if(chSelect) chSelect.value = state.chapter;
    
    const tl = document.getElementById('tempoLabel'); if(tl) tl.innerText = `TEMPO: ${state.tempo} WPM`;
    
    // UI Sync
    const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
    const setCheck = (id, val) => { const el = document.getElementById(id); if(el) el.checked = val; };
    
    setVal('zoomSlider', state.zoom);
    setVal('lineHeightSlider', state.lineHeight);
    setVal('letterSpacingSlider', state.letterSpacing);
    setVal('pageWidthSlider', state.pageWidth);
    setVal('tempoSlider', state.tempo);
    
    setCheck('contrastToggle', state.highContrast);
    setCheck('focusModeToggle', state.focusMode);
    setCheck('wakeLockToggle', state.wakeLock);
    setCheck('toggleLore', state.showLore);
    setCheck('toggleHighlight', state.showUserHighlights);
    setCheck('toggleReadAlong', state.readAlongActive);
    
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === state.theme));
    document.querySelectorAll('.btn-toggle[data-align]').forEach(b => b.classList.toggle('active', b.dataset.align === state.textAlign));
    document.querySelectorAll('.btn-toggle[data-font]').forEach(b => b.classList.toggle('active', b.dataset.font === state.font));
    
    const hb = document.getElementById('highlightModeBtn');
    if (hb) {
        hb.classList.toggle('active', state.highlightMode);
        body.classList.toggle('highlight-mode-active', state.highlightMode);
    }
    
    const lb = document.getElementById('lockBtn');
    if (lb) {
        lb.classList.toggle('active', state.zoomLocked);
        lb.innerHTML = state.zoomLocked ? '<i class="fas fa-lock"></i>' : '<i class="fas fa-lock-open"></i>';
    }
    
    if (state.readAlongActive) {
        const btn = document.getElementById('ttsBtn'); if(btn) btn.innerHTML = '<i class="fas fa-pause"></i>';
    } else {
        const btn = document.getElementById('ttsBtn'); if(btn) btn.innerHTML = '<i class="fas fa-play"></i>';
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
    click('downloadBtn', () => window.togglePanel('downloadPanel'));
    click('highlightModeBtn', toggleHighlightMode);
    click('toggleHighlightsBtn', toggleHighlights);
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
            // No auto-preview - user must click preview button
        };
    }

    // Highlight system - use normal text selection
    const area = document.getElementById('readingArea');
    if(area) {
        let selectionTimeout = null;
        
        // Handle mouseup for selection
        area.addEventListener('mouseup', (e) => {
            if (!highlightMode) return;
            
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            
            if (selectedText.length > 3) {
                // Clear previous timeout
                if (selectionTimeout) clearTimeout(selectionTimeout);
                
                // Show highlight indicator briefly, then open color picker
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                
                // Create temporary indicator
                const indicator = document.createElement('div');
                indicator.style.cssText = `
                    position: fixed;
                    left: ${rect.right + 5}px;
                    top: ${rect.top}px;
                    width: 24px;
                    height: 24px;
                    background: rgba(56, 225, 255, 0.9);
                    border: 2px solid var(--reader-accent);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 12px;
                    z-index: 10000;
                    cursor: pointer;
                    animation: pulse 1s infinite;
                `;
                indicator.innerHTML = '<i class="fas fa-highlighter"></i>';
                document.body.appendChild(indicator);
                
                // Auto-open color picker after short delay
                selectionTimeout = setTimeout(() => {
                    indicator.remove();
                    window.togglePanel('highlightPickerPanel');
                }, 800);
                
                // Click indicator to open immediately
                indicator.addEventListener('click', () => {
                    clearTimeout(selectionTimeout);
                    indicator.remove();
                    window.togglePanel('highlightPickerPanel');
                });
            }
        });
        
        // Handle touch events for mobile
        area.addEventListener('touchend', (e) => {
            if (!highlightMode) return;
            
            setTimeout(() => {
                const selection = window.getSelection();
                const selectedText = selection.toString().trim();
                
                if (selectedText.length > 3) {
                    window.togglePanel('highlightPickerPanel');
                }
            }, 100);
        });
        
        // Prevent selection when not in highlight mode
        area.addEventListener('selectstart', (e) => {
            if (!highlightMode) {
                e.preventDefault();
            }
        });
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

    const toggle = (id, key) => { 
        const el = document.getElementById(id); 
        if(el) el.onchange = (e) => { 
            state[key] = e.target.checked; 
            // If toggling readAlongActive off, stop reading
            if (key === 'readAlongActive' && !state[key]) {
                stopReading();
            }
            saveState(); applySettings(); 
        }; 
    };
    toggle('contrastToggle', 'highContrast');
    toggle('focusModeToggle', 'focusMode');
    toggle('wakeLockToggle', 'wakeLock');
    toggle('toggleLore', 'showLore');
    toggle('toggleHighlight', 'showUserHighlights');
    toggle('toggleReadAlong', 'readAlongActive');
    
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
    console.log('All available voices:', voices.map(v => `${v.name} (${v.lang}) - Local: ${v.localService}`));
    
    // Include all voices first, then filter for English
    console.log('Total voices available:', voices.length);
    
    // Check for Siri-like voices on all platforms
    const siriPatterns = [
        'Samantha', 'Karen', 'Daniel', 'Tessa', 'Moira', 'Ava', 'Eddie', 'Alex', 'Victoria', 'Fred',
        'Monica', 'Nicky', 'Allison', 'Susan', 'Rishi', 'Amelie', 'Thomas', 'Serena'
    ];
    
    // Also check for high-quality voices
    const qualityPatterns = [
        'Neural', 'Premium', 'Natural', 'Enhanced', 'Wavenet', 'Standard', 'Google'
    ];
    
    // Sort voices by priority
    voices.sort((a, b) => {
        // Check for Siri-like voices
        const aSiri = siriPatterns.some(pattern => a.name.includes(pattern));
        const bSiri = siriPatterns.some(pattern => b.name.includes(pattern));
        
        // Check for quality indicators
        const aQuality = qualityPatterns.some(pattern => a.name.includes(pattern));
        const bQuality = qualityPatterns.some(pattern => b.name.includes(pattern));
        
        // Priority: Siri-like > Quality > Local > Others
        if (aSiri && !bSiri) return -1;
        if (!aSiri && bSiri) return 1;
        if (aQuality && !bQuality) return -1;
        if (!aQuality && bQuality) return 1;
        if (a.localService && !b.localService) return -1;
        if (!a.localService && b.localService) return 1;
        
        // Then by language (English first)
        const aEnglish = a.lang.startsWith('en');
        const bEnglish = b.lang.startsWith('en');
        if (aEnglish && !bEnglish) return -1;
        if (!aEnglish && bEnglish) return 1;
        
        // Finally by name
        return a.name.localeCompare(b.name);
    });
    
    console.log('Siri-like voices found:', voices.filter(v => siriPatterns.some(pattern => v.name.includes(pattern))).map(v => v.name));
    
    vs.innerHTML = voices.map(v => {
        let label = v.name;
        if (v.localService) label += ' 🍎';
        if (siriPatterns.some(pattern => v.name.includes(pattern))) label += ' ✨';
        if (qualityPatterns.some(pattern => v.name.includes(pattern))) label += ' �';
        label += ` (${v.lang})`;
        
        return `<option value="${v.name}" ${v.name === state.voiceName ? 'selected' : ''}>${label}</option>`;
    }).join('');
    
    // Auto-select best voice if none selected
    if (!state.voiceName && voices.length > 0) {
        // Try to find a Siri-like voice first
        const siriVoice = voices.find(v => siriPatterns.some(pattern => v.name.includes(pattern)));
        state.voiceName = siriVoice ? siriVoice.name : voices[0].name;
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
    console.log('Getting voice - Selected:', state.voiceName, 'Found:', selected ? selected.name : 'None');
    return selected || voices[0];
}

function previewVoice() {
    if(!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    // Force refresh voices list
    const voices = window.speechSynthesis.getVoices();
    console.log('Available voices for preview:', voices.map(v => `${v.name} (${v.lang})`));
    
    const voice = getSelectedVoice();
    const utter = new SpeechSynthesisUtterance("Continuist system check. This is a voice preview to test the selected voice at the current tempo setting.");
    
    if(voice) {
        utter.voice = voice;
        console.log('Previewing with voice:', voice.name, 'Lang:', voice.lang, 'Local:', voice.localService);
    } else {
        console.warn('No voice found for preview');
    }
    
    // Apply tempo setting to preview
    utter.rate = state.tempo / 200;
    console.log('Preview tempo rate:', utter.rate);
    
    // Add event listeners to verify
    utter.onstart = () => console.log('Preview started with voice:', utter.voice?.name, 'Rate:', utter.rate);
    utter.onend = () => console.log('Preview ended');
    utter.onerror = (e) => console.error('Preview error:', e);
    
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
    
    // Create fresh utterance for each text
    const utter = new SpeechSynthesisUtterance(text);
    const voice = getSelectedVoice();
    
    if (voice) {
        utter.voice = voice;
        console.log('Speaking with voice:', voice.name, 'Lang:', voice.lang);
    } else {
        console.warn('No voice available, using default');
    }
    
    utter.rate = state.tempo / 200;
    
    utter.onstart = () => console.log('Started speaking with voice:', utter.voice?.name);
    utter.onend = () => {
        console.log('Finished speaking, moving to next');
        window.ttsIndex++;
        speakNext();
    };
    utter.onerror = (e) => {
        console.error('Speech error:', e);
        window.ttsIndex++;
        speakNext();
    };
    
    window.speechSynthesis.speak(utter);
}

function pauseReading() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel(); // Use cancel instead of pause for immediate stop
        state.ttsPaused = true;
        state.readAlongActive = false; // Reset to allow restart from same position
        const btn = document.getElementById('ttsBtn'); if(btn) btn.innerHTML = '<i class="fas fa-play"></i>';
        saveState();
    }
}

function resumeReading() {
    // Resume by starting from current position
    startReadAlong();
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

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
    highlightMode: false,
    selectedColor: '#f2c14e',
    highlightToolbarPosition: { x: null, y: null },
    readAlongEnabled: true,
    zoomLocked: false,
    wakeLock: false,
    speaking: false,
    readAlongActive: false,
    ttsPaused: false,
    ttsSpanId: '',
    comments: {},
    panelPosition: { x: null, y: null }
};

const objectStateKeys = new Set(['panelPosition', 'highlightToolbarPosition']);

function getTtsStorageKey(type, chapterNum = state.chapter) {
    return `reader_tts_${type}_ch${chapterNum}`;
}

function loadChapterTtsState(chapterNum = state.chapter) {
    state.ttsSpanId = localStorage.getItem(getTtsStorageKey('span', chapterNum)) || '';
    state.ttsPaused = localStorage.getItem(getTtsStorageKey('paused', chapterNum)) === 'true';
}

function markReaderChapterSeen(chapterNum = state.chapter) {
    const normalizedChapter = Math.max(1, parseInt(chapterNum, 10) || 1);
    const highestSeen = parseInt(localStorage.getItem('reader_highest_chapter_seen') || '0', 10) || 0;
    localStorage.setItem('reader_highest_chapter_seen', String(Math.max(highestSeen, normalizedChapter)));
}

function saveChapterTtsState(chapterNum = state.chapter) {
    localStorage.setItem(getTtsStorageKey('span', chapterNum), state.ttsSpanId || '');
    localStorage.setItem(getTtsStorageKey('paused', chapterNum), String(!!state.ttsPaused));
}

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
    highlightMode: 'reader_highlight_mode',
    selectedColor: 'reader_selected_highlight_color',
    highlightToolbarPosition: 'reader_highlight_toolbar_position',
    readAlongEnabled: 'reader_read_along_enabled',
    zoomLocked: 'reader_zoom_locked',
    panelPosition: 'reader_panel_position',
    readAlongActive: 'reader_read_along_active'
};

function loadPersistentState() {
    try {
        Object.keys(storageMap).forEach(key => {
            const val = localStorage.getItem(storageMap[key]);
            if (val !== null) {
                if (objectStateKeys.has(key)) {
                    try {
                        const parsed = JSON.parse(val);
                        if (parsed && typeof parsed === 'object') {
                            state[key] = parsed;
                        }
                    } catch (_) {
                        state[key] = { x: null, y: null };
                    }
                    return;
                }
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
    "Avery": { role: "Character", img: "assets/img/hero_bg.png", desc: "A Continuum surveyor whose instincts are rooted in route discipline, salvage logic, and local field procedure. Careful, dry, and deeply adapted to the world’s rules." },
    "Eli": { role: "Character", desc: "Eli, 'The Listener.' Sensitive to the Echo’s pressure and the way places try to complete themselves. He uses alcohol as a crude, risky limiter to blur the signal—buying clarity later at the cost of himself." },
    "Sister Orin": { role: "Character", desc: "Principles Veilkeeper Sealwright. Believes an open door is a debt unpaid." },
    "Orin": { role: "Character", desc: "Principles Veilkeeper Sealwright. Believes an open door is a debt unpaid." },
    "Kade Rowan": { role: "Character", desc: "Veteran Hearthward Guide. Specialist in safe routes and community discipline." },
    "Continuum Rook": { role: "Character", desc: "A Continuum route-runner waiting at Anchorfall Cliffs. Clever, useful, and too fond of shortcuts. This is the voxel-side Rook, separate from the real-world Rook." },
    "Rook": { role: "Character", desc: "Field specialist with sharp instincts and a bad habit of pushing timing right to the edge. Useful in a crisis, unsettling when the numbers stop behaving." },
    "Dr. Sarah Chen": { role: "Character", desc: "Lead researcher on the real-world side of the breach. Precise, controlled, and deeply committed to getting her people home alive." },
    "Sarah Chen": { role: "Character", desc: "Lead researcher on the real-world side of the breach. Precise, controlled, and deeply committed to getting her people home alive." },
    "Sarah": { role: "Character", desc: "A scientist who treats uncertainty like something to be mapped, tested, and survived rather than feared." },
    "Dr. Avery Chen": { role: "Character", desc: "A real-world engineer and researcher from Project Chimera. Methodical, protective, and trained to reduce chaos into sequence, signal, and workable decisions." },
    "Dr. Avery": { role: "Character", desc: "A real-world engineer and researcher from Project Chimera. Methodical, protective, and trained to reduce chaos into sequence, signal, and workable decisions." },
    "Dr.Avery Chen": { role: "Character", desc: "A real-world engineer and researcher from Project Chimera. Methodical, protective, and trained to reduce chaos into sequence, signal, and workable decisions." },
    "Dr.Avery": { role: "Character", desc: "A real-world engineer and researcher from Project Chimera. Methodical, protective, and trained to reduce chaos into sequence, signal, and workable decisions." },
    "Avery Chen": { role: "Character", desc: "A real-world engineer and researcher from Project Chimera. Methodical, protective, and trained to reduce chaos into sequence, signal, and workable decisions." },
    "Elijah Jay Marcus": { role: "Character", desc: "Observant analyst whose instincts are often faster than his explanations. He notices patterns other people miss, even when he wishes he did not." },
    "Elijah": { role: "Character", desc: "Observant analyst whose instincts are often faster than his explanations. He notices patterns other people miss, even when he wishes he did not." },
    "Kaden Ave Williams": { role: "Character", desc: "Communications and signal specialist carrying more strain than he lets the others see. Useful, steady, and clearly tied to unusual equipment." },
    "Kaden": { role: "Character", desc: "Communications and signal specialist carrying more strain than he lets the others see. Useful, steady, and clearly tied to unusual equipment." },
    "Continuist": { role: "Faction", desc: "Continuists treat reality like a system you can stabilize: repeatable steps, logged observations, and the Rule of Three. They don’t worship artifacts; they trust process—especially when the Veil starts rewriting the rules." },
    "Veilkeepers": { role: "Faction", desc: "Veilkeepers are sealwrights, wardens, and boundary engineers. They prioritize containment over discovery: close the breach, cap the conduit, deny the loop—then argue about meaning later." },
    "Hearthward": { role: "Faction", desc: "Focuses on communal survival holds and practical discipline." },
    "Echo Faith": { role: "Faction", desc: "Listeners who interpret the Echo's patterns as messages." },
    "Ascendants": { role: "Faction", desc: "Pressure-seekers who believe limits are lies." },
    "Project Chimera": { role: "Program", desc: "A classified real-world dimensional research program trying to measure, track, and survive contact with places that do not behave like ordinary reality." },
    "Chimera": { role: "Program", desc: "A classified real-world dimensional research program trying to measure, track, and survive contact with places that do not behave like ordinary reality." },
    "Meridian Group": { role: "Company", desc: "The parent organization above Project Chimera: secretive, well-funded, and directly tied to the breach work returning from the field." },
    "Meridian": { role: "Company", desc: "The parent organization above Project Chimera: secretive, well-funded, and directly tied to the breach work returning from the field." },
    "Continuum": { role: "Place", desc: "The voxel world at the center of the story: ancient, procedural, and full of routes, ruins, and rules that feel discovered rather than invented." },
    "Veil": { role: "Phenomenon", desc: "The Veil is the boundary between places, states, and routes—thin in some corridors, welded shut in others. When it loosens, the world starts offering ‘second doors’: outcomes that feel inevitable until you refuse to complete them." },
    "Echo": { role: "Phenomenon", desc: "The Echo is pattern-pressure: a pull toward completion. It rewards repetition, loops, and clean endings—usually by shaving away detail. People don’t vanish loudly here; they simplify." },
    "Limiter": { role: "Concept", desc: "A limiter is a termination condition—an enforced stop that prevents a system from escalating into self-reinforcing collapse. In the field, limiters are less about power and more about refusal." },
    "Timed Limiter": { role: "Concept", desc: "A device designed to force an ending onto a local pattern." },
    "Frame": { role: "Concept", desc: "The stabilizing structure around an event, route, or portal. If the frame fails, everything inside it starts negotiating new rules." },
    "Conduit": { role: "Concept", desc: "The path or material that lets a force, signal, or breach move from one state into another." },
    "portal": { role: "Structure", desc: "A threshold structure linking spaces or layers of the world. Stable ones can be used safely; unstable ones demand repair, caution, or both." },
    "lattice scars": { role: "Phenomenon", desc: "Pale geometric seams left where reality has been stressed, stitched, or forced to settle into a shape it did not choose naturally." },
    "survey slate": { role: "Item", desc: "A practical field tool for marks, notes, and procedures. In a place ruled by routes and repetition, writing things down can be a form of survival." },
    "Pebble": { role: "Character", desc: "A quiet Wayhound that matters more than a first glance suggests. Helpful, watchful, and clearly connected to routes and thresholds." },
    "Wayhound": { role: "Creature", desc: "A route-sensitive animal species tied to guidance, movement, and safe passage through unstable parts of the world." },
    "Braceback": { role: "Creature", desc: "A large territorial Continuum brute associated with broken braces, damaged routes, and disturbed stone. Heavy, fast in short bursts, and dangerous in tight terrain." },
    "Crimson Veil": { role: "Dimension", desc: "A hostile voxel-only dimension deeper inside LatticeVeil’s cosmology. Dangerous, survivable, and treated like a real destination rather than a myth." },
    "Pale Archive": { role: "Dimension", desc: "A colder, quieter voxel-only dimension shaped by age, silence, and wrong spatial logic more than open aggression." },
    "Nullrock": { role: "Block", img: "assets/img/nullrock.png", desc: "World bottom (Y=0). 'Refusal made physical'." },
    "Veilglass": { role: "Block", img: "assets/img/veilglass.png", desc: "Material tuned to the frequency of the Veil." },
    "Runestone": { role: "Block", img: "assets/img/runestone.png", desc: "Continuist stone used to anchor rites." },
    "Artificer Bench": { role: "Item", img: "assets/img/artificer_bench.png", desc: "Canonical workstation for gatecraft." },
    "Embercoal": { role: "Block", img: "assets/img/coal.png", desc: "Fuel source that burns with a memory of heat." }
};

let wakeLockObj = null;

// Highlight feature removed

// Text Offset Calculation Functions
function getTextOffsets(range) {
    const container = document.getElementById('bookContent');
    if (!container) return null;
    
    const treeWalker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    let startOffset = 0;
    let endOffset = 0;
    let currentOffset = 0;
    let foundStart = false;
    let foundEnd = false;
    
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;
    
    while (treeWalker.nextNode()) {
        const node = treeWalker.currentNode;
        const nodeLength = node.textContent.length;
        
        // Check if this node contains the start of our range
        if (!foundStart && (node === startContainer || node.contains(startContainer))) {
            if (node === startContainer) {
                startOffset = currentOffset + range.startOffset;
            } else {
                // Find the exact text node within this container
                startOffset = currentOffset + getTextOffsetInNode(startContainer, range.startOffset);
            }
            foundStart = true;
        }
        
        // Check if this node contains the end of our range
        if (!foundEnd && (node === endContainer || node.contains(endContainer))) {
            if (node === endContainer) {
                endOffset = currentOffset + range.endOffset;
            } else {
                // Find the exact text node within this container
                endOffset = currentOffset + getTextOffsetInNode(endContainer, range.endOffset);
            }
            foundEnd = true;
        }
        
        currentOffset += nodeLength;
        
        // If we've found both start and end, we can stop
        if (foundStart && foundEnd) {
            break;
        }
    }
    
    return { start: startOffset, end: endOffset };
}

// DRAGGABLE SETTINGS PANEL (PC ONLY)
function initDraggable(panel) {
    const settingsPanel = panel.querySelector('.settings-panel');
    if (!settingsPanel) return;
    
    // Remove existing drag listeners if any
    settingsPanel.removeEventListener('mousedown', startDrag);
    settingsPanel.addEventListener('mousedown', startDrag);
    
    function startDrag(e) {
        // Only drag from header, not from content
        const header = e.target.closest('.settings-header');
        if (!header) return;
        
        e.preventDefault();
        
        const rect = settingsPanel.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const offsetY = e.clientY - rect.top;
        
        function drag(e) {
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;
            
            // Constrain to viewport
            const maxX = window.innerWidth - rect.width;
            const maxY = window.innerHeight - rect.height;
            
            const constrainedX = Math.max(0, Math.min(x, maxX));
            const constrainedY = Math.max(0, Math.min(y, maxY));
            
            settingsPanel.style.position = 'fixed';
            settingsPanel.style.left = constrainedX + 'px';
            settingsPanel.style.top = constrainedY + 'px';
            settingsPanel.style.transform = 'none';
            settingsPanel.style.margin = '0';
        }
        
        function stopDrag() {
            document.removeEventListener('mousemove', drag);
            document.removeEventListener('mouseup', stopDrag);
            
            // Save position
            const rect = settingsPanel.getBoundingClientRect();
            state.panelPosition = { x: rect.left, y: rect.top };
            saveState();
        }
        
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', stopDrag);
    }
}

function restorePanelPosition(panel) {
    const settingsPanel = panel.querySelector('.settings-panel');
    if (!settingsPanel || state.panelPosition.x == null || state.panelPosition.y == null) return;
    
    // Check if position is still valid (within viewport)
    const maxX = window.innerWidth - settingsPanel.offsetWidth;
    const maxY = window.innerHeight - settingsPanel.offsetHeight;
    
    if (state.panelPosition.x <= maxX && state.panelPosition.y <= maxY) {
        settingsPanel.style.position = 'fixed';
        settingsPanel.style.left = state.panelPosition.x + 'px';
        settingsPanel.style.top = state.panelPosition.y + 'px';
        settingsPanel.style.transform = 'none';
        settingsPanel.style.margin = '0';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Setup jump-to-top button
    setupJumpToTop();
    
    // Load panel position from localStorage
    const savedPosition = localStorage.getItem('reader_panel_position');
    if (savedPosition) {
        try {
            const parsed = JSON.parse(savedPosition);
            // Validate that parsed position has x and y properties
            if (parsed && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                state.panelPosition = parsed;
            } else {
                // Reset to default if invalid
                state.panelPosition = { x: null, y: null };
                localStorage.removeItem('reader_panel_position');
            }
        } catch (e) {
            console.warn('Failed to parse panel position, resetting to default');
            state.panelPosition = { x: null, y: null };
            localStorage.removeItem('reader_panel_position');
        }
    }
});

function getTextOffsetInNode(targetNode, offset) {
    let totalOffset = 0;
    let walker = document.createTreeWalker(
        targetNode.parentNode || targetNode,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node === targetNode) {
            return totalOffset + offset;
        }
        totalOffset += node.textContent.length;
    }
    
    return totalOffset;
}

function createRangeFromOffsets(startOffset, endOffset) {
    const container = document.getElementById('bookContent');
    if (!container) return null;
    
    const treeWalker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    let currentOffset = 0;
    let startNode = null;
    let startNodeOffset = 0;
    let endNode = null;
    let endNodeOffset = 0;
    
    while (treeWalker.nextNode()) {
        const node = treeWalker.currentNode;
        const nodeLength = node.textContent.length;
        
        // Find start node
        if (!startNode && currentOffset + nodeLength >= startOffset) {
            startNode = node;
            startNodeOffset = startOffset - currentOffset;
        }
        
        // Find end node
        if (!endNode && currentOffset + nodeLength >= endOffset) {
            endNode = node;
            endNodeOffset = endOffset - currentOffset;
        }
        
        currentOffset += nodeLength;
        
        // If we've found both nodes, we can stop
        if (startNode && endNode) {
            break;
        }
    }
    
    if (!startNode || !endNode) return null;
    
    const range = document.createRange();
    range.setStart(startNode, startNodeOffset);
    range.setEnd(endNode, endNodeOffset);
    
    return range;
}

function loadHighlights() {
    try {
        localStorage.removeItem('reader_highlights_v2');
    } catch (_) {}
}

function saveHighlights() {}
function renderAllHighlights() {}
function clearAllHighlights() {}
function hideHighlightToolbar() {}
function showHighlightToolbar() {}
function updateHighlightToolbarSelection() {}
function renderNotesList() {}
function openHighlightEditor() {}
function hideNoteModal() {}
function saveNote() {}
function deleteActiveHighlight() {}
function loadHighlightUiState() {
    state.highlightMode = false;
    state.showUserHighlights = false;
    try {
        localStorage.removeItem(storageMap.highlightMode);
        localStorage.removeItem(storageMap.showUserHighlights);
        localStorage.removeItem(storageMap.selectedColor);
        localStorage.removeItem(storageMap.highlightToolbarPosition);
        localStorage.removeItem('reader_highlights_v2');
    } catch (_) {}
}

window.renderAllHighlights = renderAllHighlights;

// GLOBAL FUNCTIONS
function getReaderHistoryState(overrides = {}) {
    return {
        readerView: true,
        chapter: state.chapter,
        panel: null,
        menu: null,
        ...overrides
    };
}

window.getCurrentReaderChapter = function() {
    return state.chapter;
};

window.syncPanelHistoryState = function(historyState = null) {
    const panelId = historyState?.panel || null;
    document.querySelectorAll('.panel-overlay').forEach((p) => p.classList.remove('active'));
    document.body.classList.toggle('panel-open', !!panelId);

    if (!panelId) return;

    const panel = document.getElementById(panelId);
    if (!panel) return;

    panel.classList.add('active');
    if (window.matchMedia('(min-width: 768px)').matches && panelId === 'settingsPanel') {
        initDraggable(panel);
        restorePanelPosition(panel);
    } else if (panelId === 'settingsPanel') {
        resetPanelPosition(panel);
    }
};

window.togglePanel = function(id, options = {}) {
    const { updateHistory = true } = options;
    document.querySelectorAll('.panel-overlay').forEach(p => p.classList.remove('active'));
    document.body.classList.toggle('panel-open', !!id);
    if (id) {
        const p = document.getElementById(id);
        if(p) {
            p.classList.add('active');
            
            // Initialize draggable for PC only
            if (window.matchMedia('(min-width: 768px)').matches && id === 'settingsPanel') {
                initDraggable(p);
                restorePanelPosition(p);
            } else if (id === 'settingsPanel') {
                resetPanelPosition(p);
            }
        }
        
        // Update URL state
        const url = new URL(window.location);
        url.searchParams.set('chapter', state.chapter);
        if (id === 'settingsPanel') url.searchParams.set('settings', '1');
        else if (id === 'helpPanel') url.searchParams.set('help', '1');
        else if (id === 'downloadPanel') url.searchParams.set('download', '1');
        else { url.searchParams.delete('settings'); url.searchParams.delete('help'); url.searchParams.delete('download'); url.searchParams.delete('highlight'); url.searchParams.delete('notes'); }
        if (updateHistory) {
            window.history.pushState(getReaderHistoryState({ panel: id }), '', url);
        } else {
            window.history.replaceState(getReaderHistoryState({ panel: id }), '', url);
        }
    } else {
        const url = new URL(window.location);
        url.searchParams.set('chapter', state.chapter);
        url.searchParams.delete('settings');
        url.searchParams.delete('help');
        url.searchParams.delete('download');
        url.searchParams.delete('highlight');
        url.searchParams.delete('notes');
        if (updateHistory) {
            window.history.pushState(getReaderHistoryState({ panel: null }), '', url);
        } else {
            window.history.replaceState(getReaderHistoryState({ panel: null }), '', url);
        }
    }
};

window.toggleHighlightMode = function() {};
window.toggleHighlights = function() {};

window.saveHighlight = function() {
    // Old function - replaced by new offset-based system
    console.log('Old saveHighlight called - use new text selection system');
};

window.openNotesPanel = function() {};

// Old DOM-based functions removed - replaced by offset-based system

const downloadScopeKey = 'reader_download_scope';

function normalizeDownloadScope(scope) {
    return scope === 'frame' ? 'frame' : 'book';
}

function getDownloadScope() {
    const active = document.querySelector('[data-download-scope].active')?.dataset.downloadScope;
    return normalizeDownloadScope(active || localStorage.getItem(downloadScopeKey));
}

function updateDownloadScopeButtons(scope = getDownloadScope()) {
    const normalized = normalizeDownloadScope(scope);
    document.querySelectorAll('[data-download-scope]').forEach(button => {
        const isActive = button.dataset.downloadScope === normalized;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    });
}

function setDownloadScope(scope) {
    const normalized = normalizeDownloadScope(scope);
    localStorage.setItem(downloadScopeKey, normalized);
    updateDownloadScopeButtons(normalized);
}

function slugifyDownloadPart(value) {
    return String(value || '')
        .trim()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/gi, '_')
        .replace(/^_+|_+$/g, '');
}

function getChapterExportLabel(section) {
    const number = section?.querySelector('.chapter-number')?.textContent?.trim() || '';
    const title = section?.querySelector('.chapter-title')?.textContent?.trim() || '';
    return [number, title].filter(Boolean).join(' - ');
}

function getCurrentChapterSection() {
    const byState = document.querySelector(`section[data-chapter="${state.chapter}"]`);
    if (byState) return byState;
    return Array.from(document.querySelectorAll('section[data-chapter]')).find(section => {
        return window.getComputedStyle(section).display !== 'none';
    }) || document.querySelector('section[data-chapter]');
}

function getDownloadPayload() {
    const bookContent = document.getElementById('bookContent');
    if (!bookContent) return null;

    const scope = getDownloadScope();
    const baseTitle = 'Echoes_of_the_Continuist';

    if (scope === 'frame') {
        const chapter = getCurrentChapterSection();
        if (!chapter) return null;
        const label = getChapterExportLabel(chapter) || `Frame ${state.chapter}`;
        const filePart = slugifyDownloadPart(label) || `Frame_${state.chapter}`;
        return {
            scope,
            title: `${baseTitle}_${filePart}`,
            displayTitle: `Echoes of the Continuist - ${label}`,
            content: chapter
        };
    }

    return {
        scope,
        title: baseTitle,
        displayTitle: 'Echoes of the Continuist',
        content: bookContent
    };
}

function unwrapExportElement(element) {
    const parent = element.parentNode;
    if (!parent) return;
    while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
    }
    parent.removeChild(element);
}

function cloneForExport(content) {
    const clone = content.cloneNode(true);

    if (clone.id === 'bookContent') {
        const topTitle = Array.from(clone.children).find(child => child.tagName === 'H1');
        if (topTitle) topTitle.remove();
    }

    clone.querySelectorAll('.chapter-nav-wrap, script, style').forEach(element => element.remove());
    clone.querySelectorAll('.read-span, .user-highlight, .lore-link, .reading-highlight').forEach(unwrapExportElement);
    clone.querySelectorAll('section[data-chapter]').forEach(section => {
        section.removeAttribute('style');
        section.classList.add('chapter-break');
    });
    clone.querySelectorAll('[id^="frame"][id$="Content"]').forEach(host => {
        host.removeAttribute('id');
    });

    if (clone.matches?.('section[data-chapter]')) {
        clone.removeAttribute('style');
        clone.classList.add('chapter-break');
    }

    return clone;
}

function getExportSections(content) {
    const clone = cloneForExport(content);
    const sections = [];
    if (clone.matches?.('section[data-chapter]')) sections.push(clone);
    clone.querySelectorAll?.('section[data-chapter]').forEach(section => sections.push(section));
    return sections;
}

function getCleanExportHtml(content) {
    return cloneForExport(content).outerHTML || cloneForExport(content).innerHTML;
}

function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

window.downloadEbook = function(format) {
    const payload = getDownloadPayload();
    if (!payload) return;

    switch(format) {
        case 'epub':
            generateEPUB(payload);
            break;
        case 'pdf':
            generatePDF(payload);
            break;
        case 'txt':
            generateTXT(payload);
            break;
        case 'html':
            generateHTML(payload);
            break;
    }
};

function generateEPUB(payload) {
    const { title, displayTitle, content } = payload;
    const zip = new JSZip();

    zip.file('mimetype', 'application/epub+zip');

    const containerXml = `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
    <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>`;
    zip.folder('META-INF').file('container.xml', containerXml);

    const chapters = getExportSections(content);
    let manifestItems = '';
    let spineItems = '';
    let navPoints = '';

    chapters.forEach((ch, idx) => {
        const chId = `chapter${idx + 1}`;
        const label = getChapterExportLabel(ch) || `Chapter ${idx + 1}`;
        manifestItems += `<item id="${chId}" href="${chId}.xhtml" media-type="application/xhtml+xml"/>\n`;
        spineItems += `<itemref idref="${chId}"/>\n`;
        navPoints += `<navPoint id="navPoint-${idx + 1}" playOrder="${idx + 1}"><navLabel><text>${escapeHtml(label)}</text></navLabel><content src="${chId}.xhtml"/></navPoint>\n`;
    });

    const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid" version="3.0">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:identifier id="bookid">${escapeHtml(title)}</dc:identifier>
        <dc:title>${escapeHtml(displayTitle)}</dc:title>
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

    const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
    <head><meta name="dtb:uid" content="${escapeHtml(title)}"/></head>
    <docTitle><text>${escapeHtml(displayTitle)}</text></docTitle>
    <navMap>${navPoints}</navMap>
</ncx>`;

    zip.folder('OEBPS').file('content.opf', contentOpf);
    zip.folder('OEBPS').file('toc.ncx', tocNcx);

    const css = `body {
        font-family: Georgia, serif;
        line-height: 1.6;
        color: #333;
        max-width: 700px;
        margin: 0 auto;
        padding: 20px;
    }
    h1 { text-align: center; margin: 2em 0; }
    p { text-indent: 2em; margin: 1em 0; }
    .chapter-title-wrap { text-align: center; margin: 3em 0 1em 0; }
    .chapter-number { display: block; font-size: 0.85em; letter-spacing: 0.08em; }
    .chapter-title { margin: 0.25em 0 1em; }`;

    zip.folder('OEBPS').file('styles.css', css);

    chapters.forEach((ch, idx) => {
        const chContent = cloneForExport(ch).innerHTML;
        const label = getChapterExportLabel(ch) || `Chapter ${idx + 1}`;

        const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>${escapeHtml(label)}</title>
    <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
    ${chContent}
</body>
</html>`;

        zip.folder('OEBPS').file(`chapter${idx + 1}.xhtml`, xhtml);
    });

    zip.generateAsync({type: 'blob'}).then(function(blob) {
        downloadBlob(`${title}.epub`, blob);
    });
}

function generatePDF(payload) {
    const { title, displayTitle, content } = payload;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const cleanContent = getCleanExportHtml(content);

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${escapeHtml(displayTitle)}</title>
            <style>
                body { font-family: Georgia, serif; line-height: 1.6; color: #000; max-width: 700px; margin: 0 auto; padding: 20px; }
                h1 { text-align: center; margin: 2em 0; }
                p { text-indent: 2em; margin: 1em 0; }
                .chapter-title-wrap { text-align: center; margin: 3em 0 1em 0; }
                .chapter-number { display: block; font-size: 0.85em; letter-spacing: 0.08em; }
                .chapter-break { page-break-before: always; margin-top: 50px; }
                .chapter-break:first-of-type { page-break-before: auto; }
                @media print { body { margin: 0; } }
            </style>
        </head>
        <body>
            <h1>${escapeHtml(displayTitle)}</h1>
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

function generateTXT(payload) {
    const { title, displayTitle, content } = payload;
    const lines = [displayTitle];
    const chapters = getExportSections(content);

    chapters.forEach((chapter, chapterIndex) => {
        const label = getChapterExportLabel(chapter);
        if (label) {
            if (chapterIndex > 0 || lines.length) lines.push('');
            lines.push(label);
            lines.push('');
        }

        chapter.querySelectorAll('p').forEach(paragraph => {
            const text = paragraph.textContent.replace(/\s+/g, ' ').trim();
            if (text) {
                lines.push(text);
                lines.push('');
            }
        });
    });

    const text = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
    downloadBlob(`${title}.txt`, new Blob([text], { type: 'text/plain;charset=utf-8' }));
}

function generateHTML(payload) {
    const { title, displayTitle, content } = payload;
    const cleanContent = getCleanExportHtml(content);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(displayTitle)}</title>
    <style>
        body {
            font-family: Georgia, serif;
            line-height: 1.6;
            color: #333;
            max-width: 700px;
            margin: 0 auto;
            padding: 20px;
            background: #fff;
        }
        h1 { text-align: center; margin: 2em 0; }
        p { text-indent: 2em; margin: 1em 0; }
        .chapter-title-wrap { text-align: center; margin: 3em 0 1em 0; }
        .chapter-number { display: block; font-size: 0.85em; letter-spacing: 0.08em; }
        .chapter-break { margin-top: 50px; }
    </style>
</head>
<body>
    <h1>${escapeHtml(displayTitle)}</h1>
    ${cleanContent}
</body>
</html>`;

    downloadBlob(`${title}.html`, new Blob([html], { type: 'text/html;charset=utf-8' }));
}
    window.saveAndReturn = function() {
    // Save current scroll position and chapter
    const currentScroll = window.scrollY;
    const currentChapter = state.chapter;
    
    console.log(`RETURN button: Saving chapter ${currentChapter}, scroll ${currentScroll}px`);
    
    // Ensure scroll position is saved
    localStorage.setItem(`reader_scroll_ch${currentChapter}`, currentScroll);
    localStorage.setItem('reader_chapter', String(currentChapter));
    
    // Save return context for when user comes back
    localStorage.setItem('reader_return_context', JSON.stringify({
        chapter: currentChapter,
        scroll: currentScroll,
        timestamp: Date.now()
    }));
    
    console.log('RETURN button: Navigating to main site');
    // Navigate to main site (no chapter parameter - let return context handle it)
    window.location.href = './';
};

window.masterResetAll = function() {
    if(confirm("Reset ALL settings to defaults? This will restore the black theme and reset everything as if the site was new.")) {
        // Save current scroll position before clearing
        const currentScroll = window.scrollY;
        const currentChapter = state.chapter;
        
        // Preserve TOS acceptance before clearing
        const tosKeys = ['latticeveil_tos_accepted', 'latticeveil_download_tos_accepted'];
        const preservedData = {};

        // Preserve TOS acceptance
        tosKeys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value !== null) {
                preservedData[key] = value;
            }
        });

        // Clear all localStorage
        localStorage.clear();
        
        // Restore TOS acceptance
        Object.entries(preservedData).forEach(([key, value]) => {
            localStorage.setItem(key, value);
        });
        
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
            showUserHighlights: false,
            highlightMode: false,
            zoomLocked: false,
            selectedColor: 'rgba(242, 193, 78, 0.4)',
            wakeLock: false,
            readAlongEnabled: true,
            readAlongActive: false,
            ttsPaused: false,
            ttsSpanId: '',
            voiceName: '',
            comments: {}
        });
        
        // Restore scroll position for current chapter
        localStorage.setItem(`reader_scroll_ch${currentChapter}`, currentScroll);
        
        // Apply settings and close panel
        applySettings();
        window.togglePanel(null);
        
        // Reload page to ensure clean state (clear hash to prevent scroll= parameters)
        setTimeout(() => {
            // Clear the hash before reload to prevent browser from adding scroll position
            window.history.replaceState({}, '', window.location.pathname + window.location.search);
            window.location.reload();
        }, 100);
    }
};

window.switchChapter = function(num, autoScroll = false, options = {}) {
    const { updateHistory = true } = options;
    const previousChapter = state.chapter;
    const outgoingScroll = window.scrollY;

    if (previousChapter) {
        localStorage.setItem(`reader_scroll_ch${previousChapter}`, String(outgoingScroll));
        console.log(`Switching away: saved scroll for chapter ${previousChapter}: ${outgoingScroll}px`);
    }

    if (typeof stopReading === 'function') {
        stopReading({ preserveCheckpoint: true });
    } else if (window.speechSynthesis) {
        window.ttsCancelledByUser = true;
        window.speechSynthesis.cancel();
    }

    state.chapter = num;
    loadChapterTtsState(num);
    localStorage.setItem('reader_chapter', String(num));
    markReaderChapterSeen(num);
    try {
        const url = new URL(window.location);
        url.searchParams.set('chapter', num);
        url.searchParams.delete('settings');
        url.searchParams.delete('help');
        url.searchParams.delete('download');
        url.searchParams.delete('highlight');
        url.searchParams.delete('notes');
        if (updateHistory) {
            window.history.pushState(getReaderHistoryState({ chapter: num, panel: null }), '', url);
        } else {
            window.history.replaceState(getReaderHistoryState({ chapter: num, panel: null }), '', url);
        }
    } catch(e) {}
    
    document.querySelectorAll('section[data-chapter]').forEach(s => s.style.display = 'none');
    const ch = document.querySelector(`section[data-chapter="${num}"]`);
    if (ch) {
        ch.style.display = 'block';
        const rawSavedScroll = localStorage.getItem(`reader_scroll_ch${num}`);
        const savedScroll = rawSavedScroll !== null ? parseInt(rawSavedScroll, 10) || 0 : null;
        const scrollToChapterStart = () => {
            const chapterHeader = ch.querySelector('.chapter-title-wrap') || ch;
            const headerOffset = document.querySelector('.reader-header')?.offsetHeight || 0;
            const top = Math.max(0, window.scrollY + chapterHeader.getBoundingClientRect().top - headerOffset - 24);
            window.scrollTo(0, top);
            console.log(`Scrolled to chapter ${num} start: ${top}px`);
        };

        setTimeout(() => {
            if (savedScroll !== null) {
                console.log(`Restoring scroll for chapter ${num}: ${savedScroll}px`);
                window.scrollTo(0, savedScroll);
            } else {
                scrollToChapterStart();
            }
            console.log(`Current scroll after chapter switch: ${window.scrollY}px`);
        }, 100);
    }
    
    // Clear existing highlights and render new chapter highlights
    clearAllHighlights();
    renderAllHighlights();

    const chapterSelect = document.getElementById('chapterSelect');
    if (chapterSelect) {
        chapterSelect.value = String(num);
    }

    if (typeof window.updateChapterLabel === 'function') {
        window.updateChapterLabel(num);
    }

    try {
        window.dispatchEvent(new CustomEvent('chapterchange', {
            detail: { chapter: num }
        }));
    } catch (e) {
        // Ignore event dispatch issues on older browser contexts.
    }
    
    applySettings();
};

window.switchChapterFromHistory = function(num) {
    const targetChapter = Math.max(1, parseInt(num, 10) || 1);
    if (targetChapter === state.chapter) {
        window.syncPanelHistoryState(window.history.state || null);
        return;
    }
    window.switchChapter(targetChapter, true, { updateHistory: false });
    window.syncPanelHistoryState(window.history.state || null);
};

function resetPanelPosition(panel) {
    const settingsPanel = panel?.querySelector('.settings-panel');
    if (!settingsPanel) return;
    settingsPanel.style.position = '';
    settingsPanel.style.left = '';
    settingsPanel.style.top = '';
    settingsPanel.style.transform = '';
    settingsPanel.style.margin = '';
}

window.scrollToChapterStart = function(chapterNum = state.chapter) {
    const ch = document.querySelector(`section[data-chapter="${chapterNum}"]`);
    if (!ch) return;
    const chapterHeader = ch.querySelector('.chapter-title-wrap') || ch;
    const headerOffset = document.querySelector('.reader-header')?.offsetHeight || 0;
    const top = Math.max(0, window.scrollY + chapterHeader.getBoundingClientRect().top - headerOffset - 24);
    window.scrollTo({ top, behavior: 'smooth' });
};

document.addEventListener('DOMContentLoaded', () => {
    if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
    }

    // Clear any hash immediately to prevent scroll parameters
    if (window.location.hash && window.location.hash.includes('scroll=')) {
        window.history.replaceState({}, '', window.location.pathname + window.location.search);
    }
    
    // Monitor and remove scroll parameters continuously
    const clearScrollHash = () => {
        if (window.location.hash && window.location.hash.includes('scroll=')) {
            window.history.replaceState({}, '', window.location.pathname + window.location.search);
        }
    };
    
    // Clear hash on popstate (browser back/forward)
    window.addEventListener('popstate', clearScrollHash);
    
    // 1. Listeners first
    setupEventListeners();
    
    // 2. Load state
    loadPersistentState();
    
    // 3. Prep text
    prepareTextForReading();
    
    // 4. Initial apply
    applySettings();
    setupLoreLinks(document.getElementById('bookContent'));
    
    // 5. Load highlights
    loadHighlightUiState();
    loadHighlights();
    
    // 6. URL Sync
    const urlParams = new URLSearchParams(window.location.search);
    const chParam = urlParams.get('chapter');
    const setParam = urlParams.get('settings');
    const helpParam = urlParams.get('help');
    const downloadParam = urlParams.get('download');
    const notesParam = urlParams.get('notes');
    
    if (chParam) {
        // Check if user is returning from main site with chapter parameter
        const returnContext = localStorage.getItem('reader_return_context');
        console.log('Page load: Checking return context with chapter param:', returnContext);
        if (returnContext) {
            const context = JSON.parse(returnContext);
            console.log('Page load: Found return context with chapter param:', context);
            const requestedChapter = parseInt(chParam, 10);
            // Only restore if it's recent (within 30 minutes)
            if (Date.now() - context.timestamp < 30 * 60 * 1000 && context.chapter === requestedChapter) {
                console.log(`Page load: Prioritizing return context - restoring chapter ${context.chapter} with scroll ${context.scroll}px`);
                switchChapter(context.chapter, true, { updateHistory: false });
                // Clear the return context after using it
                localStorage.removeItem('reader_return_context');
            } else {
                console.log('Page load: Chapter parameter takes priority over stale or mismatched return context');
                switchChapter(requestedChapter, false, { updateHistory: false });
                localStorage.removeItem('reader_return_context');
            }
        } else {
            console.log('Page load: No return context, using chapter parameter');
            switchChapter(parseInt(chParam), false, { updateHistory: false });
        }
    }
    else {
        // Check if user is returning from main site
        const returnContext = localStorage.getItem('reader_return_context');
        console.log('Page load: Checking return context:', returnContext);
        if (returnContext) {
            const context = JSON.parse(returnContext);
            console.log('Page load: Found return context:', context);
            // Only restore if it's recent (within 30 minutes)
            if (Date.now() - context.timestamp < 30 * 60 * 1000) {
                console.log(`Page load: Restoring chapter ${context.chapter} with scroll ${context.scroll}px`);
                switchChapter(context.chapter, true, { updateHistory: false });
                // Clear the return context after using it
                localStorage.removeItem('reader_return_context');
            } else {
                console.log('Page load: Return context too old, starting at chapter 1');
                switchChapter(1, true, { updateHistory: false });
                localStorage.removeItem('reader_return_context');
            }
        } else {
            console.log('Page load: No return context, starting at chapter 1');
            switchChapter(1, true, { updateHistory: false });
        }
    }

    try {
        const initialUrl = new URL(window.location);
        initialUrl.searchParams.delete('settings');
        initialUrl.searchParams.delete('help');
        initialUrl.searchParams.delete('download');
        initialUrl.searchParams.delete('highlight');
        initialUrl.searchParams.delete('notes');
        const initialPanel = setParam ? 'settingsPanel' : helpParam ? 'helpPanel' : downloadParam ? 'downloadPanel' : null;
        window.history.replaceState(getReaderHistoryState({ panel: initialPanel }), '', initialUrl);
        if (initialPanel) {
            window.togglePanel(initialPanel, { updateHistory: false });
        }
    } catch (_) {}

    if (notesParam) window.openNotesPanel();

    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = () => ensureVoicesLoaded();
        ensureVoicesLoaded();
    }

    updateTtsSupportUi();
});

function splitReadingSentences(html) {
    const protectedPeriods = new Map([
        ['Dr.', 'Dr§'],
        ['Mr.', 'Mr§'],
        ['Mrs.', 'Mrs§'],
        ['Ms.', 'Ms§'],
        ['Prof.', 'Prof§'],
        ['Sr.', 'Sr§'],
        ['Jr.', 'Jr§'],
        ['St.', 'St§']
    ]);

    let protectedHtml = html;
    protectedPeriods.forEach((token, abbreviation) => {
        protectedHtml = protectedHtml.replaceAll(abbreviation, token);
    });

    const sentences = protectedHtml.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [protectedHtml];

    return sentences.map((sentence) => {
        let restored = sentence;
        protectedPeriods.forEach((token, abbreviation) => {
            restored = restored.replaceAll(token, abbreviation);
        });
        return restored;
    });
}

function prepareTextForReading(scope = document) {
    const root = scope instanceof Element || scope instanceof Document ? scope : document;
    const paragraphs = root.querySelectorAll('#bookContent p, section[data-chapter] p, p');

    paragraphs.forEach((p) => {
        if (p.dataset.ttsPrepared === 'true') {
            return;
        }

        const chapterSection = p.closest('section[data-chapter]');
        const chapterKey = chapterSection?.dataset.chapter || 'global';
        const paragraphIndex = Array.from(chapterSection ? chapterSection.querySelectorAll('p') : document.querySelectorAll('#bookContent p')).indexOf(p);
        let html = p.innerHTML;
        const sentences = splitReadingSentences(html);

        p.innerHTML = sentences.map((s, sIdx) =>
            `<span class="read-span" id="s-${chapterKey}-${paragraphIndex}-${sIdx}">${s.trim()}</span>`
        ).join(' ');
        p.dataset.ttsPrepared = 'true';
    });
}

window.prepareTextForReading = prepareTextForReading;

function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function autoLinkLore(root = document) {
    const container = root instanceof Element || root instanceof Document ? root : document;
    const host = container.querySelector?.('#bookContent') || container;
    if (!host) return;

    const skippedSelector = [
        'a', 'button', 'script', 'style', 'textarea', 'option',
        '.lore-link', '.chapter-number', '.chapter-title', '.chapter-nav-wrap',
        '.chapter-item', '.chapter-select-btn', '.reader-title',
        '#lorePanel', '#settingsPanel', '#helpPanel', '#downloadPanel'
    ].join(', ');

    const keys = Object.keys(loreData)
        .filter(key => key && key.length > 1)
        .sort((a, b) => {
            const wordDelta = b.split(/\s+/).length - a.split(/\s+/).length;
            if (wordDelta !== 0) return wordDelta;
            return b.length - a.length;
        });
    const lookup = new Map(keys.map(key => [key.toLowerCase(), key]));

    if (!keys.length) return;

    const pattern = new RegExp(`(^|[^A-Za-z0-9_])(${keys.map(escapeRegex).join('|')})(?=[^A-Za-z0-9_]|$)`, 'gi');
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (parent.closest(skippedSelector)) return NodeFilter.FILTER_REJECT;
            const text = node.textContent || '';
            pattern.lastIndex = 0;
            if (!text || !pattern.test(text)) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        }
    });

    const textNodes = [];
    let currentNode;
    while ((currentNode = walker.nextNode())) {
        textNodes.push(currentNode);
    }

    textNodes.forEach((node) => {
        const text = node.textContent || '';
        pattern.lastIndex = 0;
        let match;
        let lastIndex = 0;
        const fragment = document.createDocumentFragment();

        while ((match = pattern.exec(text)) !== null) {
            const prefix = match[1] || '';
            const matchedText = match[2];
            let key = lookup.get(String(match[2] || '').toLowerCase()) || match[2];
            const chapterSection = node.parentElement?.closest?.('section[data-chapter]');
            if (chapterSection?.dataset.chapter === '10' && key === 'Rook') {
                key = 'Continuum Rook';
            }
            const start = match.index;

            if (start > lastIndex) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex, start)));
            }
            if (prefix) {
                fragment.appendChild(document.createTextNode(prefix));
            }

            const span = document.createElement('span');
            span.className = 'lore-link';
            span.dataset.lore = key;
            span.textContent = matchedText;
            fragment.appendChild(span);
            lastIndex = start + prefix.length + matchedText.length;
        }

        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }

        node.parentNode.replaceChild(fragment, node);
    });
}

function applySettings() {
    const body = document.body;
    body.className = `${state.theme} ${state.font} ${state.highContrast ? 'high-contrast' : ''} ${state.focusMode ? 'focus-mode' : ''} ${state.showLore ? '' : 'hide-lore-tags'}`;
    
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
    setCheck('toggleReadAlong', state.readAlongEnabled);
    
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === state.theme));
    document.querySelectorAll('.btn-toggle[data-align]').forEach(b => b.classList.toggle('active', b.dataset.align === state.textAlign));
    document.querySelectorAll('.btn-toggle[data-font]').forEach(b => b.classList.toggle('active', b.dataset.font === state.font));
    
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

    const ttsControls = ['ttsBtn', 'ttsPrevBtn', 'ttsRestartBtn'];
    ttsControls.forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.disabled = !state.readAlongEnabled;
            el.hidden = !state.readAlongEnabled;
            el.setAttribute('aria-hidden', String(!state.readAlongEnabled));
        }
    });
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
    document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn, .tab-content-area').forEach(el => el.classList.remove('active'));
            btn.classList.add('active');
            const content = document.getElementById(btn.dataset.tab);
            if (content) content.classList.add('active');
        };
    });

    document.querySelectorAll('.help-tab-btn').forEach((btn) => {
        btn.onclick = () => {
            document.querySelectorAll('.help-tab-btn, .help-tab-content').forEach((el) => el.classList.remove('active'));
            btn.classList.add('active');
            const content = document.getElementById(btn.dataset.helpTab);
            if (content) content.classList.add('active');
        };
    });

    document.querySelectorAll('.btn-toggle[data-font]').forEach(b => { b.onclick = () => { state.font = b.dataset.font; saveState(); applySettings(); }; });
    document.querySelectorAll('.btn-toggle[data-align]').forEach(b => { b.onclick = () => { state.textAlign = b.dataset.align; saveState(); applySettings(); }; });
    document.querySelectorAll('.theme-btn[data-theme]').forEach(b => { b.onclick = () => { state.theme = b.dataset.theme; saveState(); applySettings(); }; });

    click('settingsBtn', () => window.togglePanel('settingsPanel'));
    click('helpBtn', () => window.togglePanel('helpPanel'));
    click('downloadBtn', () => window.togglePanel('downloadPanel'));
    document.querySelectorAll('[data-download-scope]').forEach(button => {
        button.onclick = () => setDownloadScope(button.dataset.downloadScope);
    });
    updateDownloadScopeButtons();
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
    click('ttsPrevBtn', previousLine);
    click('ttsRestartBtn', nextLine);
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

    const toggle = (id, key) => { 
        const el = document.getElementById(id); 
        if(el) el.onchange = (e) => { 
            state[key] = e.target.checked; 
            if (key === 'showLore' && !state[key]) {
                const lorePanel = document.getElementById('lorePanel');
                if (lorePanel?.classList.contains('active')) {
                    window.togglePanel(null);
                }
            }
            if (key === 'readAlongEnabled' && !state[key]) {
                stopReading();
            }
            saveState(); applySettings(); 
        }; 
    };
    toggle('contrastToggle', 'highContrast');
    toggle('focusModeToggle', 'focusMode');
    toggle('wakeLockToggle', 'wakeLock');
    toggle('toggleLore', 'showLore');
    toggle('toggleReadAlong', 'readAlongEnabled');
    
    const wake = document.getElementById('wakeLockToggle');
    if(wake) wake.onchange = toggleWakeLock;

    window.addEventListener('scroll', () => {
        state.scroll = window.scrollY;
        localStorage.setItem(`reader_scroll_ch${state.chapter}`, state.scroll);
        console.log(`Saved scroll for chapter ${state.chapter}: ${state.scroll}px`);
        const progress = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        const bar = document.getElementById('progressBar'); if(bar) bar.style.width = progress + '%';
        
        // Clear any scroll hash parameters that might appear
        if (window.location.hash && window.location.hash.includes('scroll=')) {
            window.history.replaceState({}, '', window.location.pathname + window.location.search);
        }
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

// Old manual highlight functions removed - replaced by new offset-based system

function setupLoreLinks(scope = document) {
    autoLinkLore(scope);
    const root = scope instanceof Element || scope instanceof Document ? scope : document;
    root.querySelectorAll('.lore-link').forEach(link => {
        link.onclick = (e) => {
            if (!state.showLore) return;
            e.preventDefault();
            const key = link.dataset.lore;
            if (loreData[key]) showLore(key, loreData[key]);
        };
    });
}

window.setupLoreLinks = setupLoreLinks;

function showLore(title, data) {
    const t = document.getElementById('loreTitle'); if(t) t.innerText = title;
    const r = document.getElementById('loreRole'); if(r) r.innerText = data.role;
    const d = document.getElementById('loreDesc'); if(d) d.innerText = data.desc;
    const visuals = document.getElementById('loreVisuals');
    const img = document.getElementById('loreImg');
    const imgAlt = document.getElementById('loreImgAlt');
    const imgPlaceholder = document.getElementById('loreImgPlaceholder');
    const imgAltPlaceholder = document.getElementById('loreImgAltPlaceholder');
    const isCharacter = String(data.role || '').toLowerCase() === 'character';

    if (visuals) visuals.style.display = (isCharacter || data.img || data.imgAlt) ? 'grid' : 'none';

    if (img) {
        if (data.img) {
            img.src = data.img;
            img.style.display = 'block';
            if (imgPlaceholder) imgPlaceholder.style.display = 'none';
        } else {
            img.removeAttribute('src');
            img.style.display = 'none';
            if (imgPlaceholder) imgPlaceholder.style.display = isCharacter ? 'flex' : 'none';
        }
    }

    if (imgAlt) {
        if (data.imgAlt) {
            imgAlt.src = data.imgAlt;
            imgAlt.style.display = 'block';
            if (imgAltPlaceholder) imgAltPlaceholder.style.display = 'none';
        } else {
            imgAlt.removeAttribute('src');
            imgAlt.style.display = 'none';
            if (imgAltPlaceholder) imgAltPlaceholder.style.display = isCharacter ? 'flex' : 'none';
        }
    }

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

function normalizeTtsPronunciation(text) {
    return String(text || '')
        .replace(/\bProject\s+Chimera\b/gi, 'Project Kaimaira')
        .replace(/\bChimera\b/gi, 'Kaimaira');
}

function previewVoice() {
    if(!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    // Force refresh voices list
    const voices = window.speechSynthesis.getVoices();
    console.log('Available voices for preview:', voices.map(v => `${v.name} (${v.lang})`));
    
    const voice = getSelectedVoice();
    const utter = new SpeechSynthesisUtterance(normalizeTtsPronunciation("Continuist system check."));
    
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

function updateTtsSupportUi() {
    const supported = !!window.speechSynthesis;
    const note = document.getElementById('ttsSupportNote');
    const ttsBtn = document.getElementById('ttsBtn');
    const prevBtn = document.getElementById('ttsPrevBtn');
    const restartBtn = document.getElementById('ttsRestartBtn');
    const previewBtn = document.getElementById('previewVoiceBtn');
    const voiceSelect = document.getElementById('voiceSelect');

    [ttsBtn, prevBtn, restartBtn, previewBtn, voiceSelect].forEach((el) => {
        if (el) el.disabled = !supported;
    });

    if (note) {
        note.textContent = supported
            ? 'Speech options come from your browser or device. On some mobile browsers, voices appear after your first tap.'
            : 'Text-to-speech is not available in this browser or device context.';
    }
}

function toggleReading() {
    if (!window.speechSynthesis || !state.readAlongEnabled) return;

    if (state.ttsPaused) {
        resumeReading();
    } else if (state.readAlongActive) {
        pauseReading();
    } else {
        startReadAlong();
    }
}

function speakQueueFromIndex(index) {
    if (!state.readAlongEnabled) return;
    if (!Array.isArray(window.ttsQueue) || !window.ttsQueue.length) {
        startReadAlong();
        return;
    }

    window.ttsCancelledByUser = true;
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }

    state.readAlongActive = true;
    state.ttsPaused = false;
    window.ttsIndex = Math.max(0, Math.min(index, window.ttsQueue.length - 1));
    const btn = document.getElementById('ttsBtn'); if(btn) btn.innerHTML = '<i class="fas fa-pause"></i>';
    saveState();

    setTimeout(() => {
        window.ttsCancelledByUser = false;
        speakNext();
    }, 30);
}

function previousLine() {
    if (!state.readAlongEnabled) return;
    if (state.ttsPaused || state.readAlongActive) {
        const nextIndex = typeof window.ttsIndex === 'number'
            ? Math.max(0, window.ttsIndex - 1)
            : 0;
        speakQueueFromIndex(nextIndex);
        return;
    }

    startReadAlong();
}

function nextLine() {
    if (!state.readAlongEnabled) return;
    if (state.ttsPaused || state.readAlongActive) {
        const queueLength = Array.isArray(window.ttsQueue) ? window.ttsQueue.length : 0;
        const nextIndex = typeof window.ttsIndex === 'number'
            ? Math.min(Math.max(queueLength - 1, 0), window.ttsIndex + 1)
            : 0;
        speakQueueFromIndex(nextIndex);
        return;
    }

    startReadAlong();
}

function normalizeChapterNumberForSpeech(chapterNumber) {
    const match = String(chapterNumber || '').match(/FRAME\s*0*(\d+)/i);
    if (!match) return String(chapterNumber || '').trim();
    return `Frame ${parseInt(match[1], 10)}`;
}

function buildReadQueue(chapter) {
    const queue = [];
    if (!chapter) return queue;

    const chapterNumberRaw = chapter.querySelector('.chapter-number')?.textContent?.trim() || '';
    const chapterNumber = normalizeChapterNumberForSpeech(chapterNumberRaw);
    const chapterTitle = chapter.querySelector('.chapter-title')?.textContent?.trim() || '';
    const introText = [chapterNumber, chapterTitle].filter(Boolean).join('. ');

    if (introText) {
        queue.push({
            id: `tts-intro-ch${chapter.dataset.chapter}`,
            text: introText,
            target: chapter.querySelector('.chapter-title-wrap') || chapter
        });
    }

    chapter.querySelectorAll('.read-span').forEach((span) => {
        queue.push({
            id: span.id,
            text: span.textContent.trim(),
            target: span
        });
    });

    return queue.filter(item => item.text);
}

function startReadAlong() {
    if (!window.speechSynthesis || !state.readAlongEnabled) return;
    loadChapterTtsState(state.chapter);
    state.readAlongActive = true;
    state.ttsPaused = false;
    saveChapterTtsState();
    const btn = document.getElementById('ttsBtn'); if(btn) btn.innerHTML = '<i class="fas fa-pause"></i>';
    
    const chapter = document.querySelector(`section[data-chapter="${state.chapter}"]`);
    if (!chapter) return;

    prepareTextForReading(chapter);
    const allElements = buildReadQueue(chapter);
    if (!allElements.length) return;
    
    // Find starting position
    let startIndex = 0;
    if (state.ttsSpanId) {
        const idx = allElements.findIndex(el => el.id === state.ttsSpanId);
        if (idx >= 0) startIndex = idx;
    } else {
        const firstVisible = allElements.find(el => {
            const elem = el.target;
            return elem && elem.getBoundingClientRect().top > 100;
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
    const text = (element?.text || element?.target?.textContent || '').trim();
    
    if (!text) {
        window.ttsIndex++;
        speakNext();
        return;
    }
    
    // Clear previous highlights
    document.querySelectorAll('.reading-highlight').forEach(el => el.classList.remove('reading-highlight'));
    
    const targetElement = element.target || document.getElementById(element.id);
    
    if (targetElement) {
        targetElement.classList.add('reading-highlight');
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        state.ttsSpanId = element.id || '';
        saveChapterTtsState();
        saveState();
    }
    
    // Create fresh utterance for each text
    const utter = new SpeechSynthesisUtterance(normalizeTtsPronunciation(text));
    const voice = getSelectedVoice();
    window.ttsCancelledByUser = false;
    
    if (voice) {
        utter.voice = voice;
        console.log('Speaking with voice:', voice.name, 'Lang:', voice.lang);
    } else {
        console.warn('No voice available, using default');
    }
    
    utter.rate = state.tempo / 200;
    utter.lang = voice?.lang || 'en-US';
    
    utter.onstart = () => console.log('Started speaking with voice:', utter.voice?.name);
    utter.onend = () => {
        if (window.ttsCancelledByUser) {
            window.ttsCancelledByUser = false;
            return;
        }
        console.log('Finished speaking, moving to next');
        window.ttsIndex++;
        speakNext();
    };
    utter.onerror = (e) => {
        if (window.ttsCancelledByUser) {
            window.ttsCancelledByUser = false;
            return;
        }
        console.error('Speech error:', e);
        window.ttsIndex++;
        speakNext();
    };
    
    window.speechSynthesis.speak(utter);
}

function pauseReading() {
    if (window.speechSynthesis) {
        window.ttsCancelledByUser = true;
        window.speechSynthesis.cancel();
        state.ttsPaused = true;
        state.readAlongActive = false;
        const btn = document.getElementById('ttsBtn'); if(btn) btn.innerHTML = '<i class="fas fa-play"></i>';
        saveChapterTtsState();
        saveState();
    }
}

function resumeReading() {
    startReadAlong();
}

function stopReading(options = {}) {
    const { preserveCheckpoint = false } = options;
    if(window.speechSynthesis) {
        window.ttsCancelledByUser = true;
        window.speechSynthesis.cancel();
    }
    state.readAlongActive = false;
    state.ttsPaused = false;
    if (!preserveCheckpoint) {
        state.ttsSpanId = '';
    }
    const btn = document.getElementById('ttsBtn'); if(btn) btn.innerHTML = '<i class="fas fa-play"></i>';
    document.querySelectorAll('.reading-highlight').forEach(el => el.classList.remove('reading-highlight'));
    window.ttsQueue = [];
    window.ttsIndex = 0;
    saveChapterTtsState();
    saveState();
}

function restartFromTop() {
    state.ttsSpanId = '';
    state.ttsPaused = false;
    saveChapterTtsState();
    
    // Stop current reading
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    
    state.readAlongActive = false;
    setTimeout(() => startReadAlong(), 100);
}

window.addEventListener('resize', () => {
    if (!window.matchMedia('(min-width: 768px)').matches) {
        const activeSettings = document.getElementById('settingsPanel');
        if (activeSettings?.classList.contains('active')) {
            resetPanelPosition(activeSettings);
        }
    }
});

async function toggleWakeLock(e) {
    state.wakeLock = e.target.checked;
    if (state.wakeLock && navigator.wakeLock) { try { wakeLockObj = await navigator.wakeLock.request('screen'); } catch (err) {} }
    else if (wakeLockObj) { await wakeLockObj.release(); wakeLockObj = null; }
    saveState();
}

function saveState() {
    Object.keys(storageMap).forEach(key => {
        const value = objectStateKeys.has(key) ? JSON.stringify(state[key]) : state[key];
        localStorage.setItem(storageMap[key], value);
    });
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

function setupJumpToTop() {
    // Create jump-to-top button
    const jumpToTopBtn = document.createElement('a');
    jumpToTopBtn.href = '#top';
    jumpToTopBtn.className = 'jump-to-top';
    jumpToTopBtn.innerHTML = '<i class="fas fa-chevron-up" aria-hidden="true"></i><span>FRAME START</span>';
    jumpToTopBtn.setAttribute('aria-label', 'Jump to start of current frame');
    
    // Add to page
    document.body.appendChild(jumpToTopBtn);
    
    // Show/hide button based on scroll position
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            if (window.scrollY > 300) {
                jumpToTopBtn.classList.add('visible');
            } else {
                jumpToTopBtn.classList.remove('visible');
            }
        }, 16); // Debounce for performance
    });
    
    // Smooth scroll behavior
    jumpToTopBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof window.scrollToChapterStart === 'function') {
            window.scrollToChapterStart(state.chapter);
        } else {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    });
    
    // Initial check
    if (window.scrollY > 300) {
        jumpToTopBtn.classList.add('visible');
    }
}

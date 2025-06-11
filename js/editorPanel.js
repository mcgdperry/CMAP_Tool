// editorPanel.js — updated to fix unsaved rect persistence, tab mode bleed-through, and rect prepopulation from images

window.editorPanel = {
    currentTileId: null,
    currentRectId: null,
    currentMode: 'main',
    pendingRects: [],
    deletedRects: [],

    init() {
        document.getElementById('show-global-rects')?.addEventListener('change', (e) => {
            const globalMode = e.target.checked;
            window.editorPanel.setGlobalMode(globalMode);
        });

        const closeBtn = document.getElementById('closeEditor');
        const saveBtn = document.getElementById('saveEditor');

        ['mod', 'ref', 'tab', 'link', 'alt', 'pres', 'pdf', 'vid'].forEach(type => {
            document.getElementById(`add-${type}-btn`)?.addEventListener('click', () => {
                this.addEditorRect(type);
            });
        });

        closeBtn.addEventListener('click', () => {
            // Reset to main mode and hide editor
            this.setGlobalMode(false);
            document.querySelector('.image-editor').classList.add('hidden');
            this.pendingRects = []; // Clear unsaved rectangles
            this.deletedRects = []; // Clear unsaved deletions
            // --- Only clear unsaved (not saved) global rects and remove from DOM if in global mode ---
            if (this.currentMode === 'global' || document.getElementById('show-global-rects')?.checked) {
                this.unsavedGlobalRects = {};
                // Remove only unsaved global rects from DOM, not the saved ones
                const globalRects = document.getElementById('globalRectsContainer');
                if (globalRects) {
                    // Remove only rects that are not in projectData.tiles.global.rects
                    const saved = window.projectData.tiles.global?.rects || {};
                    Array.from(globalRects.querySelectorAll('.rect')).forEach(rect => {
                        const sel = rect.dataset.selector;
                        if (!saved[sel]) rect.remove();
                    });
                }
                // Reset counters for global rects
                this.globalTypeCounters = {};
                this.globalOtherCounters = {};
            }
        });

        saveBtn.addEventListener('click', async () => {
            const tileId = this.currentTileId;
            const mode = this.currentMode;

            if (!this.processRects(tileId, mode)) return;

            await this.handlePendingRects(tileId);
            await this.handleDeletedRects(tileId);

            alert('✔ Rectangles saved to projectData!');
            document.querySelector('.image-editor').classList.add('hidden');
            this.setGlobalMode(false);

            if (mode === 'global') {
                this.saveGlobalRectData();
                return;
            }

            if (window.tileRenderer?.showTiles) {
                window.tileRenderer.showTiles(window.projectData, window.tileRenderer.isVerticalLayout);
            }
        });
    },

    processRects(tileId, mode) {
        const rects = document.querySelectorAll('#editorRectsContainer .rect');
        const output = this.extractRectData(rects);
        const tile = window.projectData.tiles[tileId];

        if (!tile) return false;

        tile.rects = tile.rects || {};
        this.updateTileRects(output, tile, mode);
        this.preserveDockingInformation(output, tile);

        return true;
    },

    extractRectData(rects) {
        const output = {};
        rects.forEach(rect => {
            const sel = rect.dataset.selector;
            output[sel] = {
                top: Math.round(parseFloat(rect.style.top || '0')),
                left: Math.round(parseFloat(rect.style.left || '0')),
                width: Math.round(parseFloat(rect.style.width || '100')),
                height: Math.round(parseFloat(rect.style.height || '60'))
            };
            const input = rect.querySelector('input');
            const select = rect.querySelector('select');
            if (input && input.type !== 'file') output[sel].value = input.value;
            if (select) output[sel].target = select.value;
            // PDF: store filename if present
            const pdfBtn = rect.querySelector('.pdf-filename');
            if (pdfBtn) output[sel].pdf = pdfBtn.dataset.filename || '';
            // VID: store filename if present
            const vidBtn = rect.querySelector('.vid-filename');
            if (vidBtn) output[sel].vid = vidBtn.dataset.filename || '';
        });
        return output;
    },

    updateTileRects(output, tile, mode) {
        for (const [sel, data] of Object.entries(output)) {
            const dockedTo = Object.entries(tile.docked || {}).find(
                ([btnId, tabId]) => `#${btnId}` === sel && tabId === this.currentRectId
            );

            if (mode === 'tab' ? !dockedTo : tile.docked?.[sel.replace('#', '')]) continue;

            tile.rects[sel] = {
                ...tile.rects[sel],
                ...data
            };
            // Remove legacy pdfN/vidN at tile level (fixes double save)
            if (sel.startsWith('#pdf-btn')) {
                Object.keys(tile)
                    .filter(k => /^pdf\d+$/.test(k))
                    .forEach(k => { delete tile[k]; });
            }
            if (sel.startsWith('#vid-btn')) {
                Object.keys(tile)
                    .filter(k => /^vid\d+$/.test(k))
                    .forEach(k => { delete tile[k]; });
            }
        }
    },

    preserveDockingInformation(output, tile) {
        if (!tile.docked) tile.docked = {};
        Object.keys(output).forEach(selector => {
            if (selector.includes('tab-btn') || selector.includes('mod-btn') || selector.includes('ref-btn')) {
                const dockedTo = tile.docked[selector];
                if (dockedTo && dockedTo.startsWith('tab')) {
                    tile.docked[selector] = dockedTo; 
                }
            }
        });
    },

    async handlePendingRects(tileId) {
        if (tileId === 'global') {
            console.log('ℹ️ Skipping handlePendingRects for global mode');
            this.pendingRects = [];
            return;
        }

        const tile = window.projectData.tiles?.[tileId];
        if (!tile || !tile.images) {
            console.warn(`⚠️ Missing or invalid tile/images for tileId: ${tileId}`);
            this.pendingRects = [];
            return;
        }

        const validPending = this.pendingRects.filter(p =>
            !this.deletedRects.some(d => d.selector === p.selector)
        );

        for (const { selector, imagePath, type } of validPending) {
            if (['mod', 'ref', 'tab'].includes(type) && imagePath) {
                const key = type === 'mod' ? 'mods' : type === 'ref' ? 'refs' : 'tabs';
                tile.images[key] = tile.images[key] || [];
                if (!tile.images[key].includes(imagePath)) {
                    tile.images[key].push(imagePath);
                }
            }
        }

        this.pendingRects = [];
    },

    async handleDeletedRects(tileId) {
        for (const d of this.deletedRects) {
            if (validPending.some(p => p.selector === d.selector)) continue;

            const shortId = d.selector.replace('#', '').replace('-btn', '');
            const type = shortId.match(/[a-z]+/)[0];
            const deletedIndex = parseInt(shortId.match(/\d+/)[0]);

            delete window.projectData.tiles[d.tileId]?.rects?.[`#${type}-btn${deletedIndex}`];

            if (['mod', 'ref', 'tab'].includes(type)) {
                const fullPath = `screens/${d.filename}`;
                const shouldDelete = await window.electronAPI.fileExists(fullPath);
                if (shouldDelete && !fullPath.includes('placeholder.png')) {
                    await window.electronAPI.deleteImage(fullPath);
                }
            }
            
            await window.projectManager.shiftRectsDown(type, tileId, deletedIndex);
        }

        this.deletedRects = [];
    },

    saveGlobalRectData() {
        // Only persist global rects after save
        let globalRects = {};
        if (this.unsavedGlobalRects && Object.keys(this.unsavedGlobalRects).length) {
            globalRects = { ...window.projectData.tiles.global?.rects, ...this.unsavedGlobalRects };
        } else {
            globalRects = window.projectData.tiles.global?.rects || {};
        }
        // --- Ensure all meta fields are included in global rects before saving ---
        // (merge any values/targets/pdf/vid from DOM if missing)
        Object.entries(globalRects).forEach(([sel, data]) => {
            const rectEl = document.querySelector(`#globalRectsContainer .rect[data-selector="${sel}"]`);
            if (!rectEl) return;
            // Value
            const input = rectEl.querySelector('input');
            if (input && input.type !== 'file') data.value = input.value;
            // Target
            const select = rectEl.querySelector('select');
            if (select) data.target = select.value;
            // PDF
            const pdfSpan = rectEl.querySelector('.pdf-filename');
            if (pdfSpan) data.pdf = pdfSpan.dataset.filename || '';
            // VID
            const vidSpan = rectEl.querySelector('.vid-filename');
            if (vidSpan) data.vid = vidSpan.dataset.filename || '';
        });

        const classRects = {}, idRects = {};
        Object.entries(globalRects).forEach(([sel, data]) => {
            if (sel.startsWith('.')) classRects[sel] = data;
            else if (sel.startsWith('#')) idRects[sel] = data;
        });

        const finalOutput = this.generateFinalOutput(classRects, idRects);

        window.projectData.tiles.global = window.projectData.tiles.global || {};
        window.projectData.tiles.global.rects = finalOutput;

        alert('✔ Global rects saved.');
        this.setGlobalMode(false);
        this.currentTileId = null;
        document.querySelector('.image-editor').classList.add('hidden');
        this.pendingRects = [];
        this.deletedRects = [];
        // Clear unsaved global rects and counters after save
        this.unsavedGlobalRects = {};
        this.globalTypeCounters = {};
        this.globalOtherCounters = {};
        setTimeout(() => {
            if (window.tileRenderer?.showTiles) {
                window.tileRenderer.showTiles(window.projectData, window.tileRenderer.isVerticalLayout);
            }
        }, 10);
    },

    generateFinalOutput(classRects, idRects) {
        const finalOutput = { ...classRects };
        for (const [sel, rect] of Object.entries(idRects)) {
            const baseType = sel.replace(/\d+/, '1').replace('#', '.');
            const base = classRects[baseType];

            const diffs = {};
            for (const key of ['top', 'left', 'width', 'height']) {
                if (!base || rect[key] !== base[key]) {
                    diffs[key] = rect[key];
                }
            }

            finalOutput[sel] = Object.keys(diffs).length ? diffs : rect;
        }
        return finalOutput;
    },
    
    async addEditorRect(type) {
        const tileId = this.currentTileId;
        const isGlobal = this.currentMode === 'global';

        // Ensure global data structure exists if in global mode
        if (isGlobal && !window.projectData.tiles.global) {
            window.projectData.tiles.global = { rects: {} };
        }

        // Use a local variable for rects in global mode (do not persist until save)
        let targetTile;
        if (isGlobal) {
            if (!this.unsavedGlobalRects) this.unsavedGlobalRects = {};
            targetTile = { rects: { ...window.projectData.tiles.global?.rects, ...this.unsavedGlobalRects } };
        } else {
            targetTile = window.projectData.tiles[tileId];
        }

        if (!targetTile.rects) targetTile.rects = {};

        const container = isGlobal
            ? document.getElementById('globalRectsContainer')
            : document.getElementById('editorRectsContainer');

        // --- Use separate counters for "other" rect types in global mode ---
        // "other" types: link, alt, pres, pdf, vid
        const isOtherType = ['link', 'alt', 'pres', 'pdf', 'vid'].includes(type);
        if (isGlobal && isOtherType) {
            if (!this.globalOtherCounters) this.globalOtherCounters = {};
            if (typeof this.globalOtherCounters[type] !== 'number') this.globalOtherCounters[type] = 0;
        }
        if (isGlobal && !isOtherType) {
            if (!this.globalTypeCounters) this.globalTypeCounters = {};
            if (typeof this.globalTypeCounters[type] !== 'number') this.globalTypeCounters[type] = 0;
        }

        // Find all existing selectors for this type in this mode
        const getTypeFromSelector = (sel) => {
            const m = sel.match(/[#.](\w+)-btn(\d+)?$/);
            return m ? m[1] : '';
        };
        const existing = Object.keys(targetTile.rects)
            .filter(k => getTypeFromSelector(k) === type);
        const pending = this.pendingRects
            .filter(r => getTypeFromSelector(r.selector) === type)
            .map(r => r.selector);
        const allSelectors = [...existing, ...pending];

        let id, selector, nextIndex;
        if (isGlobal && !allSelectors.some(k => k.startsWith(`.${type}-btn`))) {
            id = `${type}-btn`;
            selector = `.${id}`;
        } else {
            // --- Use separate counters for "other" types in global mode ---
            let usedNumbers = allSelectors
                .map(k => parseInt(k.match(/\d+$/)?.[0]))
                .filter(n => !isNaN(n));
            if (isGlobal && isOtherType) {
                // Use and increment dedicated counter for this type
                nextIndex = this.globalOtherCounters[type] + 1;
                while (usedNumbers.includes(nextIndex)) nextIndex++;
                this.globalOtherCounters[type] = nextIndex;
            } else if (isGlobal && !isOtherType) {
                nextIndex = this.globalTypeCounters[type] + 1;
                while (usedNumbers.includes(nextIndex)) nextIndex++;
                this.globalTypeCounters[type] = nextIndex;
            } else {
                nextIndex = 1;
                while (usedNumbers.includes(nextIndex)) nextIndex++;
            }
            id = `${type}-btn${nextIndex}`;
            selector = `#${id}`;
        }

        const countOfThisType = allSelectors.length;
        const color = typeDefs[type]?.color || 'rgba(200,200,200,0.3)';
        const baseTop = typeDefs[type]?.baseTop || 100;
        const topOffset = baseTop + countOfThisType * 40;
        const leftOffset = 100 + countOfThisType * 50;

        const groupIndex = this.groupIndexMap?.[type] || 0;
        if (!isGlobal) this.groupIndexMap[type] = groupIndex + 1;

        const rect = this._createRect(id, selector, color, groupIndex, baseTop, '');

        if (isGlobal && type === 'glob') {
            const nameInput = document.createElement('input');
            nameInput.className = 'rect-meta';
            nameInput.placeholder = 'Enter name';
            nameInput.oninput = () => {
                let clean = nameInput.value.trim().replace(/\s+/g, '').replace(/[^a-zA-Z0-9_-]/g, '');
                if (!clean) clean = `glob${Date.now()}`;
                rect.dataset.selector = `#${clean}-btn`;
                document.getElementById('rect-name').textContent = `#${clean}-btn`;
            };
            rect.appendChild(nameInput);
        }

        let meta = {};
        if (type === 'link' || type === 'alt') meta.target = '';
        if (type === 'pres') meta.value = '';
        if (type === 'pdf') meta.pdf = '';
        if (type === 'vid') meta.vid = '';

        if (meta.target !== undefined) {
            const select = document.createElement('select');
            select.className = 'rect-meta';
            select.innerHTML = '<option value="">Select</option>';

            if (type === 'link') {
                Object.keys(window.projectData.tiles)
                    .filter(id => id !== tileId && id !== 'global')
                    .forEach(id => {
                        const label = window.projectData.tiles[id]?.label || '';
                        select.innerHTML += `<option value="${id}">${id}${label ? ' – ' + label : ''}</option>`;
                    });
            }

            if (type === 'alt') {
                Object.keys(targetTile.rects || {})
                    .filter(k => !k.includes('alt-btn'))
                    .forEach(sel => {
                        select.innerHTML += `<option value="${sel}">${sel}</option>`;
                    });
            }

            // --- Ensure correct label is shown after save ---
            select.value = meta.target || '';
            select.onchange = () => meta.target = select.value;
            rect.appendChild(select);
        }

        if (meta.value !== undefined) {
            const input = document.createElement('input');
            input.className = 'rect-meta';
            input.placeholder = 'Enter value';
            input.oninput = () => meta.value = input.value;
            rect.appendChild(input);
        }

        // PDF: Add select PDF button
        if (type === 'pdf') {
            const pdfBtn = document.createElement('button');
            pdfBtn.textContent = 'Select PDF';
            pdfBtn.className = 'rect-meta pdf-select-btn';
            pdfBtn.style.marginTop = '8px';
            pdfBtn.type = 'button';

            const filenameSpan = document.createElement('span');
            filenameSpan.className = 'pdf-filename';
            filenameSpan.style.display = 'block';
            filenameSpan.style.fontSize = '11px';
            filenameSpan.style.marginTop = '4px';

            pdfBtn.onclick = async () => {
                const filePath = await window.electronAPI.selectFile('pdf');
                if (!filePath) return;
                const fileName = filePath.split(/[\\/]/).pop();
                // Only copy to app-level pdfs dir, not tile folder, and do NOT create any tile folder here
                const appDir = await window.electronAPI.getAppDir();
                const pdfsDir = `${appDir}/pdfs`;
                await window.electronAPI.makeDir(pdfsDir);
                const destPath = `${pdfsDir}/${fileName}`;
                await window.electronAPI.copyFile(filePath, destPath);
                filenameSpan.textContent = fileName;
                filenameSpan.dataset.filename = fileName;
                meta.pdf = fileName;
            };
            rect.appendChild(pdfBtn);
            rect.appendChild(filenameSpan);
        }

        // VID: Add select Video button
        if (type === 'vid') {
            const vidBtn = document.createElement('button');
            vidBtn.textContent = 'Select Video';
            vidBtn.className = 'rect-meta vid-select-btn';
            vidBtn.style.marginTop = '8px';
            vidBtn.type = 'button';

            const filenameSpan = document.createElement('span');
            filenameSpan.className = 'vid-filename';
            filenameSpan.style.display = 'block';
            filenameSpan.style.fontSize = '11px';
            filenameSpan.style.marginTop = '4px';

            vidBtn.onclick = async () => {
                const filePath = await window.electronAPI.selectFile('mp4');
                if (!filePath || !filePath.toLowerCase().endsWith('.mp4')) return;
                const fileName = filePath.split(/[\\/]/).pop();
                // Only copy to app-level vids dir, not tile folder, and do NOT create any tile folder here
                const appDir = await window.electronAPI.getAppDir();
                const vidsDir = `${appDir}/vids`;
                await window.electronAPI.makeDir(vidsDir);
                const destPath = `${vidsDir}/${fileName}`;
                await window.electronAPI.copyFile(filePath, destPath);
                filenameSpan.textContent = fileName;
                filenameSpan.dataset.filename = fileName;
                meta.vid = fileName;
            };
            rect.appendChild(vidBtn);
            rect.appendChild(filenameSpan);
        }

        container.appendChild(rect);

        rect.style.top = `${topOffset}px`;
        rect.style.left = `${leftOffset}px`;
        rect.style.width = '100px';
        rect.style.height = '60px';

        window.makeDraggableResizable(rect);

        let imagePath = null;
        if (['mod', 'ref', 'tab'].includes(type)) {
            const shortId = selector.replace('#', '').replace('-btn', '');
            const ext = type === 'tab' ? '.jpg' : '.png';
            imagePath = `screens/slide_${tileId}_${shortId}${ext}`;
        }

        // Only add to pendingRects, not to tile.rects/global.rects yet
        this.pendingRects.push({ selector, rect, meta, type, imagePath });

        // For global mode, also track in unsavedGlobalRects for rendering
        if (isGlobal) {
            if (!this.unsavedGlobalRects) this.unsavedGlobalRects = {};
            this.unsavedGlobalRects[selector] = {
                top: topOffset,
                left: leftOffset,
                width: 100,
                height: 60
            };
        }
    },
    
      _applyStyle(rect, selector, styles) {
		const s = styles?.[selector];
		if (!s) return;
		rect.style.top = `${s.top}px`;
		rect.style.left = `${s.left}px`;
		rect.style.width = `${s.width}px`;
		rect.style.height = `${s.height}px`;
	  },
	  
	  _getRectTypeFromSelector(selector) {
		if (selector.includes('mod')) return 'mod';
		if (selector.includes('ref')) return 'ref';
		if (selector.includes('tab')) return 'tab';
		if (selector.includes('link')) return 'link';
		if (selector.includes('alt')) return 'alt';
		if (selector.includes('pres')) return 'pres';
		if (selector.includes('pdf')) return 'pdf';
		if (selector.includes('vid')) return 'vid';
		return '';
	},
	  _createRect(id, selector, bgColor, index = 0, baseTop = 100, group = '') {
        const rect = document.createElement('div');
        rect.className = 'rect draggable resizable';

        // --- Global mode: transparent white bg, black text, bold/standout label ---
        if (this.currentMode === 'global') {
            rect.style.background = 'rgba(255,255,255,0.7)';
            rect.style.border = '2px dashed #222';
        } else {
            rect.style.background = bgColor;
        }

        rect.dataset.selector = selector;
        rect.style.left = `${100 + index * 50}px`;
        rect.style.top = `${baseTop + index * 40}px`;
        rect.style.width = '100px';
        rect.style.height = '60px';

        // --- Label: neater, more prominent ---
        const label = document.createElement('div');
        label.className = 'rect-label';
        label.style.fontWeight = 'bold';
        label.style.fontSize = '13px';
        label.style.letterSpacing = '0.5px';
        label.style.textShadow = this.currentMode === 'global'
            ? '0 1px 4px #fff, 0 0px 1px #fff'
            : '0 1px 4px #222, 0 0px 1px #fff';
        label.style.color = this.currentMode === 'global' ? '#111' : '#fff';
        label.style.background = this.currentMode === 'global' ? 'rgba(255,255,255,0.5)' : 'transparent';
        label.style.padding = '2px 6px';
        label.style.borderRadius = '6px';
        label.style.margin = '2px 0';

        // Label text: show type and index, and selector
        let labelText = '';
        if (this.currentMode === 'global') {
            labelText = `GLOBAL ${id}\n${selector}`;
        } else {
            labelText = `${this.currentTileId} ${id}\n${selector}`;
        }
        label.innerText = labelText;
        rect.appendChild(label);

        // Add delete functionality
        const del = document.createElement('div');
        del.className = 'rect-delete';
        del.innerText = '×';
        del.onclick = async (e) => {
            e.stopPropagation();
            rect.remove();

            const tileId = this.currentTileId;
            const tile = window.projectData.tiles[tileId];
            const selectorId = selector.replace('#', '');

            if (this.currentMode === 'global') {
                if (window.projectData.tiles.global?.rects?.[selector]) {
                    delete window.projectData.tiles.global.rects[selector];
                }
                if (this.unsavedGlobalRects && this.unsavedGlobalRects[selector]) {
                    delete this.unsavedGlobalRects[selector];
                }
                // Remove from counters if needed (for "other" types)
                const type = selector.replace(/^([#.])/, '').split('-')[0];
                if (this.globalOtherCounters && this.globalOtherCounters[type]) {
                    this.globalOtherCounters[type]--;
                }
                if (this.globalTypeCounters && this.globalTypeCounters[type]) {
                    this.globalTypeCounters[type]--;
                }
                return;
            }

            if (selectorId.startsWith('tab-btn')) {
                const tabNum = selectorId.replace('tab-btn', '');
                const tabId = `tab${tabNum}`;

                Object.entries(tile.docked || {}).forEach(([btnId, dockTarget]) => {
                    if (dockTarget === tabId) {
                        console.log(`↩ Returning ${btnId} from ${tabId} to main`);
                        delete tile.docked[btnId];
                    }
                });
            }

            const rectType = selectorId.split('-')[0];
            const knownTypes = ['mod', 'ref', 'tab', 'alt', 'link', 'pres'];

            if (knownTypes.includes(rectType)) {
                const shortId = selectorId.replace('-btn', '');
                const ext = ['tab', 'mod', 'ref'].includes(rectType) ? (rectType === 'tab' ? '.jpg' : '.png') : null;
                const filename = ext ? `slide_${tileId}_${shortId}${ext}` : null;
                const index = parseInt(shortId.replace(rectType, ''));

                this.deletedRects.push({ selector, type: rectType, tileId, index, filename });
                this.pendingRects = this.pendingRects.filter(p => p.selector !== selector);
                delete tile.rects[selector];
            }

            window.rectInspector.bindToRect(rect);

            if (window.tileRenderer?.showTiles) {
                window.tileRenderer.showTiles(window.projectData, window.tileRenderer.isVerticalLayout);
            }
        };

        if (index === 0 && group) {
            const header = document.createElement('div');
            header.className = 'group-label';
            header.innerText = group;
            header.style.position = 'absolute';
            header.style.left = '10px';
            header.style.top = `${baseTop - 30}px`;
            header.style.fontWeight = 'bold';
            header.style.fontSize = '14px';
            header.style.color = '#fff';
            document.getElementById('editorRectsContainer')?.appendChild(header);
        }

        rect.appendChild(del);
        rect.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            window.rectInspector.bindToRect(rect);
            const label = rect.dataset.selector || '';
            document.getElementById('rect-name').textContent = label;
        });
        window.makeDraggableResizable(rect);
        return rect;
    },

    _loadGlobalRects() {
        const container = document.getElementById('globalRectsContainer');
        container.innerHTML = '';
        // Use only saved rects unless there are unsaved ones (editor open)
        let globalRects = window.projectData.tiles.global?.rects || {};
        if (this.unsavedGlobalRects && Object.keys(this.unsavedGlobalRects).length) {
            globalRects = { ...globalRects, ...this.unsavedGlobalRects };
        }
        const types = ['mod', 'ref', 'tab', 'link', 'alt', 'pres', 'pdf', 'vid'];

        types.forEach(type => {
            const baseSelector = `.${type}-btn`;
            const base = globalRects[baseSelector];

            if (base) {
                const rect = this._createRect(baseSelector, baseSelector, 'white', 0, 100, `${type.toUpperCase()} Defaults`);
                this._applyStyle(rect, baseSelector, {[baseSelector]: base});
                rect.style.border = '2px solid white';
                container.appendChild(rect);
                window.makeDraggableResizable(rect);
            }

            Object.entries(globalRects).forEach(([sel, data]) => {
                if (!sel.startsWith(`#${type}-btn`)) return;

                const rect = this._createRect(sel.replace('#', ''), sel, 'rgba(255,255,255,0.4)', 1, 180, '');
                this._applyStyle(rect, sel, {[sel]: data});
                rect.style.border = '1px dashed white';
                container.appendChild(rect);
                window.makeDraggableResizable(rect);
            });
        });

        // Ensure pointer events are enabled for global rects in global mode
        container.style.pointerEvents = 'auto';
        // Also ensure all child rects are interactive
        Array.from(container.querySelectorAll('.rect')).forEach(rect => {
            rect.style.pointerEvents = 'auto';
        });
    },

    setGlobalMode(enabled) {
        this.currentMode = enabled ? 'global' : 'main';
        const editorRects = document.getElementById('editorRectsContainer');
        const globalRects = document.getElementById('globalRectsContainer');
        const buttons = document.querySelector('.editor-buttons');

        // Fix: Only proceed if all elements exist
        if (!editorRects || !globalRects || !buttons) return;

        if (enabled) {
            this._loadGlobalRects();
            editorRects.style.display = 'none';
            globalRects.style.display = 'block';
            globalRects.style.pointerEvents = 'auto'; // <-- Enable interaction
            buttons.classList.add('global-mode');

            buttons.innerHTML = '';
            ['mod', 'ref', 'tab', 'link', 'alt', 'pres', 'pdf', 'vid'].forEach(type => {
                const btn = document.createElement('button');
                btn.textContent = `+ Global ${type}`;
                btn.onclick = () => this.addEditorRect(type);
                buttons.appendChild(btn);
            });

            const globalBtn = document.createElement('button');
            globalBtn.innerText = '+ Global';
            globalBtn.id = 'add-global-btn';
            globalBtn.addEventListener('click', () => {
                const name = prompt('Enter a unique name (no spaces):', 'myglob');
                if (!name || /\s/.test(name)) {
                    alert('Invalid name.');
                    return;
                }
                const sel = `#${name}-btn`;
                const rect = this._createRect(`${name}-btn`, sel, 'rgba(255,255,255,0.4)', 0, 620, 'Global Buttons');
                document.getElementById('globalRectsContainer')?.appendChild(rect);
                window.makeDraggableResizable(rect);
                // Track in unsavedGlobalRects
                if (!this.unsavedGlobalRects) this.unsavedGlobalRects = {};
                this.unsavedGlobalRects[sel] = {
                    top: 620,
                    left: 100,
                    width: 100,
                    height: 60
                };
            });
            buttons.appendChild(globalBtn);
        } else {
            const showGlobalRects = document.getElementById('show-global-rects');
            if (showGlobalRects) showGlobalRects.checked = false;
            editorRects.style.display = 'block';
            globalRects.style.display = 'none';
            buttons.classList.remove('global-mode');
            globalRects.style.pointerEvents = 'none'; // <-- Disable interaction when not in global mode

            buttons.innerHTML = `
                <button id="add-mod-btn">+ Mod</button>
                <button id="add-ref-btn">+ Ref</button>
                <button id="add-tab-btn">+ Tab</button>
                <button id="add-link-btn">+ Link</button>
                <button id="add-alt-btn">+ Alt</button>
                <button id="add-pres-btn">+ Pres</button>
                <button id="add-pdf-btn">+ PDF</button>
                <button id="add-vid-btn">+ Vid</button>
            `;
            ['mod', 'ref', 'tab', 'link', 'alt', 'pres', 'pdf', 'vid'].forEach(type => {
                document.getElementById(`add-${type}-btn`)?.addEventListener('click', () => {
                    this.addEditorRect(type);
                });
            });
        }
    },
	 
	handleTileClick(e) {
	  const tileId = $(e.currentTarget).data('tileid');
	  const imagePath = $(e.currentTarget).data('img');
	  window.editorPanel.open({ tileId, rectId: null, imagePath, type: null });
	},
	/*
	addGlobalRect(type) {
		const baseSelector = `.${type}-btn`;
		const global = window.projectData.tiles.global || (window.projectData.tiles.global = { rects: {} });
		global.rects = global.rects || {};

		const rects = global.rects;

		if (!rects[baseSelector]) {
			rects[baseSelector] = { top: 100, left: 100, width: 100, height: 60 };
			alert(`✔ Created default global ${type}-btn`);
		} else {
			const i = Object.keys(rects).filter(k => k.startsWith(`#${type}-btn`)).length + 2;
			rects[`#${type}-btn${i}`] = {
			top: 100 + i * 20,
			left: 100 + i * 20,
			width: 100,
			height: 60
			};
			alert(`✔ Added #${type}-btn${i} to global`);
		}

		// 🔁 Clear container but preserve DOM position data first
		const existing = {};
		document.querySelectorAll('#globalRectsContainer .rect').forEach(r => {
			existing[r.dataset.selector] = {
			top: r.style.top,
			left: r.style.left,
			width: r.style.width,
			height: r.style.height
			};
		});

		this._loadGlobalRects();

		// 🔁 Restore visual positions
		setTimeout(() => {
			Object.entries(existing).forEach(([sel, style]) => {
			const el = document.querySelector(`#globalRectsContainer .rect[data-selector="${sel}"]`);
			if (el) {
				el.style.top = style.top;
				el.style.left = style.left;
				el.style.width = style.width;
				el.style.height = style.height;
			}
			});
		}, 0);
	},
*/
	async handleIndicatorClick(e) {
		e.stopPropagation();
		const tileId = $(e.currentTarget).data('tileid');
		const type = $(e.currentTarget).data('type');
		const imgPath = $(e.currentTarget).data('img');
		const index = $(e.currentTarget).data('index');
		const rectId = `${type}${index}`;
	  
		if (imgPath?.includes('placeholder')) return;
		if (['link', 'alt', 'pres'].includes(type)) return;
	  
		const shortId = `${type}${index}`;
		const ext = type === 'tab' ? '.jpg' : '.png';
		const targetPath = `screens/slide_${tileId}_${shortId}${ext}`;
		const exists = await window.electronAPI.fileExists(targetPath);
	  
		if (!exists) {
			const file = await window.electronAPI.promptImageUpload();
			if (file) {
			  const targetPath = `screens/slide_${tileId}_${shortId}${ext}`;
			  await window.electronAPI.saveAttachment(targetPath, file.data, true);
	  
			// 👇 If uploaded image exceeds current count, bump the count
			const tile = window.projectData.tiles[tileId];
			tile.images = tile.images || {};
	  
			if (type === 'mod') {
			  const count = tile.images.modCount || 0;
			  if (index > count) tile.images.modCount = index;
			} else if (type === 'ref') {
			  const count = tile.images.refCount || 0;
			  if (index > count) tile.images.refCount = index;
			} else if (type === 'tab') {
			  const count = tile.images.tabCount || 0;
			  if (index > count) tile.images.tabCount = index;
			}
	  
			// Re-render layout to show new image
			if (window.tileRenderer?.showTiles) {
			  window.tileRenderer.showTiles(window.projectData, window.tileRenderer.isVerticalLayout);
			}
	  
			// ✅ Now open the editor
			this.open({ tileId, rectId, imagePath: targetPath, type });
		  }
		} else {
		  // Open as usual if image already exists
		  this.open({ tileId, rectId, imagePath: imgPath, type });
		}
	  },
  
	open({ tileId, rectId, imagePath, type }) {

		console.log('editorPanel.open called with', tileId);

		this.currentTileId = tileId;
		this.currentRectId = rectId;
		// Always start in main mode, hide global rects, uncheck checkbox
		this.currentMode = type === 'tab' ? 'tab' : rectId ? 'indicator' : 'main';
		this.groupIndexMap = { mod: 0, ref: 0, tab: 0, link: 0, alt: 0, pres: 0, pdf: 0, vid: 0 };
		this.pendingRects = [];
		this.deletedRects = [];
		// Clear unsaved global rects and counters on open (unless in global mode)
		this.unsavedGlobalRects = {};
		this.globalTypeCounters = {};
		this.globalOtherCounters = {};

        // Hide global rects, show per-tile rects, uncheck checkbox
        const globalRects = document.getElementById('globalRectsContainer');
        const editorRects = document.getElementById('editorRectsContainer');
        if (globalRects) globalRects.style.display = 'none';
        if (editorRects) editorRects.style.display = 'block';
        const showGlobalRects = document.getElementById('show-global-rects');
        if (showGlobalRects) showGlobalRects.checked = false;

		document.querySelector('.image-editor').classList.remove('hidden');
		document.getElementById('editorImage').src = imagePath || '';


		const container = document.getElementById('editorRectsContainer');
		container.innerHTML = '';

		const metaTileId = document.getElementById('meta-tile-id');
		const metaImage = document.getElementById('meta-image');
		const metaRectCount = document.getElementById('meta-rect-count');
		const metaLabel = document.getElementById('meta-tile-label');


		const tile = window.projectData.tiles[tileId];
		const rectCount = Object.keys(tile?.rects || {}).length;

		if (metaTileId) metaTileId.textContent = tileId;
		if (metaImage) metaImage.textContent = imagePath?.split('/').pop() || 'N/A';
		if (metaRectCount) metaRectCount.textContent = rectCount;

		// Hook up label editing
		if (metaLabel) {
		metaLabel.value = tile?.label || '';
		metaLabel.oninput = () => {
			tile.label = metaLabel.value;

			// Optional: Refresh previewPane or tileRenderer if needed
			if (window.previewPane?.update) window.previewPane.update();
			if (window.tileRenderer?.showTiles) {
			window.tileRenderer.showTiles(window.projectData, window.tileRenderer.isVerticalLayout);
			}
		};
		}

		const rectData = tile.rects || {};
		const docked = tile.docked || {};
		const assets = tile.images || {};


		const isMainSlide = this.currentMode === 'main';
		const currentTab = this.currentMode === 'tab' ? this.currentRectId : null;

		const isDockedElsewhere = (selector) => {
			const id = selector.replace('#', '');
			const dockedTo = docked?.[id];
			return dockedTo && (!currentTab || dockedTo !== currentTab);
		};


  
	  // 📐 Prepopulate rects for imported images
	  ['mods', 'refs', 'tabs'].forEach(type => {
		const key = type === 'tabs' ? 'tab' : type.slice(0, 3);
		(assets[type] || []).forEach((_, i) => {
		  const selector = `#${key}-btn${i + 1}`;
		  if (!rectData[selector]) {
			rectData[selector] = {
			  top: type === 'refs' ? 300 : type === 'tabs' ? 500 : 100,
			  left: 100 + i * 50,
			  width: 100,
			  height: 60
			};
		  }
		});
	  });
  
	  const rectStyles = window.projectManager.getTileRects(tileId, this.currentMode, rectId?.replace('tab', ''));
  
	  if (this.currentMode === 'indicator' && rectId) {
		const bgSel = `#${rectId} .pop-bg`;
		const btnSel = `#${rectId} .close-btn`;
  
		const bg = this._createRect('pop-bg', bgSel, 'rgba(255,165,0,0.3)');
		const btn = this._createRect('close-btn', btnSel, 'rgba(255,0,0,0.3)');
  
		this._applyStyle(bg, bgSel, rectStyles);
		this._applyStyle(btn, btnSel, rectStyles);
  
		container.appendChild(bg);
		container.appendChild(btn);
		return;
	  }
  
	  if (this.currentMode === 'tab' && rectId?.startsWith('tab')) {
            const tabIndex = parseInt(rectId.replace('tab', ''));
            let modIndex = 0;
            let refIndex = 0;

            Object.entries(docked).forEach(([btnId, tabId]) => {
                if (tabId !== `tab${tabIndex}`) return;
                const selector = `#${btnId}`;
                const isRef = btnId.startsWith('ref');
                const baseTop = isRef ? 180 : 100;
                const index = isRef ? refIndex++ : modIndex++;
                const group = isRef ? 'Ref Buttons' : 'Modal Buttons';
                const color = isRef ? 'rgba(0,255,0,0.3)' : 'rgba(0,0,255,0.3)';

                const rect = this._createRect(btnId, selector, color, index, baseTop, group);
                this._applyStyle(rect, selector, rectStyles);
                container.appendChild(rect);

                // Rebuild dropdown/input for link/alt/pres
                const saved = rectStyles[selector];
                if (saved?.target !== undefined) {
                    const select = document.createElement('select');
                    select.className = 'rect-meta';
                    select.innerHTML = `<option value="">Select</option>`;
                    if (btnId.startsWith('link')) {
                        Object.keys(window.projectData.tiles).filter(id => id !== tileId).forEach(sid => {
                            const label = window.projectData.tiles[sid]?.label || '';
                            select.innerHTML += `<option value="${sid}" ${sid === saved.target ? 'selected' : ''}>${sid}${label ? ' – ' + label : ''}</option>`;
                        });
                    } else if (btnId.startsWith('alt')) {
                        Object.keys(rectData).filter(k => !k.includes('alt')).forEach(sel => {
                            select.innerHTML += `<option value="${sel}" ${sel === saved.target ? 'selected' : ''}>${sel}</option>`;
                        });
                    }
                    select.value = saved.target || '';
                    select.onchange = () => tile.rects[selector].target = select.value;
                    rect.appendChild(select);
                }
                if (saved?.value !== undefined) {
                    const input = document.createElement('input');
                    input.className = 'rect-meta';
                    input.placeholder = 'Enter value';
                    input.value = saved.value;
                    input.oninput = () => tile.rects[selector].value = input.value;
                    rect.appendChild(input);
                }
                // --- PDF/VID: preserve select/upload button and filename label when docked ---
                if (btnId.startsWith('pdf')) {
                    const pdfBtn = document.createElement('button');
                    pdfBtn.textContent = 'Select PDF';
                    pdfBtn.className = 'rect-meta pdf-select-btn';
                    pdfBtn.style.marginTop = '8px';
                    pdfBtn.type = 'button';

                    const filenameSpan = document.createElement('span');
                    filenameSpan.className = 'pdf-filename';
                    filenameSpan.style.display = 'block';
                    filenameSpan.style.fontSize = '11px';
                    filenameSpan.style.marginTop = '4px';
                    if (saved?.pdf) {
                        filenameSpan.textContent = saved.pdf;
                        filenameSpan.dataset.filename = saved.pdf;
                    }

                    pdfBtn.onclick = async () => {
                        const filePath = await window.electronAPI.selectFile('pdf');
                        if (!filePath) return;
                        const appDir = await window.electronAPI.getAppDir();
                        const pdfsDir = `${appDir}/pdfs`;
                        await window.electronAPI.makeDir(pdfsDir);
                        const fileName = filePath.split(/[\\/]/).pop();
                        const destPath = `${pdfsDir}/${fileName}`;
                        await window.electronAPI.copyFile(filePath, destPath);
                        filenameSpan.textContent = fileName;
                        filenameSpan.dataset.filename = fileName;
                        window.projectData.tiles[tileId].rects[selector].pdf = fileName;
                        const pdfNum = selector.match(/\d+/)?.[0];
                        if (pdfNum) window.projectData.tiles[tileId][`pdf${pdfNum}`] = fileName;
                    };
                    rect.appendChild(pdfBtn);
                    rect.appendChild(filenameSpan);
                }
                if (btnId.startsWith('vid')) {
                    const vidBtn = document.createElement('button');
                    vidBtn.textContent = 'Select Video';
                    vidBtn.className = 'rect-meta vid-select-btn';
                    vidBtn.style.marginTop = '8px';
                    vidBtn.type = 'button';

                    const filenameSpan = document.createElement('span');
                    filenameSpan.className = 'vid-filename';
                    filenameSpan.style.display = 'block';
                    filenameSpan.style.fontSize = '11px';
                    filenameSpan.style.marginTop = '4px';
                    if (saved?.vid) {
                        filenameSpan.textContent = saved.vid;
                        filenameSpan.dataset.filename = saved.vid;
                    }

                    vidBtn.onclick = async () => {
                        const filePath = await window.electronAPI.selectFile('mp4');
                        if (!filePath || !filePath.toLowerCase().endsWith('.mp4')) return;
                        const appDir = await window.electronAPI.getAppDir();
                        const vidsDir = `${appDir}/vids`;
                        await window.electronAPI.makeDir(vidsDir);
                        const fileName = filePath.split(/[\\/]/).pop();
                        const destPath = `${vidsDir}/${fileName}`;
                        await window.electronAPI.copyFile(filePath, destPath);
                        filenameSpan.textContent = fileName;
                        filenameSpan.dataset.filename = fileName;
                        window.projectData.tiles[tileId].rects[selector].vid = fileName;
                        const vidNum = selector.match(/\d+/)?.[0];
                        if (vidNum) window.projectData.tiles[tileId][`vid${vidNum}`] = fileName;
                    };
                    rect.appendChild(vidBtn);
                    rect.appendChild(filenameSpan);
                }
            });
            return;
        }
  
	  Object.entries(rectData).forEach(([selector, vals]) => {
		if (isMainSlide && isDockedElsewhere(selector)) return;
		const id = selector.replace('#', '');
		const baseTop = vals.top || 100;
		const color = id.includes('mod') ? 'rgba(0,0,255,0.3)'
		  : id.includes('ref') ? 'rgba(0,255,0,0.3)'
		  : id.includes('tab') ? 'rgba(255,255,0,0.3)'
		  : id.includes('link') ? 'rgba(255,140,0,0.3)'
		  : id.includes('alt') ? 'rgba(128,0,128,0.3)'
		  : id.includes('pres') ? 'rgba(0,206,201,0.3)'
		  : id.includes('pdf') ? typeDefs.pdf.color
		  : 'rgba(0,206,201,0.3)';

		const rect = this._createRect(id, selector, color, 0, baseTop, '');
		this._applyStyle(rect, selector, rectData);
		
		if (selector.includes('pop-bg') || selector.includes('close-btn')) {
			if (!rectId || !selector.startsWith(`#${rectId}`)) return;
		}

		if (id.includes('link') || id.includes('alt')) {
		  const select = document.createElement('select');
		  select.className = 'rect-meta';
		  select.innerHTML = `<option value="">Select</option>`;
		  if (id.startsWith('link')) {
			Object.keys(window.projectData.tiles).filter(id => id !== tileId && id !== 'global').forEach(sid => {
			  const label = window.projectData.tiles[sid]?.label || '';
			  select.innerHTML += `<option value="${sid}" ${sid === vals.target ? 'selected' : ''}>${sid}${label ? ' – ' + label : ''}</option>`;
			});
		  } else if (id.startsWith('alt')) {
			Object.keys(rectData).filter(k => !k.includes('alt')).forEach(k => {
			  select.innerHTML += `<option value="${k}" ${k === vals.target ? 'selected' : ''}>${k}</option>`;
			});
		  }
		  select.value = vals.target || '';
		  select.onchange = () => {
			  window.projectData.tiles[tileId].rects[selector].target = select.value;
		  };

		  rect.appendChild(select);
		}
  
		if (id.startsWith('pres')) {
		  const input = document.createElement('input');
		  input.className = 'rect-meta';
		  input.placeholder = 'Enter value';
		  input.value = vals.value || '';
		  input.oninput = () => {
		  	  window.projectData.tiles[tileId].rects[selector].value = input.value;
		  };
		  rect.appendChild(input);
		}
  
		// PDF: Add select PDF button and show filename if present
        if (id.startsWith('pdf')) {
            const pdfBtn = document.createElement('button');
            pdfBtn.textContent = 'Select PDF';
            pdfBtn.className = 'rect-meta pdf-select-btn';
            pdfBtn.style.marginTop = '8px';
            pdfBtn.type = 'button';

            const filenameSpan = document.createElement('span');
            filenameSpan.className = 'pdf-filename';
            filenameSpan.style.display = 'block';
            filenameSpan.style.fontSize = '11px';
            filenameSpan.style.marginTop = '4px';
            if (vals.pdf) {
                filenameSpan.textContent = vals.pdf;
                filenameSpan.dataset.filename = vals.pdf;
            }

            pdfBtn.onclick = async () => {
                const filePath = await window.electronAPI.selectFile('pdf');
                if (!filePath) return;
                const appDir = await window.electronAPI.getAppDir();
                const pdfsDir = `${appDir}/pdfs`;
                await window.electronAPI.makeDir(pdfsDir);
                const fileName = filePath.split(/[\\/]/).pop();
                const destPath = `${pdfsDir}/${fileName}`;
                await window.electronAPI.copyFile(filePath, destPath);
                filenameSpan.textContent = fileName;
                filenameSpan.dataset.filename = fileName;
                window.projectData.tiles[tileId].rects[selector].pdf = fileName;
                // Also update tile.pdfN
                const pdfNum = selector.match(/\d+/)?.[0];
                if (pdfNum) window.projectData.tiles[tileId][`pdf${pdfNum}`] = fileName;
            };
            rect.appendChild(pdfBtn);
            rect.appendChild(filenameSpan);
        }
        // VID: Add select Video button and show filename if present
        if (id.startsWith('vid')) {
            const vidBtn = document.createElement('button');
            vidBtn.textContent = 'Select Video';
            vidBtn.className = 'rect-meta vid-select-btn';
            vidBtn.style.marginTop = '8px';
            vidBtn.type = 'button';

            const filenameSpan = document.createElement('span');
            filenameSpan.className = 'vid-filename';
            filenameSpan.style.display = 'block';
            filenameSpan.style.fontSize = '11px';
            filenameSpan.style.marginTop = '4px';
            if (vals.vid) {
                filenameSpan.textContent = vals.vid;
                filenameSpan.dataset.filename = vals.vid;
            }

            vidBtn.onclick = async () => {
                // Only accept .mp4 files
                const filePath = await window.electronAPI.selectFile('mp4');
                if (!filePath || !filePath.toLowerCase().endsWith('.mp4')) return;
                const appDir = await window.electronAPI.getAppDir();
                const vidsDir = `${appDir}/vids`;
                await window.electronAPI.makeDir(vidsDir);
                const fileName = filePath.split(/[\\/]/).pop();
                const destPath = `${vidsDir}/${fileName}`;
                await window.electronAPI.copyFile(filePath, destPath);
                filenameSpan.textContent = fileName;
                filenameSpan.dataset.filename = fileName;
                window.projectData.tiles[tileId].rects[selector].vid = fileName;
                // Also update tile.vidN
                const vidNum = selector.match(/\d+/)?.[0];
                if (vidNum) window.projectData.tiles[tileId][`vid${vidNum}`] = fileName;
            };
            rect.appendChild(vidBtn);
            rect.appendChild(filenameSpan);
        }

		container.appendChild(rect);
	  });
	}
  };
  
  const typeDefs = {
    mod:  { label: 'Modal Buttons',       color: 'rgba(0,0,255,0.3)',   baseTop: 100 },
    ref:  { label: 'Ref Buttons',         color: 'rgba(0,255,0,0.3)',   baseTop: 180 },
    tab:  { label: 'Tabs',                color: 'rgba(255,255,0,0.3)', baseTop: 260 },
    link: { label: 'Link Buttons',        color: 'rgba(255, 140, 0, 0.3)', baseTop: 340 },
    alt:  { label: 'Alt Buttons',         color: 'rgba(128,0,128,0.3)', baseTop: 420 },
    pres: { label: 'Pres Link Buttons',   color: 'rgba(0,206,201,0.3)', baseTop: 500 },
    pdf:  { label: 'PDF Buttons',         color: 'rgba(255, 0, 128, 0.3)', baseTop: 580 },
    vid:  { label: 'Video Buttons',       color: 'rgba(0,0,0,0.3)', baseTop: 660 }
  };
  /*
	function createRectValueField(rect, rectType, selector, existingValue) {
		let inputEl;

		if (rectType === 'pres') {
			inputEl = $('<input type="text" class="rect-input" placeholder="Enter note or value...">');
			if (existingValue) inputEl.val(existingValue);
			rect.append(inputEl);
		}

		if (rectType === 'link' || rectType === 'alt') {
			inputEl = $('<select class="rect-input"></select>');
			const tileOptions = Object.keys(window.projectData.tiles)
			.filter(id => id !== 'global' && id !== editorPanel.currentTileId)
			.map(id => `<option value="${id}">${window.projectData.tiles[id].label || id}</option>`);
			
			inputEl.append(`<option value="">-- select --</option>` + tileOptions.join(''));

			if (existingValue) inputEl.val(existingValue);
			rect.append(inputEl);
		}

		inputEl.on('change input', () => {
			rect.data('value', inputEl.val());
		});
	};

	
*/
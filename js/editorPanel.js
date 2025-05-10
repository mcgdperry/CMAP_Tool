// editorPanel.js — updated to fix unsaved rect persistence, tab mode bleed-through, and rect prepopulation from images


window.editorPanel = {
	currentTileId: null,
	currentRectId: null,
	currentMode: 'main',
	pendingRects: [],
	deletedRects: [],
  
	init() {  
		const closeBtn = document.getElementById('closeEditor');
		const saveBtn = document.getElementById('saveEditor');
	
		closeBtn.addEventListener('click', () => {
		  document.querySelector('.image-editor').classList.add('hidden');
		  this.pendingRects = []; // Clear unsaved rects
		  this.deletedRects = []; // Clear unsaved deletions
		});
	
		saveBtn.addEventListener('click', async () => {
		  const tileId = this.currentTileId;
		  const mode = this.currentMode;
		  const rects = document.querySelectorAll('#editorRectsContainer .rect');
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
			if (input) output[sel].value = input.value;
			if (select) output[sel].target = select.value;
		  });
	
		  const tile = window.projectData.tiles[tileId];
		  if (!tile) return;
		  tile.rects = tile.rects || {};

			for (const [sel, data] of Object.entries(output)) {
			// Detect if this is a tab slide (e.g., #mod-btn3 docked to tab2)
			const dockedTo = Object.entries(tile.docked || {}).find(
				([btnId, tabId]) => `#${btnId}` === sel && tabId === this.currentRectId
			);

			// If saving from tab view, only save tab-docked rects
			if (this.currentMode === 'tab') {
				if (!dockedTo) continue; // Skip anything not docked to this tab
			} else {
				// Main tile view: skip anything docked to a tab
				if (tile.docked?.[sel.replace('#', '')]) continue;
			}

			// Merge and save
			tile.rects[sel] = {
				...tile.rects[sel],
				...data
			};
			}
	
		  if (!tile.docked) tile.docked = {};
			Object.keys(output).forEach(selector => {
				if (selector.includes('tab-btn') || selector.includes('mod-btn') || selector.includes('ref-btn')) {
					const dockedTo = tile.docked[selector];
					if (dockedTo && dockedTo.startsWith('tab')) {
						tile.docked[selector] = dockedTo; // Preserve docking
					}
				}
			});


		  
		  // ✅ First: handle only valid pending rects
			const validPending = this.pendingRects.filter(p =>
				!this.deletedRects.some(d => d.selector === p.selector)
			);
			
			// ✅ Copy images for valid pending rects
			for (const { selector } of validPending) {
				if (selector.includes('mod') || selector.includes('ref') || selector.includes('tab')) {
					const shortId = selector.replace('#', '').replace('-btn', '');
					const ext = selector.includes('tab') ? '.jpg' : '.png';
					const imagePath = `screens/slide_${tileId}_${shortId}${ext}`;
					try {
						await window.electronAPI.copyPlaceholderImage(imagePath);
					} catch (err) {
						console.error('❌ Could not copy placeholder image:', err);
					}
				}
			}
			
			// ✅ Clean arrays *after* operations complete
			this.pendingRects = [];
			
			
			// ✅ Delete saved images from deletedRects
			for (const d of this.deletedRects) {
				if (d.filename && !validPending.some(p => p.selector === d.selector)) {
					console.log("trying del here");
					const shortId = d.selector.replace('#', '').replace('-btn', '');
					const type = shortId.match(/[a-z]+/)[0];  // 'mod', 'ref', etc.
					const deletedIndex = parseInt(shortId.match(/\d+/)[0]); // e.g., 3
					try {
						delete window.projectData.tiles[d.tileId]?.rects?.[`#${d.type}-btn${d.index}`];
						await window.electronAPI.deleteImage(`screens/${d.filename}`);
						delete window.projectData.tiles[this.currentTileId].rects[d.selector];
						window.projectManager.shiftRectsDown(type, tileId, deletedIndex);
					} catch (err) {
						console.warn('Could not delete during save:', d.filename);
					}
				}
			}
			
			this.deletedRects = [];


		  alert('✔ Rectangles saved to projectData!');
		  //console.log('💾 Saved rects:', output);
		  document.querySelector('.image-editor').classList.add('hidden');
	
		 
		  	if (window.tileRenderer?.showTiles) {
				window.tileRenderer.showTiles(window.projectData, window.tileRenderer.isVerticalLayout);
			}
		});
	  },
	
	  async addEditorRect(type) {
		const tileId = this.currentTileId;
		const tile = window.projectData.tiles[tileId];
		const container = document.getElementById('editorRectsContainer');
	
		const existing = [
			...Object.keys(tile.rects || {}),
			...this.pendingRects.map(r => r.selector)
		  ].filter(k => k.includes(`${type}-btn`));
		const numbers = existing.map(k => parseInt(k.match(/\d+/)?.[0])).filter(n => !isNaN(n));
		const nextIndex = numbers.length ? Math.max(...numbers) + 1 : 1;
		const id = `${type}-btn${nextIndex}`;
		const selector = `#${id}`;
		  
		const color = typeDefs[type]?.color || 'rgba(200,200,200,0.3)';
		const baseTop = typeDefs[type]?.baseTop || 100;
		const groupIndex = this.groupIndexMap[type] || 0;
		this.groupIndexMap[type] = groupIndex + 1;

		  
		// Create rectangle
		const rect = this._createRect(id, selector, color, groupIndex, baseTop, '');
		const meta = {};
		if (type === 'link' || type === 'alt') meta.target = '';
		if (type === 'pres') meta.value = '';
	
		this.pendingRects.push({ selector, rect, meta, type });

		if (['mod', 'ref', 'tab'].includes(type)) {
			const shortId = selector.replace('#', '').replace('-btn', '');
			const ext = type === 'tab' ? '.jpg' : '.png';
			const imagePath = `screens/slide_${tileId}_${shortId}${ext}`;
			const key = type === 'mod' ? 'mods' : type === 'ref' ? 'refs' : 'tabs';
			tile.images[key] = tile.images[key] || [];
			tile.images[key].push(imagePath);
		}

		if (meta.target !== undefined) {
		  const select = document.createElement('select');
		  select.className = 'rect-meta';
		  select.innerHTML = '<option value="">Select</option>';
	
		  if (type === 'link') {
			Object.keys(window.projectData.tiles).filter(id => id !== tileId).forEach(id => {
			  select.innerHTML += `<option value="${id}">${id}</option>`;
			});
		  }
	
		  if (type === 'alt') {
			Object.keys(tile.rects).filter(k => !k.includes('alt-btn')).forEach(sel => {
			  select.innerHTML += `<option value="${sel}">${sel}</option>`;
			});
		  }
	
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
	
		container.appendChild(rect);
		
		const countOfThisType = existing.length;
		const topOffset = baseTop + countOfThisType * 40;
		const leftOffset = 100 + countOfThisType * 50;

		this._applyStyle(rect, selector, {
			[selector]: {
				top: topOffset,
				left: leftOffset,
				width: 100,
				height: 60
			}
		});
		
		//took out here tilty

		window.makeDraggableResizable(rect);
	  },
	
	  _applyStyle(rect, selector, styles) {
		const s = styles?.[selector];
		if (!s) return;
		rect.style.top = `${s.top}px`;
		rect.style.left = `${s.left}px`;
		rect.style.width = `${s.width}px`;
		rect.style.height = `${s.height}px`;
	  },
	
	  _createRect(id, selector, bgColor, index = 0, baseTop = 100, group = '') {
		const rect = document.createElement('div');
		rect.className = 'rect draggable resizable';
		rect.dataset.selector = selector;
		rect.style.left = `${100 + index * 50}px`;
		rect.style.top = `${baseTop + index * 40}px`;
		rect.style.width = '100px';
		rect.style.height = '60px';
		rect.style.background = bgColor;
		  	
		const label = document.createElement('div');
		label.className = 'rect-label';
		label.innerText = `${this.currentTileId} ${id}\n(${selector.split(' ')[0]})`;
		rect.appendChild(label);

		const del = document.createElement('div');
		del.className = 'rect-delete';
		del.innerText = '×';
		del.onclick = async (e) => {
			e.stopPropagation();
			rect.remove();
		  
			const tileId = this.currentTileId;
			const tile = window.projectData.tiles[tileId];
			const selectorId = selector.replace('#', '');
		  
			// ✅ If deleting a tab, undock anything assigned to it (return to main)
			if (selectorId.startsWith('tab-btn')) {
			  const tabNum = selectorId.replace('tab-btn', '');
			  const tabId = `tab${tabNum}`;
		  
			  Object.entries(tile.docked || {}).forEach(([btnId, dockTarget]) => {
				if (dockTarget === tabId) {
				  console.log(`↩ Returning ${btnId} from ${tabId} to main`);
				  delete tile.docked[btnId]; // fully undock
				}
			  });
			}
		  
			// ✅ If it's a mod/ref/tab (with image), mark for deletion
			if (['mod', 'ref', 'tab'].some(t => selectorId.startsWith(`${t}-btn`))) {
			  const type = selectorId.includes('mod') ? 'mod'
						 : selectorId.includes('ref') ? 'ref'
						 : 'tab';
		  
			  const shortId = selectorId.replace('-btn', '');
			  const ext = type === 'tab' ? '.jpg' : '.png';
			  const filename = `slide_${tileId}_${shortId}${ext}`;
			  const index = parseInt(shortId.replace(type, ''));
		  
			  this.deletedRects.push({ selector, type, tileId, index, filename });
			  this.pendingRects = this.pendingRects.filter(p => p.selector !== selector);
			}
		  
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
	
		window.makeDraggableResizable(rect);
		return rect;
	  },

	handleTileClick(e) {
	  const tileId = $(e.currentTarget).data('tileid');
	  const imagePath = $(e.currentTarget).data('img');
	  window.editorPanel.open({ tileId, rectId: null, imagePath, type: null });
	},
  
	handleIndicatorClick(e) {
	  e.stopPropagation();
	  const tileId = $(e.currentTarget).data('tileid');
	  const type = $(e.currentTarget).data('type');
	  if (['link', 'alt', 'pres'].includes(type)) {
		return; // Don’t open editor for these types
	  }
	  const index = $(e.currentTarget).data('index');
	  const imagePath = $(e.currentTarget).data('img');
	  const rectId = `${type}${index}`;
	  window.editorPanel.open({ tileId, rectId, imagePath, type });
	},
  
	open({ tileId, rectId, imagePath, type }) {
	  this.currentTileId = tileId;
	  this.currentRectId = rectId;
	  this.currentMode = type === 'tab' ? 'tab' : rectId ? 'indicator' : 'main';
	  this.groupIndexMap = { mod: 0, ref: 0, tab: 0, link: 0, alt: 0, pres: 0 };

	  document.querySelector('.image-editor').classList.remove('hidden');
	  document.getElementById('editorImage').src = imagePath || '';

  
	  const container = document.getElementById('editorRectsContainer');
	  container.innerHTML = '';
  
	  const tile = window.projectData.tiles[tileId];
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
		  const baseTop = isRef ? 300 : 100;
		  const index = isRef ? refIndex++ : modIndex++;
		  const group = isRef ? 'Ref Buttons' : 'Modal Buttons';
		  const color = isRef ? 'rgba(0,255,0,0.3)' : 'rgba(0,0,255,0.3)';
  
		  const rect = this._createRect(btnId, selector, color, index, baseTop, group);
		  this._applyStyle(rect, selector, rectStyles);
		  container.appendChild(rect);

		  // Rebuild dropdown/input
			const saved = rectStyles[selector];
			if (saved?.target !== undefined) {
			const select = document.createElement('select');
			select.className = 'rect-meta';
			select.innerHTML = `<option value="">Select</option>`;
			
			if (btnId.startsWith('link')) {
				Object.keys(window.projectData.tiles).filter(id => id !== tileId).forEach(sid => {
				select.innerHTML += `<option value="${sid}" ${sid === saved.target ? 'selected' : ''}>${sid}</option>`;
				});
			} else if (btnId.startsWith('alt')) {
				Object.keys(rectData).filter(k => !k.includes('alt')).forEach(sel => {
				select.innerHTML += `<option value="${sel}" ${sel === saved.target ? 'selected' : ''}>${sel}</option>`;
				});
			}

			select.onchange = () => tile.rects[selector].target = select.value;
			rect.appendChild(select);
			}

			if (saved?.value !== undefined) {
			const input = document.createElement('input');
			input.className = 'rect-meta';
			input.value = saved.value;
			input.oninput = () => tile.rects[selector].value = input.value;
			rect.appendChild(input);
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
			Object.keys(window.projectData.tiles).filter(id => id !== tileId).forEach(sid => {
			  select.innerHTML += `<option value="${sid}" ${sid === vals.target ? 'selected' : ''}>${sid}</option>`;
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
  
		container.appendChild(rect);
	  });
  
	  const infoDiv = document.createElement('div');
	  infoDiv.id = 'editor-info';
	  infoDiv.innerHTML = `
		<div class="editor-meta">
		  <strong>Tile ID:</strong> ${tileId}<br />
		  <strong>Image:</strong> ${imagePath?.split('/').pop() || 'N/A'}<br />
		  <strong>Rects:</strong> ${Object.keys(rectData).length}
		</div>
		<div class="editor-buttons">
		  <button id="add-mod-btn">+ Mod</button>
		  <button id="add-ref-btn">+ Ref</button>
		  <button id="add-tab-btn">+ Tab</button>
		  <button id="add-link-btn">+ Link</button>
		  <button id="add-alt-btn">+ Alt</button>
		  <button id="add-pres-btn">+ Pres</button>
		</div>
	  `;
	  container.appendChild(infoDiv);
  
	  ['mod', 'ref', 'tab', 'link', 'alt', 'pres'].forEach(type => {
		document.getElementById(`add-${type}-btn`)?.addEventListener('click', () => {
		  this.addEditorRect(type);
		});
	  });
	}
  };
  
  const typeDefs = {
	mod:  { label: 'Modal Buttons',       color: 'rgba(0,0,255,0.3)',   baseTop: 100 },
	ref:  { label: 'Ref Buttons',         color: 'rgba(0,255,0,0.3)',   baseTop: 300 },
	tab:  { label: 'Tabs',                color: 'rgba(255,255,0,0.3)', baseTop: 500 },
	link: { label: 'Link Buttons',        color: 'rgba(255, 140, 0, 0.3)', baseTop: 180 },
	alt:  { label: 'Alt Buttons',         color: 'rgba(128,0,128,0.3)', baseTop: 440 },
	pres: { label: 'Pres Link Buttons',  color: 'rgba(0,206,201,0.3)', baseTop: 480 }
  };
  
// editorPanel.js (global-style, preload-safe) with tab-docking-aware logic

window.editorPanel = {
	currentTileId: null,
	currentRectId: null,
	currentMode: 'main',

	init() {
		const closeBtn = document.getElementById('closeEditor');
		const saveBtn = document.getElementById('saveEditor');

		if (!closeBtn || !saveBtn) {
			console.warn('Editor buttons not found yet. Make sure editorPanel.init() is called after DOM is ready.');
			return;
		}

		closeBtn.addEventListener('click', () => {
			document.querySelector('.image-editor').classList.add('hidden');
		});

		saveBtn.addEventListener('click', async () => {
			const tileId = window.editorPanel.currentTileId;
			if (!tileId) return;

			const filename = `css/slide_${tileId}.css`;
			const rects = document.querySelectorAll('#editorRectsContainer .rect');
			const selectorMap = {};

			const existingCSS = await window.electronAPI.readRectCSS(filename);
			if (existingCSS) {
				const lines = existingCSS.split(/\n+/);
				let currentSel = '';
				lines.forEach(line => {
					const selMatch = line.match(/^([^{]+)\s*\{/);
					if (selMatch) {
						currentSel = selMatch[1].trim();
						selectorMap[currentSel] = {};
					} else if (currentSel) {
						const propMatch = line.match(/(top|left|width|height):\s*(\d+)px/);
						if (propMatch) {
							selectorMap[currentSel][propMatch[1]] = propMatch[2];
						}
					}
				});
			}

			rects.forEach(rect => {
				const sel = rect.dataset.selector;
				selectorMap[sel] = {
					top: Math.round(parseFloat(rect.style.top || '0')),
					left: Math.round(parseFloat(rect.style.left || '0')),
					width: Math.round(parseFloat(rect.style.width || '0')),
					height: Math.round(parseFloat(rect.style.height || '0')),
				};
			});

			let finalCSS = '';
			for (let sel in selectorMap) {
				const p = selectorMap[sel];
				finalCSS += `${sel} {\n  top: ${p.top}px;\n  left: ${p.left}px;\n  width: ${p.width}px;\n  height: ${p.height}px;\n}\n\n`;
			}

			await window.electronAPI.saveRectCSS(filename, finalCSS);
			document.querySelector('.image-editor').classList.add('hidden');
		});
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
		const index = $(e.currentTarget).data('index');
		const imagePath = $(e.currentTarget).data('img');
		const rectId = `${type}${index}`;
		const jsPath = `js/slide_${tileId}.js`;
	
		console.log('[Indicator Click]', { tileId, rectId, imagePath, type, jsPath });
	
		window.electronAPI.readAttachment(jsPath).then(jsContent => {
		  const tabMatch = jsContent.match(new RegExp(`\$\('#${type}-btn${index}'\)\.appendTo\('#tab(\d+)'\)`));
		  if (tabMatch) {
			const tabIndex = tabMatch[1];
			console.log('[Tab Match Found]', { tabIndex });
			window.editorPanel.open({ tileId, rectId: `tab${tabIndex}`, imagePath, type: 'tab' });
		  } else {
			console.log('[No Tab Match] Opening indicator directly');
			window.editorPanel.open({ tileId, rectId, imagePath, type });
		  }
		}).catch(err => {
		  console.warn('[readAttachment Error]', err);
		  console.log('[Fallback] Opening indicator directly');
		  window.editorPanel.open({ tileId, rectId, imagePath, type });
		});
	  },
	

	open: async function ({ tileId, rectId, imagePath, type }) {
		this.currentTileId = tileId;
		this.currentRectId = rectId;
		this.currentMode = type === 'tab' ? 'tab' : rectId ? 'indicator' : 'main';

		document.querySelector('.image-editor').classList.remove('hidden');
		document.getElementById('editorImage').src = imagePath;

		const container = document.getElementById('editorRectsContainer');
		container.innerHTML = '';

		let savedCSS = '';
		try {
			savedCSS = await window.electronAPI.readRectCSS(`css/slide_${tileId}.css`);
		} catch (err) {
			console.warn('No existing CSS file. Starting fresh.');
		}

		
		const styles = {};
		if (savedCSS) {
			const lines = savedCSS.split(/\n+/);
			let currentSel = '';
			lines.forEach(line => {
				const selMatch = line.match(/^([^{]+)\s*\{/);
				if (selMatch) {
					currentSel = selMatch[1].trim().replace(/\s+/g, ' ');
					styles[currentSel] = {};
				} else if (currentSel) {
					const propMatch = line.match(/(top|left|width|height):\s*(\d+)px/);
					if (propMatch) {
						styles[currentSel][propMatch[1]] = propMatch[2];
					}
				}
			});
		}

		function parseCSS(cssText) {
			const styles = {};
			if (!cssText) return styles;
			let currentSel = '';
			cssText.split(/\n+/).forEach(line => {
				const selMatch = line.match(/^([^{]+)\s*\{/);
				if (selMatch) {
					currentSel = selMatch[1].trim().replace(/\s+/g, ' ');
					styles[currentSel] = {};
				} else if (currentSel) {
					const propMatch = line.match(/(top|left|width|height):\s*(\d+)px/);
					if (propMatch) {
						styles[currentSel][propMatch[1]] = propMatch[2];
					}
				}
			});
			return styles;
		}
		
		function applySaved(rect, selector, styles) {
			const norm = selector.replace(/\s+/g, ' ').trim();
			const s = styles[norm];
			if (s) {
				rect.style.left = `${s.left}px`;
				rect.style.top = `${s.top}px`;
				rect.style.width = `${s.width}px`;
				rect.style.height = `${s.height}px`;
			}
		}

		if (type === 'tab') {
			const tabIndex = rectId.replace('tab', '');
			const attachedToTab = new Set();
		
			try {
				const jsPath = `js/slide_${tileId}.js`;
				const jsContent = await window.electronAPI.readAttachment(jsPath);
				jsContent.split('\n').forEach(line => {
					const match = line.match(/\$\('#(mod-btn\d+|ref-btn\d+)'\)\.appendTo\('#tab(\d+)'\)/);
					if (match && match[2] === tabIndex) {
						attachedToTab.add(match[1]);
					}
				});
			} catch (err) {
				console.warn('JS file missing or unreadable');
			}
		
			const savedCSS = await window.electronAPI.readRectCSS(`css/slide_${tileId}.css`);
			const styles = parseCSS(savedCSS); // helper below
		
			attachedToTab.forEach(btnId => {
				const selector = `#${btnId}`;
				const color = btnId.startsWith('ref') ? 'rgba(0,255,0,0.3)' : 'rgba(0,0,255,0.3)';
				const rect = window.editorPanel._createRect(btnId, selector, color);
				applySaved(rect, selector, styles);
				container.appendChild(rect);
			});
			return;
		}

		if (type === 'mod' || type === 'ref') {
			const bgSel = `#${rectId} .pop-bg`;
			const btnSel = `#${rectId} .close-btn`;
			const savedCSS = await window.electronAPI.readRectCSS(`css/slide_${tileId}.css`);
			const styles = parseCSS(savedCSS); // reuse same parser
		
			const bg = this._createRect('pop-bg', bgSel, 'rgba(255,165,0,0.3)');
			const btn = this._createRect('close-btn', btnSel, 'rgba(255,0,0,0.3)');
			applySaved(bg, bgSel, styles);
			applySaved(btn, btnSel, styles);
			container.appendChild(bg);
			container.appendChild(btn);
			return;
		}

		//const jsPath = `js/slide_${tileId}.js`;
		//const js = await window.electronAPI.readAttachment(jsPath);

		let js = '';
		try {
			js = await window.electronAPI.readAttachment(`js/slide_${tileId}.js`);
		} catch (err) {
			console.warn('No JS attachment file yet.');
		}

		const attachedToTab = new Set();
		if (js) {
			js.split('\n').forEach(line => {
				const match = line.match(/\$\('#(mod-btn\d+|ref-btn\d+)'\)\.appendTo\('#tab(\d+)'\)/);
				if (match) attachedToTab.add(match[1]);
			});
		}

		const assets = await window.electronAPI.getTileAssets(tileId);
		if (!type || type === 'main') {
			['mods', 'tabs', 'refs'].forEach(type => {
				assets[type].forEach((_, i) => {
					const id = `${type.slice(0, 3)}-btn${i + 1}`;
					if (attachedToTab.has(id)) return;
					const sel = `#${id}`;
					const color = type === 'ref' ? 'rgba(0,255,0,0.3)' : 'rgba(0,0,255,0.3)';
					const rect = window.editorPanel._createRect(id, sel, color);
					applySaved(rect, sel, styles);
					container.appendChild(rect);
				});
			});
		}
	},

	_createRect: function (id, selector, bgColor) {
		const rect = document.createElement('div');
		rect.className = 'rect draggable resizable';
		rect.dataset.selector = selector;
		rect.style.left = '100px';
		rect.style.top = '100px';
		rect.style.width = '100px';
		rect.style.height = '60px';
		rect.style.background = bgColor;
		const label = document.createElement('div');
		label.className = 'rect-label';
		label.innerText = id;
		rect.appendChild(label);
		window.makeDraggableResizable(rect);
		return rect;
	}
};

window.makeDraggableResizable = function (el) {
	interact(el)
		.draggable({
			listeners: {
				move(event) {
					const t = event.target;
					t.style.left = `${(parseFloat(t.style.left) || 0) + event.dx}px`;
					t.style.top = `${(parseFloat(t.style.top) || 0) + event.dy}px`;
				}
			}
		})
		.resizable({
			edges: { left: true, right: true, top: true, bottom: true },
			listeners: {
				move(event) {
					const t = event.target;
					t.style.width = `${event.rect.width}px`;
					t.style.height = `${event.rect.height}px`;
				}
			}
		});
};
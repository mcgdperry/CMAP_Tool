window.editorPanel = {
	currentTileId: null,
	currentRectId: null,
	currentMode: 'main',
	
	init() {
	  const closeBtn = document.getElementById('closeEditor');
	  const saveBtn = document.getElementById('saveEditor');
  
	  closeBtn.addEventListener('click', () => {
		document.querySelector('.image-editor').classList.add('hidden');
	  });
  
	  saveBtn.addEventListener('click', () => {
		const tileId = this.currentTileId;
		const mode = this.currentMode;
		const tabIndex = mode === 'tab' ? parseInt(this.currentRectId.replace('tab', '')) : null;
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
		});
  
		const tile = window.projectData.tiles[tileId];
		if (!tile) return;
		tile.rects = tile.rects || {};
  
		Object.keys(output).forEach(sel => {
		  tile.rects[sel] = output[sel];
		});
  
		alert('✔ Rectangles saved to projectData!');
		console.log('💾 Saved rects:', output);
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
	  window.editorPanel.open({ tileId, rectId, imagePath, type });
	},
  
	open({ tileId, rectId, imagePath, type }) {
	  this.currentTileId = tileId;
	  this.currentRectId = rectId;
	  this.currentMode = type === 'tab' ? 'tab' : rectId ? 'indicator' : 'main';
  
	  document.querySelector('.image-editor').classList.remove('hidden');
	  document.getElementById('editorImage').src = imagePath;
		

	  const container = document.getElementById('editorRectsContainer');
	  container.innerHTML = '';

	  const rectData = window.projectData.tiles[tileId]?.rects || {};
	  const imgFileName = imagePath?.split('/').pop() || 'N/A';
		
	  // Create the info UI
		const infoDiv = document.createElement('div');
		infoDiv.id = 'editor-info';
		infoDiv.innerHTML = `
		<div class="editor-meta">
			<strong>Tile ID:</strong> ${tileId}<br />
			<strong>Image:</strong> ${imgFileName}<br />
			<strong>Rects:</strong> ${Object.keys(rectData).length}
		</div>
		<div class="editor-buttons">
			<button id="add-mod-btn">+ Mod</button>
			<button id="add-ref-btn">+ Ref</button>
			<button id="add-tab-btn">+ Tab</button>
		</div>
		`;
		container.appendChild(infoDiv);
		
	  const rectStyles = window.projectManager.getTileRects(tileId, this.currentMode, rectId?.replace('tab', ''));
	  console.log('📐 Rect styles for mode', this.currentMode, rectStyles);
  
	  const tile = window.projectData.tiles[tileId];
	  const docked = tile?.docked || {};
	  const assets = tile?.images || {};
  
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
		});
		return;
	  }
  
	  let modIndex = 0, refIndex = 0, tabIndex = 0;
	  ['mods', 'refs', 'tabs'].forEach(type => {
		(assets[type] || []).forEach((_, i) => {
		  const id = `${type === 'tabs' ? 'tab' : `${type.slice(0, 3)}-btn`}${i + 1}`;
		  if (type !== 'tabs' && docked[id]) return; // skip if docked
		  const sel = `#${id}`;
		  const isRef = type === 'refs';
		  const baseTop = type === 'tabs' ? 500 : isRef ? 300 : 100;
		  const color = type === 'tabs'
			? 'rgba(255,255,0,0.3)'
			: isRef ? 'rgba(0,255,0,0.3)' : 'rgba(0,0,255,0.3)';
		  const group = type === 'tabs'
			? 'Tabs' : isRef ? 'Ref Buttons' : 'Modal Buttons';
		  const index = type === 'tabs'
			? tabIndex++ : isRef ? refIndex++ : modIndex++;
  
		  const rect = this._createRect(id, sel, color, index, baseTop, group);
		  this._applyStyle(rect, sel, rectStyles);
		  container.appendChild(rect);
		});
	  });
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
	  label.innerText = `${id}\n(${selector.split(' ')[0]})`;
	  rect.appendChild(label);
  
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
		document.getElementById('editorRectsContainer').appendChild(header);
	  }
  
	  window.makeDraggableResizable(rect);
	  return rect;
	},
  
	_applyStyle(rect, selector, styles) {
	  const s = styles?.[selector];
	  if (!s) return;
	  rect.style.top = `${s.top}px`;
	  rect.style.left = `${s.left}px`;
	  rect.style.width = `${s.width}px`;
	  rect.style.height = `${s.height}px`;
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
window.projectManager = {
	// 🔧 Helper: Return tileArr-style array from projectData
	getTileArr() {
		const tileArr = [];
	  
		Object.entries(projectData.tiles || {}).forEach(([tileId, tileData]) => {
		  const [col, row] = tileId.split('_').map(Number);
		  const rowIndex = row - 1; // ✅ Fix: subtract 1 for zero-based index
	  
		  if (!tileArr[col]) tileArr[col] = [];
		  tileArr[col][rowIndex] = tileData.label || `Slide ${col}-${row}`;
		});
	  
		return tileArr;
	  },
	  
	  getTileGrid() {
		const tileGrid = [];

		Object.keys(projectData.tiles || {}).forEach(tileId => {
			const [col, row] = tileId.split('_').map(Number);
			const rowIndex = row - 1;

			if (!tileGrid[col]) tileGrid[col] = [];
			tileGrid[col][rowIndex] = tileId;
		});

		return tileGrid;
		},
	// 🔧 Helper: Return all indicators (mods, refs, tabs) for a tileId
	getTileIndicators(tileId) {
	  const t = window.projectData.tiles?.[tileId];
	  if (!t) return { mods: [], refs: [], tabs: [] };
	  return {
		mods: t.images?.mods || [],
		refs: t.images?.refs || [],
		tabs: t.images?.tabs || []
	  };
	},
  
	// 🔧 Helper: Return all rects for a tileId (from JSON)
	getTileRects(tileId) {
	  return window.projectData.tiles?.[tileId]?.rects || {};
	},
  
	// 📄 Read slide_XX_YY.js file (for docking info)
	async readTileJS(tileId) {
	  const filename = `js/slide_${tileId}.js`;
	  return await window.electronAPI.readAttachment(filename);
	},
  
	// 📄 Save line to slide_XX_YY.js (used for docking)
	async saveTileJS(tileId, line, append = false) {
	  const filename = `js/slide_${tileId}.js`;
	  return await window.electronAPI.saveAttachment(filename, line, append);
	},
  
	// ❌ Remove lines containing string from slide_XX_YY.js
	async removeLinesFromTileJS(tileId, match) {
	  const filename = `js/slide_${tileId}.js`;
	  return await window.electronAPI.removeLinesContaining(filename, match);
	},
  
	// 📄 Read tile CSS
	async readTileCSS(tileId) {
	  const filename = `css/slide_${tileId}.css`;
	  return await window.electronAPI.readRectCSS(filename);
	},
  
	// 💾 Save tile CSS
	async saveTileCSS(tileId, cssText) {
	  const filename = `css/slide_${tileId}.css`;
	  return await window.electronAPI.saveRectCSS(filename, cssText);
	},
  
	// 📷 Get assets for tile from Electron (screens folder)
	async getTileAssets(tileId) {
	  return await window.electronAPI.getTileAssets(tileId);
	},
  
	// 📄 Save any general attachment (export json, etc.)
	async saveAttachment(name, content, append = false) {
	  return await window.electronAPI.saveAttachment(name, content, append);
	},
  
	// 📄 Read any file (safe fallback to "")
	async readAttachment(name) {
	  return await window.electronAPI.readAttachment(name);
	}
  };
  
  window.projectManager = window.projectManager || {};

  window.projectManager.shiftRectsDown = async function (type, tileId, deletedIndex) {
	const tile = window.projectData.tiles[tileId];
	if (!tile) return;
  
	const usesImage = ['mod', 'ref', 'tab'].includes(type);
	const ext = type === 'tab' ? '.jpg' : '.png';
	const prefix = `${type}-btn`;
	const imageKey = type === 'mod' ? 'mods' : type === 'ref' ? 'refs' : 'tabs';
  
	const updatedRects = {};
	const updatedImages = [];
	const updatedDocked = {};
  
	const rectEntries = Object.entries(tile.rects || {})
	  .filter(([sel]) => sel.startsWith(`#${prefix}`))
	  .sort(([a], [b]) => {
		const ai = parseInt(a.match(/\d+/)?.[0]);
		const bi = parseInt(b.match(/\d+/)?.[0]);
		return ai - bi;
	  });
  
	for (const [selector, rectData] of rectEntries) {
	  const num = parseInt(selector.match(/\d+/)?.[0]);
	  const baseId = selector.replace('#', '');
  
	  if (num < deletedIndex) {
		updatedRects[selector] = rectData;
		if (usesImage) {
			updatedImages.push(`screens/slide_${tileId}_${type}${num}${ext}`);
		}
		if (tile.docked?.[baseId]) {
		  updatedDocked[baseId] = tile.docked[baseId];
		}
	  } else if (num > deletedIndex) {
		const newNum = num - 1;
		const newSelector = `#${prefix}${newNum}`;
		const newBaseId = `${prefix}${newNum}`;

		if (usesImage) {
			const oldPath = `screens/slide_${tileId}_${type}${num}${ext}`;
			const newPath = `screens/slide_${tileId}_${type}${newNum}${ext}`;
  
			// Only rename if image exists
			const exists = await window.electronAPI.fileExists(oldPath);
			if (exists) {
		 		await window.electronAPI.renameFile(oldPath, newPath);
		  		updatedImages.push(newPath);
			} else {
		  		updatedImages.push('images/placeholder.png');
			}
		}
  
		updatedRects[newSelector] = { ...rectData };
  
		// 🔁 Also shift docking
		if (tile.docked?.[baseId]) {
		  updatedDocked[newBaseId] = tile.docked[baseId];
		}
  
		// 🔁 Update label in editor if DOM element is present
		const rectEl = document.querySelector(`.rect[data-selector="${selector}"]`);
		if (rectEl) {
		  rectEl.dataset.selector = newSelector;
		  const label = rectEl.querySelector('.rect-label');
		  if (label) label.innerText = `${tileId} ${newBaseId}\n(${newBaseId})`;
		}
	  }
	  // else — deleted one — skip
	}
  
	tile.rects = {
	  ...Object.fromEntries(
		Object.entries(tile.rects).filter(([sel]) => !sel.startsWith(`#${prefix}`))
	  ),
	  ...updatedRects
	};

	if (usesImage) {
		tile.images[imageKey] = updatedImages;
	}
	tile.docked = {
	  ...Object.fromEntries(
		Object.entries(tile.docked || {}).filter(([k]) => !k.startsWith(prefix))
	  ),
	  ...updatedDocked
	};
  
	if (window.tileRenderer?.showTiles) {
	  window.tileRenderer.showTiles(window.projectData, window.tileRenderer.isVerticalLayout);
	}
  };
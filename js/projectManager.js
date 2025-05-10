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

	window.projectManager.shiftRectsDown = function (type, tileId, deletedIndex) {
	const tile = window.projectData.tiles[tileId];
	if (!tile) return;

	const ext = type === 'tab' ? '.jpg' : '.png';
	const prefix = `${type}-btn`;
	const imageKey = type === 'mod' ? 'mods' : type === 'ref' ? 'refs' : 'tabs';

	const updatedRects = {};
	const updatedImages = [];

	const rectEntries = Object.entries(tile.rects || {});
	const sorted = rectEntries
		.filter(([sel]) => sel.startsWith(`#${prefix}`))
		.sort(([a], [b]) => {
		const ai = parseInt(a.match(/\d+/)?.[0]);
		const bi = parseInt(b.match(/\d+/)?.[0]);
		return ai - bi;
		});

	let shiftCount = 1;
	for (const [selector, rectData] of sorted) {
		const num = parseInt(selector.match(/\d+/)?.[0]);
		if (num > deletedIndex) {
		const newNum = num - 1;
		const newId = `${prefix}${newNum}`;
		const newSelector = `#${newId}`;

		// Rename image file
		const oldPath = `screens/slide_${tileId}_${type}${num}${ext}`;
		const newPath = `screens/slide_${tileId}_${type}${newNum}${ext}`;
		window.electronAPI.renameFile(oldPath, newPath);

		// Update image list
		updatedImages.push(newPath);

		// Update rect data
		updatedRects[newSelector] = { ...rectData };
		} else if (num < deletedIndex) {
		updatedRects[selector] = rectData;
		updatedImages.push(`screens/slide_${tileId}_${type}${num}${ext}`);
		}
		// else (deleted one): skip it
	}

	tile.rects = {
		...Object.fromEntries(
		Object.entries(tile.rects).filter(([sel]) => !sel.startsWith(`#${prefix}`))
		),
		...updatedRects
	};
	tile.images[imageKey] = updatedImages;

	// ✅ Optional: trigger layout re-render
	if (window.tileRenderer?.showTiles) {
		window.tileRenderer.showTiles(window.projectData, window.tileRenderer.isVerticalLayout);
	}
	
	};
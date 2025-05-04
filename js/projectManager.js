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
  
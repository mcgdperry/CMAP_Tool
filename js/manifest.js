window.manifest = {
	generateText() {
	  const brand = $('#inp-brandname').val().trim() || 'Brand';
	  const tileGrid = window.projectManager.getTileGrid(); // ✅ use new helper

		return tileGrid.map((column, colIndex) =>
			column.map((tileId, rowIndex) => {
			const label = window.projectData.tiles[tileId]?.label?.trim() || `Slide ${colIndex}-${rowIndex + 1}`;
			return `${brand}_${tileId}|${label}`;
			}).join('\n')
		).join('\n');
	  /*const tileArr = window.projectManager.getTileArr();
  
	  return tileArr.map((column, colIndex) =>
		column.map((tileId, rowIndex) => {
		  const label = window.projectData.tiles[tileId]?.label?.trim() || `Slide ${colIndex}-${rowIndex + 1}`;
		  return `${brand}_${tileId}|${label}`;
		}).join('\n')
	  ).join('\n');*/
	},
  
	updatePreview() {
	  const previewEl = document.getElementById('manifest-preview-content');
	  if (previewEl) {
		previewEl.textContent = window.manifest.generateText();
	  }
	},
  
	async save() {
	  const manifestText = window.manifest.generateText();
	  await window.electronAPI.generateManifest(manifestText);
	},
  
	init() {
	  $('#gen-btn').on('click', () => {
		window.manifest.save();
	  });
  
	  $('#inp-brandname').on('input', () => {
		window.manifest.updatePreview();
	  });
  
	  // 📂 Open Manifest
	  $('#open-btn').on('click', async function () {
		const result = await window.electronAPI.openManifest();
		if (result.canceled) return;
  
		const lines = result.content.trim().split('\n');
		if (!lines.length) return;
  
		const brandMatch = lines[0].match(/^(.+?)_\d+_\d+\|/);
		const brandName = brandMatch ? brandMatch[1] : 'Brand';
		$('#inp-brandname').val(brandName);
  
		// Reset projectData.tiles
		window.projectData.tiles = {};
  
		lines.forEach(line => {
		  const match = line.match(/^(.+?)_(\d+)_(\d+)\|(.+)$/);
		  if (!match) return;
  
		  const [, , colStr, rowStr, label] = match;
		  const col = parseInt(colStr);
		  const row = parseInt(rowStr);
		  const tileId = `${col}_${row.toString().padStart(2, '0')}`;
  
		  window.projectData.tiles[tileId] = {
			label,
			images: {
				modCount: tile.images.mods?.length || 0,
				refCount: tile.images.refs?.length || 0,
				tabCount: tile.images.tabs?.length || 0
			  },
			docked: {},
			rects: {}
		  };

		  for (const tileId in projectData.tiles) {
			const tile = projectData.tiles[tileId];
			if (tile.images) {
			  tile.images.modCount = tile.images.mods?.length || 0;
			  tile.images.refCount = tile.images.refs?.length || 0;
			  tile.images.tabCount = tile.images.tabs?.length || 0;
			  delete tile.images.mods;
			  delete tile.images.refs;
			  delete tile.images.tabs;
			}
		  }
		});
  
		// Show tiles
		if (window.tileRenderer?.showTiles) {
		  window.tileRenderer.showTiles(window.projectData, window.isVerticalLayout);
		}
  
		// Update preview
		if (window.previewPane?.update) {
		  window.previewPane.update();
		}
	  });
	}
  };
  
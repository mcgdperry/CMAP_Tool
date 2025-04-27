window.manifest = {
	generateText(tileArr, brandName) {
	  const brand = brandName.trim() || 'Brand';
	  return tileArr.map((column, colIndex) =>
		column.map((label, rowIndex) => {
		  const tileId = `${colIndex}_${(rowIndex + 1).toString().padStart(2, '0')}`;
		  const display = label.trim() || `Slide ${colIndex}-${rowIndex + 1}`;
		  return `${brand}_${tileId}|${display}`;
		}).join('\n')
	  ).join('\n');
	},
  
	updatePreview(tileArr, brandName) {
	  const previewEl = document.getElementById('manifest-preview-content');
	  if (previewEl) {
		previewEl.textContent = window.manifest.generateText(tileArr, brandName);
	  }
	},
  
	async save(tileArr, brandName) {
	  const text = window.manifest.generateText(tileArr, brandName);
	  await window.electronAPI.generateManifest(text);
	},
  
	init(tileArr) {
		$('#gen-btn').on('click', () => {
			const brand = $('#inp-brandname').val().trim() || 'Brand';
			window.manifest.save(tileArr, brand);
		});
	
		$('#inp-brandname').on('input', () => {
			const brand = $('#inp-brandname').val().trim() || 'Brand';
			window.manifest.updatePreview(tileArr, brand);
		});
  
	  // "Open Manifest" to restore tiles from file
		$('#open-btn').on('click', async function () {
			const result = await window.electronAPI.openManifest();
			if (result.canceled) return;
		
			const lines = result.content.trim().split('\n');
			if (lines.length === 0) return;
		
			const brandMatch = lines[0].match(/^(.+?)_\d+_\d+\|/);
			const brandName = brandMatch ? brandMatch[1] : 'Brand';
			$('#inp-brandname').val(brandName);
		
			tileArr.length = 0; // reset
			lines.forEach(line => {
			const match = line.match(/^.+?_(\d+)_(\d+)\|(.+)$/);
			if (!match) return;
		
			const col = parseInt(match[1]);
			const row = parseInt(match[2]) - 1;
			const label = match[3];
		
			if (!tileArr[col]) tileArr[col] = [];
			tileArr[col][row] = label;
			});
		
			if (window.tileRenderer?.showTiles) {
			window.tileRenderer.showTiles(tileArr, false);
			}
		});
	}
  };
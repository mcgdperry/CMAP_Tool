// previewPane.js

export function initPreviewPane(tileArr, brandInputSelector, previewSelector) {
	const brandInput = document.querySelector(brandInputSelector);
	const previewContent = document.querySelector(previewSelector);
  
	function updatePreview() {
	  const brandName = brandInput.value.trim() || 'Brand';
	  let content = '';
	  tileArr.forEach((column, colIndex) => {
		column.forEach((tile, rowIndex) => {
		  const tileId = `${colIndex}_${(rowIndex + 1).toString().padStart(2, '0')}`;
		  const displayId = tile.trim() || `Slide ${colIndex}-${rowIndex + 1}`;
		  content += `${brandName}_${tileId}|${displayId}\n`;
		});
	  });
	  previewContent.textContent = content;
	}
  
	brandInput.addEventListener('input', updatePreview);
	return updatePreview;
  }
  
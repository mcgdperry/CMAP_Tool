// previewPane.js

window.previewPane = {
	init(tileArr) {
	  this.tileArr = tileArr;
  
	  // Update preview when typing in brand name
	  $(document).on('input', '#inp-brandname', () => {
		this.update();
	  });
  
	  // Copy manifest text to clipboard
	  $('#copy-manifest').on('click', () => {
		const text = $('#manifest-preview-content').text();
		navigator.clipboard.writeText(text).then(() => {
		  const btn = $('#copy-manifest');
		  btn.text('✅ Copied!');
		  btn.css({ transform: 'scale(1.2)', color: '#4caf50' }); // little zoom and green color
	  
		  setTimeout(() => {
			btn.text('📋');
			btn.css({ transform: 'scale(1)', color: '' }); // reset
		  }, 1000);
		});
	  });
	  
	  // Show/hide ONLY the content (NOT the header
	  
	  $(document).on('click', '#toggle-preview-btn', function () {
		const content = $('#manifest-preview-content');
		const isVisible = content.is(':visible');
  
		if (isVisible) {
		  content.slideUp(200);
		 // $(this).fadeOut(100, function () {
		 //$(this).text(content.is(':visible') ? 'Show' : 'Hide').fadeIn(100);
		  $(this).text('Show');
		} else {
		  content.slideDown(200);
		  $(this).text('Hide');
		}
	  });
	  // Show/hide entire manifest panel
	  $(document).on('click', '#toggle-manifest', function () {
		$('#manifest-preview-content').toggle();
	  });
  
	  // Initial preview
	  this.update();
	},
  
	update() {
	  if (!this.tileArr) return;
  
	  const brandName = $('#inp-brandname').val().trim() || 'Brand';
	  let previewContent = '';
  
	  this.tileArr.forEach((column, colIndex) => {
		column.forEach((tile, rowIndex) => {
		  const tileId = `${colIndex}_${(rowIndex + 1).toString().padStart(2, '0')}`;
		  const displayId = tile.trim() || `Slide ${colIndex}-${rowIndex + 1}`;
		  previewContent += `${brandName}_${tileId}|${displayId}\n`;
		});
	  });
  
	  $('#manifest-preview-content').text(previewContent);
	}
  };

  $(function () {
	const panel = document.getElementById('manifest-preview-panel');
	const header = document.getElementById('manifest-preview-header');
	
	let offsetX = 0, offsetY = 0, isDragging = false;
	
	header.addEventListener('mousedown', e => {
	  isDragging = true;
	  offsetX = e.clientX - panel.offsetLeft;
	  offsetY = e.clientY - panel.offsetTop;
	  document.body.style.userSelect = 'none'; // prevents text highlighting while dragging
	});
  
	document.addEventListener('mousemove', e => {
	  if (isDragging) {
		panel.style.left = `${e.clientX - offsetX}px`;
		panel.style.top = `${e.clientY - offsetY}px`;
		panel.style.right = 'auto';
		panel.style.bottom = 'auto';
	  }
	});
  
	document.addEventListener('mouseup', () => {
	  isDragging = false;
	  document.body.style.userSelect = '';
	});

	//this is supposed to make the panel snap back onscreen if dragged off, but not currently seeing it work
	document.addEventListener('mouseup', () => {
		if (!isDragging) return;
	  
		const panel = document.getElementById('manifest-preview-panel');
		const rect = panel.getBoundingClientRect();
		const padding = 10; // small buffer from edges
	  
		const windowWidth = window.innerWidth;
		const windowHeight = window.innerHeight;
	  
		let newLeft = rect.left;
		let newTop = rect.top;
	  
		if (rect.left < padding) newLeft = padding;
		if (rect.top < padding) newTop = padding;
		if (rect.right > windowWidth - padding) newLeft = windowWidth - rect.width - padding;
		if (rect.bottom > windowHeight - padding) newTop = windowHeight - rect.height - padding;
	  
		panel.style.left = `${newLeft}px`;
		panel.style.top = `${newTop}px`;
	  });

	  	const previewContent = document.getElementById('manifest-preview-content');
	  	previewContent.setAttribute('contenteditable', 'true');
	  	previewContent.style.whiteSpace = 'pre'; // Preserve line breaks

	  	previewContent.addEventListener('blur', syncPreviewToTiles);

		previewContent.addEventListener('keydown', function(e) {
			if (e.key === 'Enter') {
				e.preventDefault(); // prevent inserting newlines
				syncPreviewToTiles();
				previewContent.blur(); // exit editing mode
			}
		});

		function syncPreviewToTiles() {
			const lines = previewContent.innerText.trim().split('\n');
		  
			lines.forEach(line => {
			  const match = line.match(/^.+?_(\d+)_(\d+)\|(.+)$/);
			  if (!match) return;
		  
			  const col = parseInt(match[1]);
			  const row = parseInt(match[2]) - 1;
			  const label = match[3];
		  
			  const tile = document.querySelector(`#tile-${col}-${row}`);
			  if (tile) {
				const input = tile.querySelector('.tile-input');
				if (input) {
				  input.value = label;
				  window.tileArr[col][row] = label; // also update tileArr!
				}
			  }
			});
		  
			// Refresh preview from current tile values (clean formatting)
			window.previewPane.update();
		}
  });
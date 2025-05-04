window.previewPane = {
	init() {
	  const panel = document.getElementById('manifest-preview-panel');
	  const header = document.getElementById('manifest-preview-header');
  
	  // Drag panel
	  let offsetX = 0, offsetY = 0, isDragging = false;
	  header.addEventListener('mousedown', e => {
		isDragging = true;
		offsetX = e.clientX - panel.offsetLeft;
		offsetY = e.clientY - panel.offsetTop;
		document.body.style.userSelect = 'none';
	  });
	  document.addEventListener('mouseup', () => {
		isDragging = false;
		document.body.style.userSelect = '';
	  });
	  document.addEventListener('mousemove', e => {
		if (!isDragging) return;
		panel.style.left = `${e.clientX - offsetX}px`;
		panel.style.top = `${e.clientY - offsetY}px`;
	  });
  
	  // Toggle preview content
	  $('#toggle-preview-btn').on('click', function () {
		const content = $('#manifest-preview-content');
		content.slideToggle(200);
		$(this).text(content.is(':visible') ? 'Hide' : 'Show');
	  });
  
	  // Sync brand name on input
	  $(document).on('input', '#inp-brandname', () => {
		this.update();
	  });
  
	  // Copy manifest to clipboard
	  $('#copy-manifest').on('click', () => {
		const text = $('#manifest-preview-content').text();
		navigator.clipboard.writeText(text);
		const btn = $('#copy-manifest').text('✅ Copied!').css({ transform: 'scale(1.2)', color: '#4caf50' });
		setTimeout(() => {
		  btn.text('📋').css({ transform: 'scale(1)', color: '' });
		}, 1000);
	  });
  
	  // Make preview editable
	  const previewContent = document.getElementById('manifest-preview-content');
	  previewContent.setAttribute('contenteditable', 'true');
	  previewContent.style.whiteSpace = 'pre';
  
	  previewContent.addEventListener('blur', () => this.syncToTiles(previewContent.innerText));
	  previewContent.addEventListener('keydown', e => {
		if (e.key === 'Enter') {
		  e.preventDefault();
		  this.syncToTiles(previewContent.innerText);
		  previewContent.blur();
		}
	  });
  
	  this.update();
	},
  
	update() {
	  if (!window.projectData || !window.projectData.tiles) return;
  
	  const brand = $('#inp-brandname').val().trim() || 'Brand';
	  const tileArr = window.projectManager.getTileArr();
  
	  const lines = tileArr.map((col, colIndex) =>
		col.map((label, rowIndex) => {
		  const tileId = `${colIndex}_${(rowIndex + 1).toString().padStart(2, '0')}`;
		  return `${brand}_${tileId}|${label}`;
		}).join('\n')
	  ).join('\n');
  
	  $('#manifest-preview-content').text(lines);
	},
  
	syncToTiles(text) {
	  if (!text || !window.projectData || !window.projectData.tiles) return;
	  const lines = text.trim().split('\n');
  
	  lines.forEach(line => {
		const match = line.match(/^.+?_(\d+)_(\d+)\|(.+)$/);
		if (!match) return;
		const col = parseInt(match[1]);
		const row = parseInt(match[2]);
		const label = match[3];
		const tileId = `${col}_${row.toString().padStart(2, '0')}`;
  
		if (window.projectData.tiles[tileId]) {
		  window.projectData.tiles[tileId].label = label;
  
		  // Update DOM input
		  const input = document.querySelector(`#tile-${col}-${row} .tile-input`);
		  if (input) input.value = label;
		}
	  });
  
	  this.update();
	}
  };
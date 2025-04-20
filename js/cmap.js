(function(CMAP, $, undefined)
{
	var num;
	
	CMAP.loadData = function()
	{
		
	}
	
	$(function()
	{	
		$('#bg1').append('<input type="text" id="inp-brandname" maxlength="30" name="brandname" placeholder="Name of brand">');
		$('#bg1').append(`
			<div id="zoom-controls">
			  <label>Scale: <input type="range" id="scale-slider" min="50" max="150" value="100">%</label>
			  <label><input type="checkbox" id="zoom-to-fit"> Zoom to Fit</label>
			</div>
		`);
		$('#bg1').append('<button id="screens-btn">Import Screens</button>');
		$('#bg1').append('<div id="open-btn">Open Manifest</div>');
		$('#bg1').append('<div id="gen-btn">Generate Manifest</div>');
		$('#bg1').append('<button id="switch-btn">Switch Layout</button>');
		$('#bg1').append('<textarea id="preview-pane" readonly></textarea>');
		$('#bg1').append('<div class="image-editor hidden"><div class="editor-header"><button id="closeEditor">✕</button><button id="saveEditor">Save</button></div><div class="editor-canvas"><img id="editorImage" src="" class="editor-image" /><div id="editorRectsContainer"></div></div></div>');
		var tileArr = [];
		var started = false;
		var isVerticalLayout = false;
		$('#bg1').append('<div id="tile-cont"></div>');
		$('#bg1').on('click', function () {
			if (!started) {
				tileArr.push([""]);
				started = true;
				showTiles();
			}
		});
		function formatTileId(col, row) {
			return `${col}_${(row + 1).toString().padStart(2, '0')}`;
		}
		function updatePreview() {
			let brandName = $('#inp-brandname').val().trim() || 'Brand';
			let previewContent = '';
			tileArr.forEach((column, colIndex) => {
				column.forEach((tile, rowIndex) => {
					let tileId = `${colIndex}_${(rowIndex + 1).toString().padStart(2, '0')}`;
					let displayId = tile.trim() || 'Slide '+colIndex+'-'+(rowIndex+1);
					previewContent += `${brandName}_${tileId}|${displayId}\n`;
				});
			});
			$('#manifest-preview-content').text(previewContent);
		}
		function showTiles() {
			let tileValues = {};
			$('.tile').each(function () {
				let col = $(this).data('col');
				let row = $(this).data('row');
				let tileId = formatTileId(col, row);
				tileValues[tileId] = $(this).find('.tile-input').val();
			});
			$('#tile-cont').empty();
			for (let col = 0; col < tileArr.length; col++) {
				let isLastColumn = (col === tileArr.length - 1);
				let lastSubTileIndex = tileArr[col].length - 1;
				for (let row = 0; row < tileArr[col].length; row++) {
					let isBottomTile = (row === lastSubTileIndex);
					let tileId = formatTileId(col, row);
					let savedValue = tileValues[tileId] || tileArr[col][row];
					let leftPos = isVerticalLayout ? (row * 130) + 5 : (col * 130) + 5;
					let topPos = isVerticalLayout ? (col * 110) + 5 : (row * 110) + 5;
					let btnClass = isVerticalLayout ? 'vt' : 'hz';
					let thumbnailSrc = null;
					let indicatorsHtml = '';
					window.electronAPI.getTileAssets(tileId).then(assets => {
						if (assets.thumb) {
							thumbnailSrc = assets.thumb;
						}
						if (assets.tabs.length || assets.mods.length || assets.refs.length) {
							indicatorsHtml += `<div class="tile-indicators">`;
							assets.tabs.forEach((tab, idx) => {
								indicatorsHtml += `<div class="circle blue" data-img="${tab}" data-type="tab" data-index="${idx+1}" data-tileid="${tileId}">T</div>`;
							});
							assets.mods.forEach((mod, idx) => {
								indicatorsHtml += `<div class="circle blue" data-img="${mod}" data-type="mod" data-index="${idx+1}" data-tileid="${tileId}">M</div>`;
							});
							assets.refs.forEach((ref, idx) => {
								indicatorsHtml += `<div class="circle green" data-img="${ref}" data-type="ref" data-index="${idx+1}" data-tileid="${tileId}">R</div>`;
							});
							indicatorsHtml += `</div>`;
						}
						let hasContent = thumbnailSrc || assets.tabs.length || assets.mods.length || assets.refs.length;
						let expandableClass = hasContent ? 'expandable' : '';
						let tile = $(`
							<div id="tile-${col}-${row}" class="tile ${expandableClass} ${row === 0 ? 'main-tile' : 'sub-tile'}" 
								data-col="${col}" data-row="${row}" 
								style="left: ${leftPos}px; top: ${topPos}px;">
								<input type="text" class="tile-input" placeholder="${tileId}" value="${savedValue}" />
								<div class="tile-thumbnail" data-tileid="${tileId}" data-img="${thumbnailSrc}">${thumbnailSrc ? `<img src="${thumbnailSrc}" alt="thumb">` : ''}</div>
								${indicatorsHtml}
								${isLastColumn && row === 0 ? `<div class="tile-btn right-btn ${btnClass}" data-col="${col}"></div>` : ''}
								${isBottomTile ? `<div class="tile-btn down-btn ${btnClass}" data-col="${col}"></div>` : ''}
								<div class="tile-btn del-btn" data-col="${col}" data-row="${row}"></div>
							</div>
						`);
						$('#tile-cont').append(tile);
					});
				}
			}
			updatePreview();
			if ($('#zoom-to-fit').prop('checked')) {
				zoomToFit();
			}
		}
		$(document).on('click', '.tile-thumbnail', function () {
			const tileId = $(this).data('tileid');
			const imagePath = $(this).data('img');
			window.openImageEditor({ tileId, rectId: null, imagePath });
		});
		$(document).on('click', '.circle', function () {
			const tileId = $(this).data('tileid');
			const type = $(this).data('type');
			const index = $(this).data('index');
			const imagePath = $(this).data('img');
			const rectId = `${type}${index}`;
			window.openImageEditor({ tileId, rectId, imagePath });
		});






		$(document).on('input', '.tile-input', function () {
			let col = $(this).closest('.tile').data('col');
			let row = $(this).closest('.tile').data('row');
			tileArr[col][row] = $(this).val();
			updatePreview();
		});
		$(document).on('input', '#inp-brandname', function () {
			updatePreview();
		});
		$(document).on('click', '.right-btn', function () {
			var col = parseInt($(this).data('col'));
			if (col === tileArr.length - 1) {
				tileArr.push([""]); // Add new column
				showTiles();
			}
		});

		$(document).on('click', '.down-btn', function () {
			var col = parseInt($(this).data('col'));
			tileArr[col].push(""); // Add tile to column
			showTiles();
		});

		$(document).on('click', '#gen-btn', function () {
			let brandName = $('#inp-brandname').val().trim() || 'Brand';
			let fileContent = '';

			tileArr.forEach((column, colIndex) => {
				column.forEach((tile, rowIndex) => {
					let tileId = formatTileId(colIndex, rowIndex);
					let displayId = tile.trim() || 'Slide '+colIndex+'-'+(parseInt(rowIndex)+1);
					fileContent += `${brandName}_${tileId}|${displayId}\n`;
				});
			});
			/*
			let blob = new Blob([fileContent], { type: 'text/plain' });
			let a = document.createElement('a');
			a.href = URL.createObjectURL(blob);
			a.download = 'presManifest.txt';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			*/
			window.electronAPI.generateManifest(fileContent);
		});

		$(document).on('click', '.del-btn', function () {
			var col = parseInt($(this).data('col'));
			var row = parseInt($(this).data('row'));

			if (row === 0) {
				tileArr.splice(col, 1);
			} else {
				tileArr[col].splice(row, 1);
			}

			showTiles();
		});
		
		let $preview = $('<div id="tile-hover-preview"></div>').appendTo('#bg1').hide();

		// When you hover over a circle, show the preview
		$(document).on('mouseenter', '.circle', function (e) {
			const imgPath = $(this).data('img');
			if (!imgPath) return;

			$preview.html(`<img src="${imgPath}" alt="preview">`).show();
		});

		// Track mousemove to follow the cursor
		$(document).on('mousemove', '.circle', function (e) {
			const imgPath = $(this).data('img');
			if (!imgPath) return;

			const offsetX = 120;  // Distance right of cursor
			const offsetY = 200;  // Distance below cursor

			$preview.css({
				top: `${e.pageY - offsetY}px`,
				left: `${e.pageX - offsetX}px`,
				display: 'block'
			});
		});

		// On leave, hide the preview
		$(document).on('mouseleave', '.circle', function () {
			$preview.hide().empty();
		});
		

		$(document).on('click', '#switch-btn', function () {
			isVerticalLayout = !isVerticalLayout;
			showTiles();
		});

		$(document).on('click', '#toggle-preview-btn', function () {
			const content = $('#manifest-preview-content');
			const isVisible = content.is(':visible');
		  
			if (isVisible) {
			  content.slideUp(200);
			  $(this).text('Show');
			} else {
			  content.slideDown(200);
			  $(this).text('Hide');
			}
		});
		
		$('#screens-btn').on('click', async () => {
			console.log('Screens button clicked');
		  
			const result = await window.electronAPI.selectScreensFolder();
			if (result.canceled || !result.filePaths.length) {
			  console.log('User canceled folder selection.');
			  return;
			}
		  
			const selectedFolder = result.filePaths[0];
			console.log('Selected folder:', selectedFolder);
		  
			const appDir = await window.electronAPI.getAppDir();
			console.log('App dir:', appDir);
		  
			const importResult = await window.electronAPI.importScreens(selectedFolder, appDir);
			console.log('Import result:', importResult);
		  
			if (importResult.success) {
				showTiles();
			  	alert('Screens imported successfully.');
			} else {
			  alert('Error importing screens: ' + (importResult.error || 'Unknown error'));
			}
		  });
		  

		$('#copy-manifest').on('click', () => {
			const text = $('#manifest-preview-content').text();
			navigator.clipboard.writeText(text).then(() => {
			  $('#copy-manifest').text('✅');
			  setTimeout(() => $('#copy-manifest').text('📋'), 1000);
			});
		});
		  
		  // Toggle show/hide
		$('#toggle-manifest').on('click', () => {
			const panel = $('#manifest-preview-panel');
			panel.toggle();
		});
		  
		  // Drag to move
		const panel = document.getElementById('manifest-preview-panel');
		const header = document.getElementById('manifest-preview-header');
		
		let offsetX = 0, offsetY = 0, isDragging = false;
		
		header.addEventListener('mousedown', e => {
			isDragging = true;
			offsetX = e.clientX - panel.offsetLeft;
			offsetY = e.clientY - panel.offsetTop;
			document.body.style.userSelect = 'none';
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

		$(document).on('click', '#open-btn', async function () {
			const result = await window.electronAPI.openManifest();
			if (result.canceled) return;
		  
			const lines = result.content.trim().split('\n');
			if (lines.length === 0) return;
		  
			$('#tile-cont').empty();
			const brandMatch = lines[0].match(/^(.+?)_\d+_\d+\|/);
			const brandName = brandMatch ? brandMatch[1] : 'Brand';
			$('#inp-brandname').val(brandName);
		  
			tileArr = []; // Reset
			lines.forEach(line => {
				const match = line.match(/^.+?_(\d+)_(\d+)\|(.+)$/);
				if (!match) return;
			
				const col = parseInt(match[1]);
				const row = parseInt(match[2]) - 1;
				const label = match[3];
			
				if (!tileArr[col]) tileArr[col] = [];
				tileArr[col][row] = label;
			});
		  
			started = true;
			showTiles();
		});

		function updateScale(scalePercent) {
			const scale = scalePercent / 100;
			$('#tile-cont').css('transform', `scale(${scale})`);
		}
		  
		function zoomToFit() {
			if (!tileArr.length || !$('#zoom-to-fit').prop('checked')) return;
		  
			const cols = tileArr.length;
			const rows = Math.max(...tileArr.map(col => col.length));
		  
			const container = $('#tile-cont');
			const availableWidth = container.width();
			const availableHeight = container.height();
		  
			const requiredWidth = (cols * 130) + 10;
			const requiredHeight = (rows * 110) + 10;
		  
			const scaleW = availableWidth / requiredWidth;
			const scaleH = availableHeight / requiredHeight;
			const newScale = Math.min(scaleW, scaleH, 1);
		  
			$('#scale-slider').val(Math.round(newScale * 100));
			updateScale(newScale * 100);
		}
	

		$('#scale-slider').on('input', function () {
			const val = $(this).val();
			updateScale(val);
			$('#zoom-to-fit').prop('checked', false); // turn off Zoom to Fit if user manually scales
		});
	  
		$('#zoom-to-fit').on('change', function () {
			if (this.checked) {
			zoomToFit();
			}
		});

		let currentTileId = null;
		let currentRectId = null;
		let currentMode = 'main';

		window.openImageEditor = async function({ tileId, rectId, imagePath }) {
			console.log('Opening editor in mode:', currentMode);
			console.log('Tile ID:', tileId);
			console.log('Rect ID:', rectId);
			console.log('Image Path:', imagePath);
			currentTileId = tileId;
			currentRectId = rectId;
			currentMode = rectId ? 'indicator' : 'main';

			document.querySelector('.image-editor').classList.remove('hidden');
			document.getElementById('editorImage').src = imagePath;

			const container = document.getElementById('editorRectsContainer');
			container.innerHTML = '';

			let savedCSS = await window.electronAPI.readRectCSS(`css/slide_${tileId}.css`);
			let styles = {};
			if (savedCSS) {
				savedCSS.split(/\n+/).forEach(line => {
					let selMatch = line.match(/^([^{]+)\s*\{/);
					if (selMatch) {
						const selector = selMatch[1].trim();
						console.log('Parsed selector:', selector);
						styles[selector] = {};
					} else {
						let propMatch = line.match(/(top|left|width|height):\s*(\d+)px/);
						if (propMatch && Object.keys(styles).length) {
							let lastKey = Object.keys(styles).pop();
							styles[lastKey][propMatch[1]] = propMatch[2];
						}
					}
				});
			}

			function applySaved(rect, selector) {
				if (styles[selector]) {
					console.log(`✔ Found style for ${selector}:`, styles[selector]);
					rect.style.left = styles[selector].left + 'px';
					rect.style.top = styles[selector].top + 'px';
					rect.style.width = styles[selector].width + 'px';
					rect.style.height = styles[selector].height + 'px';
				} else {
					console.warn(`✖ No saved style found for ${selector}`);
				}
			}

			if (currentMode === 'indicator') {
				const bgSel = `#${rectId} .pop-bg`;
				const btnSel = `#${rectId} .close-btn`;
			
				const bgX = styles[bgSel]?.left || 100;
				const bgY = styles[bgSel]?.top || 100;
				const btnX = styles[btnSel]?.left || 150;
				const btnY = styles[btnSel]?.top || 150;
			
				const bg = createRect('pop-bg', bgSel, 'rgba(255, 165, 0, 0.3)', bgX, bgY);
				const btn = createRect('close-btn', btnSel, 'rgba(255, 0, 0, 0.3)', btnX, btnY);
			
				applySaved(bg, bgSel);
				applySaved(btn, btnSel);
			
				container.appendChild(bg);
				container.appendChild(btn);
			} else {
				const assets = await window.electronAPI.getTileAssets(tileId);
				['mods', 'tabs', 'refs'].forEach(type => {
					assets[type].forEach((_, index) => {
						const id = `${type.slice(0, 3)}-btn${index + 1}`;
						const sel = `#${id}`;
						const color = type === 'ref' ? 'rgba(0,255,0,0.3)' : 'rgba(0,0,255,0.3)';
						const rect = createRect(id, sel, color, 50 * (index + 1), 50 * (index + 1));
						applySaved(rect, sel);
						container.appendChild(rect);
					});
				});
			}
		};

		document.getElementById('closeEditor').addEventListener('click', () => {
			document.querySelector('.image-editor').classList.add('hidden');
		});

		document.getElementById('saveEditor').addEventListener('click', async () => {
			const filename = `css/slide_${currentTileId}.css`;
			const rects = document.querySelectorAll('#editorRectsContainer .rect');
			let existingCSS = await window.electronAPI.readRectCSS(filename);
			let selectorMap = {};
		
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
		
			// Merge or update all active rects
			rects.forEach(rect => {
				const sel = rect.dataset.selector;
				const top = Math.round(parseFloat(rect.style.top || '0'));
				const left = Math.round(parseFloat(rect.style.left || '0'));
				const width = Math.round(parseFloat(rect.style.width || '0'));
				const height = Math.round(parseFloat(rect.style.height || '0'));
				selectorMap[sel] = { top, left, width, height };
			});
		
			// Generate CSS string
			let finalCSS = '';
			for (let sel in selectorMap) {
				const p = selectorMap[sel];
				finalCSS += `${sel} {\n  top: ${p.top}px;\n  left: ${p.left}px;\n  width: ${p.width}px;\n  height: ${p.height}px;\n}\n\n`;
			}
		
			await window.electronAPI.saveRectCSS(filename, finalCSS);
			document.querySelector('.image-editor').classList.add('hidden');
		});

		function createRect(id, selector, bgColor, x, y) {
			const rect = document.createElement('div');
			rect.className = 'rect draggable resizable';
			rect.style.left = `${x}px`;
			rect.style.top = `${y}px`;
			rect.style.width = '100px';
			rect.style.height = '60px';
			rect.style.background = bgColor;
			rect.dataset.selector = selector;
			const label = document.createElement('div');
			label.className = 'rect-label';
			label.innerText = id;
			rect.appendChild(label);
			makeDraggableResizable(rect);
			return rect;
		}

		function makeDraggableResizable(el) {
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
		}

	});
/* END CMAP NAMESPACE */
}(window.CMAP = window.CMAP || {}, jQuery))


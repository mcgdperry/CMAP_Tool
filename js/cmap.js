(function(CMAP, $, undefined)
{
	var num;
	
	CMAP.loadData = function()
	{
		
	}
	
	$(function()
	{	
		//generateBackground();
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

		var tileArr = [];
		var started = false;
		var isVerticalLayout = false;

		//$('#bg1').append('<div id="tile-cont"></div>');
		$('#bg1').append('<div id="tile-cont"></div>');

		$('#bg1').on('click', function () {
			if (!started) {
				tileArr.push([""]); // Create the first tile in the first column
				started = true;
				showTiles();
			}
		});

		function formatTileId(col, row) {
			return `${col}_${(row + 1).toString().padStart(2, '0')}`;
		}

		function generateBackground() {
			const canvas = document.createElement('canvas');
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;
			const ctx = canvas.getContext('2d');
		
			for (let i = 0; i < 200; i++) {
				ctx.fillStyle = `hsla(${Math.random() * 360}, 60%, 85%, 0.3)`;
				const size = Math.random() * 80 + 20;
				const x = Math.random() * canvas.width;
				const y = Math.random() * canvas.height;
				ctx.beginPath();
				ctx.arc(x, y, size, 0, 2 * Math.PI);
				ctx.fill();
			}
		
			document.body.style.backgroundImage = `url(${canvas.toDataURL()})`;
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
		  
			//$('#preview-pane').val(previewContent);
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
		
					// Ask preload script to fetch image info for this tileId
					window.electronAPI.getTileAssets(tileId).then(assets => {
						if (assets.thumb) {
							thumbnailSrc = assets.thumb;
						}
						if (assets.tabs.length || assets.mods.length || assets.refs.length) {
							indicatorsHtml += `<div class="tile-indicators">`;
							assets.tabs.forEach(tab => {
								indicatorsHtml += `<div class="circle blue" data-img="${tab}" data-type="T">T</div>`;
							});
							assets.mods.forEach(mod => {
								indicatorsHtml += `<div class="circle blue" data-img="${mod}" data-type="M">M</div>`;
							});
							assets.refs.forEach(ref => {
								indicatorsHtml += `<div class="circle green" data-img="${ref}" data-type="R">R</div>`;
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
								<div class="tile-thumbnail">${thumbnailSrc ? `<img src="${thumbnailSrc}" alt="thumb">` : ''}</div>
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

		$(document).on('mouseenter', '.circle', function () {
			const imgPath = $(this).data('img');
			if (!imgPath) return;
		
			const offset = $(this).offset();
			const previewX = offset.left + $(this).outerWidth() - 100;
			const previewY = offset.top - 210;
		
			$preview.html(`<img src="${imgPath}" alt="preview">`);
			$preview.css({
				top: previewY + 'px',
				left: previewX + 'px',
				display: 'block'
			});
		});
		
		$(document).on('mousemove', '.circle', function (e) {
			
			const offset = $(this).offset();
			const previewX = offset.left + $(this).outerWidth() - 100;
			const previewY = offset.top - 210;
		
			$preview.html(`<img src="${imgPath}" alt="preview">`);
			$preview.css({
				top: previewY + 'px',
				left: previewX + 'px',
				display: 'block'
			});
		});

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
	});
/* END CMAP NAMESPACE */
}(window.CMAP = window.CMAP || {}, jQuery))


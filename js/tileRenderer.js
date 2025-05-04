// tileRenderer.js

window.tileRenderer = {
	isVerticalLayout: false,
  
	showTiles(projectData = window.projectData, isVerticalLayout = false) {
	  this.isVerticalLayout = isVerticalLayout;
	  const $container = $('#tile-cont');
	  $container.empty();
  
	  // Create hover preview element if it doesn't exist
	  let $preview = $('#tile-hover-preview');
	  if (!$preview.length) {
		$preview = $('<div id="tile-hover-preview"></div>').appendTo('#bg1').hide();
	  }
  
	  const tileKeys = Object.keys(projectData.tiles || {});
	  tileKeys.forEach((tileId) => {
		const tileData = projectData.tiles[tileId];
		const [col, row] = tileId.split('_').map(Number);
		const formattedRow = row.toString().padStart(2, '0');
		const topPos = isVerticalLayout ? (col * 120) : (row * 120);
		const leftPos = isVerticalLayout ? (row * 140) : (col * 140);
		const btnClass = isVerticalLayout ? 'vt' : 'hz';
  
		// Build indicators HTML
		let indicatorsHtml = '';
		if (tileData.images?.mods || tileData.images?.refs) {
		  indicatorsHtml += `<div class="tile-indicators">`;
  
		  (tileData.images.mods || []).forEach((mod, i) => {
			indicatorsHtml += `<div class="circle blue" data-img="${mod}" data-type="mod" data-index="${i + 1}" data-tileid="${tileId}">M${i + 1}</div>`;
		  });
  
		  (tileData.images.refs || []).forEach((ref, i) => {
			indicatorsHtml += `<div class="circle green" data-img="${ref}" data-type="ref" data-index="${i + 1}" data-tileid="${tileId}">R${i + 1}</div>`;
		  });
  
		  indicatorsHtml += `</div>`;
		}
  
		// Build tab thumbnails HTML
		let tabThumbsHtml = '';
		if (tileData.images?.tabs?.length) {
		  tabThumbsHtml = `<div class="tab-strip">`;
		  tileData.images.tabs.forEach((tab, i) => {
			tabThumbsHtml += `
			  <div class="tab-thumb" data-img="${tab}" data-type="tab" data-index="${i + 1}" data-tileid="${tileId}">
				<img src="${tab}" />
				<div class="tab-label">Tab ${i + 1}</div>
			  </div>`;
		  });
		  tabThumbsHtml += `</div>`;
		}
  
		// Determine if this is the last column and bottom tile
		const isLastColumn = !tileKeys.some((key) => {
		  const [kCol, kRow] = key.split('_').map(Number);
		  return kCol === col && kRow > row;
		});
		const isBottomTile = !tileKeys.some((key) => {
		  const [kCol, kRow] = key.split('_').map(Number);
		  return kCol === col && kRow > row;
		});

		const isTopOfColumn = row === 1;
		const isRightmostCol = !Object.keys(projectData.tiles).some(id => parseInt(id.split('_')[0]) > col);

		const rightBtnHtml = (isRightmostCol && isTopOfColumn) ? `<div class="tile-btn right-btn ${btnClass}" data-col="${col}"></div>` : '';

		
  
		// Build tile HTML
		const tile = $(`
		  <div id="tile-${col}-${row}" class="tile expandable main-tile"
			   data-col="${col}" data-row="${row}"
			   style="left:${leftPos}px; top:${topPos}px;">
			<input type="text" class="tile-input" value="${tileData.label}" placeholder="${tileId}" />
			<div class="tile-thumbnail" data-tileid="${tileId}" data-img="${tileData.images?.thumb || ''}">
			  ${tileData.images?.thumb ? `<img src="${tileData.images.thumb}" alt="thumb" />` : ''}
			  ${indicatorsHtml}
			</div>
			${tabThumbsHtml}
			${rightBtnHtml}
			${isBottomTile ? `<div class="tile-btn down-btn ${btnClass}" data-col="${col}"></div>` : ''}
			<div class="tile-btn del-btn" data-col="${col}" data-row="${row}"></div>
		  </div>
		`);
  
		$container.append(tile);
	  });
  
	  // Input change handler
	  $container.find('.tile-input').on('input', function () {
		const $tile = $(this).closest('.tile');
		const col = $tile.data('col');
		const row = $tile.data('row');
		const tileId = `${col}_${row.toString().padStart(2, '0')}`;
		if (window.projectData.tiles[tileId]) {
		  window.projectData.tiles[tileId].label = $(this).val();
		  if (window.previewPane?.update) window.previewPane.update();
		}
	  });
  
	  // Zoom to fit if enabled
	  if ($('#zoom-to-fit').prop('checked')) {
		window.zoomToFit(projectData);
	  }
  
	  // Indicator click handlers
	  $container.find('.tile-thumbnail').on('click', window.editorPanel.handleTileClick);
	  $container.find('.circle, .tab-thumb').on('click', window.editorPanel.handleIndicatorClick);
  
	  // Hover preview handlers
	  $(document).on('mouseenter', '.circle', function (e) {
		const imgPath = $(this).data('img');
		if (!imgPath) return;
		$preview.html(`<img src="${imgPath}" alt="preview">`).show();
	  });
  
	  $(document).on('mousemove', '.circle', function (e) {
		const offsetX = 120, offsetY = 200;
		$preview.css({
		  top: `${e.pageY - offsetY}px`,
		  left: `${e.pageX - offsetX}px`,
		  display: 'block'
		});
	  });
  
	  $(document).on('mouseleave', '.circle', function () {
		$preview.hide().empty();
	  });
  
	  // Right button handler
	  $container.off('click', '.right-btn').on('click', '.right-btn', function () {
		const col = parseInt($(this).data('col'));
		const newRow = 1;
		const newTileId = `${col}_${newRow.toString().padStart(2, '0')}`;
		if (!window.projectData.tiles[newTileId]) {
		  window.projectData.tiles[newTileId] = {
			label: `Slide ${col}-${newRow}`,
			images: { thumb: '', tabs: [], mods: [], refs: [] },
			docked: {},
			rects: {}
		  };
		  window.tileRenderer.showTiles(window.projectData, window.tileRenderer.isVerticalLayout);
		}
	  });
  
	  // Down button handler
	  $container.off('click', '.down-btn').on('click', '.down-btn', function () {
		const col = parseInt($(this).data('col'));
		const existingRows = Object.keys(window.projectData.tiles).filter((key) => key.startsWith(`${col}_`)).map((key) => parseInt(key.split('_')[1]));
		const newRow = Math.max(...existingRows) + 1;
		const newTileId = `${col}_${newRow.toString().padStart(2, '0')}`;
		window.projectData.tiles[newTileId] = {
		  label: `Slide ${col}-${newRow}`,
		  images: { thumb: '', tabs: [], mods: [], refs: [] },
		  docked: {},
		  rects: {}
		};
		window.tileRenderer.showTiles(window.projectData, window.tileRenderer.isVerticalLayout);
	  });
  
	  // Delete button handler
	  $container.off('click', '.del-btn').on('click', '.del-btn', function () {
		const col = parseInt($(this).data('col'));
		const row = parseInt($(this).data('row'));
		const tileId = `${col}_${row.toString().padStart(2, '0')}`;
		delete window.projectData.tiles[tileId];
		window.tileRenderer.showTiles(window.projectData, window.tileRenderer.isVerticalLayout);
	  });
  
	  // Update preview pane
	  if (window.previewPane?.update) window.previewPane.update();
	  if (window.dragDrop?.setup) window.dragDrop.setup();
	}
  };
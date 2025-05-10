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
/*
		let indicatorsHtml = '<div class="tile-indicators">';

		Object.entries(tileData.rects || {}).forEach(([selector, val], i) => {
		const id = selector.replace('#', '');
		const type = id.split('-')[0]; // e.g., mod, ref, link, alt, pres
		const index = id.match(/\d+/)?.[0] || i + 1;

		const def = {
			mod: { label: 'M', color: 'blue', useImg: true },
			ref: { label: 'R', color: 'green', useImg: true },
			link: { label: 'L', color: 'orange', useImg: false },
			alt: { label: 'A', color: 'purple', useImg: false },
			pres: { label: 'P', color: 'teal', useImg: false }
		}[type];

		if (!def) return;

		const btnId = id;
		const isDocked = tileData.docked?.[btnId];

		const hoverAttr = !def.useImg
			? type === 'link' ? `data-hover="gotoSlide: Slide ${val.target || ''}"`
			: type === 'alt' ? `data-hover="Alternate: ${val.target || ''}"`
			: type === 'pres' ? `data-hover="Link to presentation: ${val.value || ''}"`
			: ''
			: '';

		const imgSrc = tileData.images?.[type + 's']?.[parseInt(index) - 1] || '';

		const circle = `
			<div class="circle ${def.color}"
				data-type="${type}" data-index="${index}" data-tileid="${tileId}"
				${def.useImg ? `data-img="${imgSrc}"` : hoverAttr}>
			${def.label}${index}
			</div>`;

		if (isDocked?.startsWith('tab')) {
			const tabIndex = isDocked.replace('tab', '');
			$(`#tile-${tileId} .tab-thumb[data-index="${tabIndex}"]`).append(circle);
		} else {
			indicatorsHtml += circle;
		}
		});

		indicatorsHtml += '</div>';
  */
		let indicatorsHtml = '';
const rects = tileData.rects || {};
const docked = tileData.docked || {};
const dockedCirclesByTab = {};

//console.log(`🧲 Docked indicators for ${tileId}:`, tileData.docked);

// Helper to push a circle to the tab if docked
function addDockedCircle(btnId, circleHtml) {
  const tabId = docked[btnId];
  if (tabId) {
    dockedCirclesByTab[tabId] = dockedCirclesByTab[tabId] || [];
    dockedCirclesByTab[tabId].push(circleHtml);
  }
}

// Mod indicators
const modCircles = (tileData.images.mods || []).map((mod, i) => {
  const id = `mod-btn${i + 1}`;
  const circle = `<div class="circle blue" data-img="${mod}" data-type="mod" data-index="${i + 1}" data-tileid="${tileId}">M${i + 1}</div>`;
  if (docked[id]) {
    addDockedCircle(id, circle);
    return '';
  }
  return circle;
}).join('');

// Ref indicators
const refCircles = (tileData.images.refs || []).map((ref, i) => {
  const id = `ref-btn${i + 1}`;
  const circle = `<div class="circle green" data-img="${ref}" data-type="ref" data-index="${i + 1}" data-tileid="${tileId}">R${i + 1}</div>`;
  if (docked[id]) {
    addDockedCircle(id, circle);
    return '';
  }
  return circle;
}).join('');

// Link/Alt/Pres buttons
const typeDefs = {
  link: { label: 'L', color: 'orange', prefix: 'link-btn', ext: 'png' },
  alt:  { label: 'A', color: 'purple', prefix: 'alt-btn', ext: 'png' },
  pres: { label: 'P', color: 'teal', prefix: 'pres-btn', ext: 'png' }
};

let extraCircles = '';

Object.entries(typeDefs).forEach(([type, def]) => {
  Object.keys(rects).filter(sel => sel.startsWith(`#${def.prefix}`)).forEach((sel, i) => {
    const btnId = `${def.prefix}${i + 1}`;
    const rect = rects[sel] || {};
    const hoverAttr = type === 'link'
      ? `data-hover="gotoSlide: Slide ${rect.target || ''}"`
      : type === 'pres'
      ? `data-hover="Link to presentation: ${rect.value || ''}"`
      : type === 'alt'
      ? `data-hover="Alternate: ${rect.target || ''}"`
      : '';
    const circle = `<div class="circle ${def.color}" ${hoverAttr} data-type="${type}" data-index="${i + 1}" data-tileid="${tileId}">${def.label}${i + 1}</div>`;
    if (docked[btnId]) {
      addDockedCircle(btnId, circle);
    } else {
      extraCircles += circle;
    }
  });
});

if (modCircles || refCircles || extraCircles) {
  indicatorsHtml += `<div class="tile-indicators">${modCircles}${refCircles}${extraCircles}</div>`;
}

// Tab Strip
let $tabStrip = null;
if (tileData.images?.tabs?.length) {
  $tabStrip = $('<div class="tab-strip"></div>');
  tileData.images.tabs.forEach((tab, i) => {
    const tabId = `tab${i + 1}`;
    const dockedCircles = dockedCirclesByTab[tabId]?.join('') || '';
    $tabStrip.append(`
      <div class="tab-thumb" data-img="${tab}" data-type="tab" data-index="${i + 1}" data-tileid="${tileId}">
        <img src="${tab}" />
        <div class="tab-label">Tab ${i + 1}</div>
        ${dockedCircles}
      </div>
    `);
    //console.log(`📎 Tab ${tabId} contains ${dockedCirclesByTab[tabId]?.length || 0} docked circles`);
  });
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
			${tileData.images?.thumb
				? `<img src="${tileData.images.thumb}" alt="thumb" />`
				: `<div class="placeholder-upload" data-tileid="${tileId}" onclick="event.stopPropagation();">
					 <label for="upload-${tileId}">
					   <img src="images/placeholder.png" alt="Upload Slide" />
					 </label>
					 <input type="file" class="thumb-upload" id="upload-${tileId}" data-tileid="${tileId}" accept="image/*" />
				   </div>`
			  }
			${indicatorsHtml}
			</div>
			
			${rightBtnHtml}
			${isBottomTile ? `<div class="tile-btn down-btn ${btnClass}" data-col="${col}"></div>` : ''}
			<div class="tile-btn del-btn" data-col="${col}" data-row="${row}"></div>
		  </div>
		`);
		if ($tabStrip) {
			tile.find('.tile-thumbnail').after($tabStrip);
		  }
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
		const hoverText = $(this).data('hover');
		const imgPath = $(this).data('img');
		//if (!imgPath) return;
		if (hoverText) {
				$preview.html(`<div class="hover-text">${hoverText}</div>`);
		  } else if (imgPath) {
				$preview.html(`<img src="${imgPath}" alt="preview">`).show();
		  }
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

	  $('.tile-thumbnail').on('drop', async function (e) {
		e.preventDefault();
		const file = e.originalEvent.dataTransfer.files[0];
		if (!file || !file.type.startsWith('image/')) return;
	  
		const tileId = $(this).data('tileid');
		const ext = file.name.split('.').pop();
		const newFileName = `slide_${tileId}_bg1.${ext}`;
		await window.electronAPI.saveAttachment(`screens/${newFileName}`, file.path, true);
	  
		window.projectData.tiles[tileId].images.thumb = `screens/${newFileName}`;
		window.tileRenderer.showTiles(window.projectData, window.tileRenderer.isVerticalLayout);
	  });

	  $container.off('click', '.right-btn').on('click', '.right-btn', function () {
		const currentCol = parseInt($(this).data('col'));
		const newCol = currentCol + 1;
	  
		// Determine next available row (always start with row 01)
		const newRow = 1;
		const newTileId = `${newCol}_${newRow.toString().padStart(2, '0')}`;
	  
		if (!window.projectData.tiles[newTileId]) {
		  window.projectData.tiles[newTileId] = {
			label: `Slide ${newCol}-${newRow.toString().padStart(2, '0')}`,
			images: { thumb: '', tabs: [], mods: [], refs: [] },
			docked: {},
			rects: {}
		  };
	  
		  // 🔁 Re-render the tile layout after adding the new column
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
		  label: `Slide ${col}-${newRow.toString().padStart(2, '0')}`,
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

	  $container.find('.thumb-upload').off('change').on('change', async function (e) {
		const file = e.target.files[0];
		const tileId = $(this).data('tileid');
		if (!file || !tileId) return;
	  
		const ext = file.name.split('.').pop();
		const newFileName = `slide_${tileId}_bg1.${ext}`;
		
		const reader = new FileReader();
		reader.onload = async function () {
		const arrayBuffer = reader.result;
		await window.electronAPI.saveAttachment(`screens/${newFileName}`, arrayBuffer, true);

		// Update JSON and re-render
		window.projectData.tiles[tileId].images.thumb = `screens/${newFileName}`;
		window.tileRenderer.showTiles(window.projectData, window.tileRenderer.isVerticalLayout);
		};
		reader.readAsArrayBuffer(file);
	  
		// Save to projectData
		window.projectData.tiles[tileId].images.thumb = `screens/${newFileName}`;
	  
		// Refresh the tile layout to show the uploaded image
		window.tileRenderer.showTiles(window.projectData, window.tileRenderer.isVerticalLayout);
	  });
	  // Update preview pane
	  if (window.previewPane?.update) window.previewPane.update();
	  if (window.dragDrop?.setup) window.dragDrop.setup();
	}
};


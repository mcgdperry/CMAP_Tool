// tileRenderer.js - converted to window.* format

window.renderTiles = async function(tileArr, isVerticalLayout, formatTileId, updatePreview) {
	const $container = $('#tile-cont');
	$container.empty();
  
	const tileValues = {};
	$('.tile').each(function () {
	  const col = $(this).data('col');
	  const row = $(this).data('row');
	  const tileId = formatTileId(col, row);
	  tileValues[tileId] = $(this).find('.tile-input').val();
	});
  
	for (let col = 0; col < tileArr.length; col++) {
	  const isLastColumn = (col === tileArr.length - 1);
	  const lastSubTileIndex = tileArr[col].length - 1;
  
	  for (let row = 0; row < tileArr[col].length; row++) {
		const isBottomTile = (row === lastSubTileIndex);
		const tileId = formatTileId(col, row);
		const savedValue = tileValues[tileId] || tileArr[col][row];
		const leftPos = isVerticalLayout ? (row * 130) + 5 : (col * 130) + 5;
		const topPos = isVerticalLayout ? (col * 110) + 5 : (row * 110) + 5;
		const btnClass = isVerticalLayout ? 'vt' : 'hz';
  
		const assets = await window.electronAPI.getTileAssets(tileId);
		let indicatorsHtml = '';
		let tabThumbsHtml = '';
  
		if (assets.tabs.length || assets.mods.length || assets.refs.length) {
		  indicatorsHtml += '<div class="tile-indicators">';
		  tabThumbsHtml += '<div class="tab-strip">';
  
		  assets.tabs.forEach((tab, i) => {
			tabThumbsHtml += `
			  <div class="tab-thumb" data-img="${tab}" data-type="tab" data-index="${i + 1}" data-tileid="${tileId}">
				<img src="${tab}" />
				<div class="tab-label">Tab ${i + 1}</div>
			  </div>`;
		  });
		  tabThumbsHtml += '</div>';
  
		  assets.mods.forEach((mod, idx) => {
			indicatorsHtml += `<div class="circle blue" data-img="${mod}" data-type="mod" data-index="${idx + 1}" data-tileid="${tileId}">M${idx + 1}</div>`;
		  });
  
		  assets.refs.forEach((ref, idx) => {
			indicatorsHtml += `<div class="circle green" data-img="${ref}" data-type="ref" data-index="${idx + 1}" data-tileid="${tileId}">R${idx + 1}</div>`;
		  });
		  indicatorsHtml += '</div>';
		}
  
		const hasContent = assets.thumb || assets.tabs.length || assets.mods.length || assets.refs.length;
		const expandableClass = hasContent ? 'expandable' : '';
  
		const tileHTML = `
		  <div id="tile-${col}-${row}" class="tile ${expandableClass} ${row === 0 ? 'main-tile' : 'sub-tile'}" 
			   data-col="${col}" data-row="${row}" 
			   style="left: ${leftPos}px; top: ${topPos}px;">
			<input type="text" class="tile-input" placeholder="${tileId}" value="${savedValue}" />
			<div class="tile-thumbnail" data-tileid="${tileId}" data-img="${assets.thumb}">
			  ${assets.thumb ? `<img src="${assets.thumb}" alt="thumb">` : ''}
			</div>
			${tabThumbsHtml}
			${indicatorsHtml}
			${isLastColumn && row === 0 ? `<div class="tile-btn right-btn ${btnClass}" data-col="${col}"></div>` : ''}
			${isBottomTile ? `<div class="tile-btn down-btn ${btnClass}" data-col="${col}"></div>` : ''}
			<div class="tile-btn del-btn" data-col="${col}" data-row="${row}"></div>
		  </div>`;
  
		$container.append(tileHTML);
	  }
	}
	
	if (typeof updatePreview === 'function') {
		updatePreview();
	}
	
	
	if ($('#zoom-to-fit').prop('checked')) {
	  window.zoomToFit(tileArr);
	}

	// ✅ Attach event listeners after DOM is updated
	$container.find('.tile-thumbnail').on('click', window.editorPanel.handleTileClick);
	$container.find('.circle, .tab-thumb').on('click', window.editorPanel.handleIndicatorClick);

	const $preview = $('<div id="tile-hover-preview"></div>').appendTo('#bg1').hide();

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

	$(document).on('click', '.right-btn', function () {
		const col = parseInt($(this).data('col'));
		if (window.tileArr[col] && col === window.tileArr.length - 1) {
			window.tileArr.push(['']);
			window.tileRenderer.showTiles(window.tileArr, false);
		}
	});
		
	$(document).on('click', '.down-btn', function () {
		const col = parseInt($(this).data('col'));
		if (window.tileArr[col]) {
			window.tileArr[col].push('');
			window.tileRenderer.showTiles(window.tileArr, false);
		}
	});
  };

  window.tileRenderer = {
	init(tileArr, { isVerticalLayout, onTileClick, onIndicatorClick, updatePreview }) {
		this.tileArr = tileArr;
		this.isVerticalLayout = isVerticalLayout;
		this.onTileClick = onTileClick;
		this.onIndicatorClick = onIndicatorClick;
		this.updatePreview = updatePreview;
		this.showTiles(tileArr, isVerticalLayout, updatePreview); // first render
	},

	showTiles(tileArr, isVerticalLayout, updatePreview) {
		window.renderTiles(tileArr, isVerticalLayout, window.formatTileId, updatePreview);
	}
};
  
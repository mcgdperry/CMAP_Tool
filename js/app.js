$(function () {
	// Initialize core UI
	if (window.ui?.setup) window.ui.setup();
  
	// Define globally accessible tile ID formatter
	window.formatTileId = function (col, row) {
	  return `${col}_${(row + 1).toString().padStart(2, '0')}`;
	};
  
	// Start projectData if not already defined
	window.projectData = window.projectData || { tiles: {} };
	window.isVerticalLayout = false;
  
	// Preview pane
	if (window.previewPane?.init) {
	  window.previewPane.init();
	}
  
	// Editor
	if (window.editorPanel?.init) {
	  window.editorPanel.init();
	}
  
	// Tile Renderer
	if (window.tileRenderer?.showTiles) {
	  window.tileRenderer.showTiles(window.projectData, window.isVerticalLayout);
	}
  
	// Drag/drop setup
	if (window.dragDrop?.setup) {
	  window.dragDrop.setup();
	}
  
	// Manifest (optional for legacy support)
	if (window.manifest?.init) {
	  window.manifest.init();
	}
  
	// Zoom scale slider
	$('#scale-slider').on('input', function () {
	  const scale = $(this).val() / 100;
	  $('#tile-cont').css('transform', `scale(${scale})`);
	  $('#zoom-to-fit').prop('checked', false);
	});
  
	// Zoom to fit
	$('#zoom-to-fit').on('change', function () {
	  if (this.checked) {
		const tileCount = Object.keys(window.projectData.tiles || {}).length;
		const estCols = Math.ceil(Math.sqrt(tileCount));
		const estRows = estCols;
  
		const container = $('#tile-cont');
		const map = $('#map-scroll');
		const w = (estCols * 140) + 10;
		const h = (estRows * 120) + 10;
  
		const scaleW = map.width() / w;
		const scaleH = map.height() / h;
		const scale = Math.min(scaleW, scaleH, 1);
  
		$('#scale-slider').val(Math.round(scale * 100));
		container.css('transform', `scale(${scale})`);
	  }
	});
  
	// Layout switcher
	$('#switch-btn').on('click', function () {
	  window.isVerticalLayout = !window.isVerticalLayout;
	  window.tileRenderer?.showTiles(window.projectData, window.isVerticalLayout);
	  window.previewPane?.update();
	  $(this).text(window.isVerticalLayout ? 'Switch to Horizontal' : 'Switch to Vertical');
	});
  
	// Click anywhere to start with one tile
	$('#bg1').on('click', function () {
	  if (!Object.keys(window.projectData.tiles || {}).length) {
		window.projectData.tiles['0_01'] = {
		  label: 'Slide 0-1',
		  images: { thumb: '', tabs: [], mods: [], refs: [] },
		  docked: {},
		  rects: {}
		};
		window.tileRenderer.showTiles(window.projectData, window.isVerticalLayout);
	  }
	});
  });
  
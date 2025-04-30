$(function () {
	// 💠 Setup all UI elements (adds inputs, buttons, image editor, etc.)
	if (window.ui?.setup) window.ui.setup();

	// 💠 Define formatTileId globally so everyone can use it
	window.formatTileId = function (col, row) {
		return `${col}_${(row + 1).toString().padStart(2, '0')}`;
	};

	// 💠 Initialize main tile state
	const tileArr = [];
	let isVerticalLayout = false;
	let started = false;

	// 🌍 Expose globally for other modules
	window.tileArr = tileArr;

	window.previewPane.init(tileArr);

	// 🔁 Central preview update used across components
	const updatePreview = () => {
		const brand = $('#inp-brandname').val();
		if (window.manifest?.updatePreviewPane) {
			window.manifest.updatePreviewPane(tileArr, brand);
		}
	};

	window.editorPanel.init();
	
	// 🧱 Initialize tileRenderer
	if (window.tileRenderer?.init) {
		window.tileRenderer.init(tileArr, {
			isVerticalLayout,
			onTileClick:  window.editorPanel.handleTileClick.bind(window.editorPanel),
			onIndicatorClick:  window.editorPanel.handleIndicatorClick.bind(window.editorPanel)
		});
	}

	// 🎯 Hook drag-drop logic
	if (window.dragDrop?.setup) {
		window.dragDrop.setup();
	}

	// 📝 Manifest UI handlers
	if (window.manifest?.init) {
		window.manifest.init(tileArr);
	}

	// 🔍 Zoom controls
	$('#scale-slider').on('input', function () {
		const val = $(this).val();
		$('#tile-cont').css('transform', `scale(${val / 100})`);
		$('#zoom-to-fit').prop('checked', false);
	});

	$('#zoom-to-fit').on('change', function () {
		if (this.checked) {
			const cols = tileArr.length;
			const rows = Math.max(...tileArr.map(col => col.length));
			const container = $('#tile-cont');
			const w = (cols * 130) + 10;
			const h = (rows * 110) + 10;
			const scaleW = container.width() / w;
			const scaleH = container.height() / h;
			const scale = Math.min(scaleW, scaleH, 1);
			$('#scale-slider').val(Math.round(scale * 100));
			container.css('transform', `scale(${scale})`);
		}
	});

	// 🔄 Switch layout
	$('#switch-btn').on('click', function () {
		window.isVerticalLayout = !window.isVerticalLayout;
		if (window.tileRenderer?.showTiles) {
			window.tileRenderer.showTiles(window.tileArr, window.isVerticalLayout); // ✅ only pass 2 args
		}
		if (window.previewPane?.update) {
			window.previewPane.update(); // ✅ update the preview separately
		}
		// ✨ Change button text
		$(this).text(window.isVerticalLayout ? 'Switch to Horizontal' : 'Switch to Vertical');

	});

	// 📦 First tile on background click
	$('#bg1').on('click', function () {
		if (!started) {
			tileArr.push(['']);
			started = true;
			if (window.tileRenderer?.showTiles) {
				//window.tileRenderer.showTiles(tileArr, isVerticalLayout, updatePreview);
				window.tileRenderer.showTiles(window.tileArr, window.isVerticalLayout);
			}
		}
	});
});

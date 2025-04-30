// dragDrop.js (global-style, preload-safe version)

window.dragDrop = {
	setup: function () {
	  interact('.circle').draggable({
		inertia: true,
		autoScroll: true,
		listeners: {
		  move(event) {
			const x = event.pageX - 10;
			const y = event.pageY - 10;
			Object.assign(event.target.style, {
			  transform: `translate(${x}px, ${y}px)`,
			  zIndex: 1000
			});
		  },
		  end(event) {
			const $circle = $(event.target);
			const dropX = event.clientX;
			const dropY = event.clientY;
			const $dropTarget = document.elementFromPoint(dropX, dropY);
  
			const type = $circle.data('type');
			const index = $circle.data('index');
			const btnId = `${type}-btn${index}`;
			const tileId = $circle.data('tileid');
			const jsPath = `js/slide_${tileId}.js`;
  
			if ($dropTarget && $dropTarget.closest('.tab-thumb')) {
			  const $tab = $($dropTarget).closest('.tab-thumb');
			  const tabIndex = $tab.data('index');
			  const tabId = `tab${tabIndex}`;
			  const jsLine = `$('#${btnId}').appendTo('#${tabId}');\n`;
  
			  const $tile = $(`[data-tileid="${tileId}"]`).closest('.tile');
			  if ($tile.find('.tab-thumb').length === 0) return;
  
			  window.electronAPI.removeLinesContaining(jsPath, `$('#${btnId}')`).then(() => {
				window.electronAPI.saveAttachment(jsPath, jsLine, true);
			  });
  
			  $circle.css({
				top: 'calc(100% - 24px)',
				left: `${10 + (index - 1) * 24}px`,
				transform: 'none',
				zIndex: 10
			  });
			  $tab.append($circle[0]);
  
			  const rect = document.querySelector(`[data-selector="#${btnId}"]`);
			  if (rect && window.currentMode === 'main') {
				rect.dataset.tab = tabId;
			  }
			} else {
			  window.electronAPI.removeLinesContaining(jsPath, `$('#${btnId}')`);
			  const $tileThumb = $(`[data-tileid="${tileId}"]`).closest('.tile').find('.tile-thumbnail');
			  $tileThumb.append($circle[0]);
			  $circle.css({
				position: 'absolute',
				top: '120px',
				left: `${30 + (index - 1) * 24}px`,
				transform: 'none',
				zIndex: 1
			  });
			}
		  }
		}
	  });
	}
  };
  
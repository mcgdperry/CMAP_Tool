// dragDrop.js

window.dragDrop = {
	setup: function () {
	  interact('.circle').unset(); // 💥 Clear old bindings
  
	  interact('.circle').draggable({
		inertia: true,
		autoScroll: true,
		listeners: {
		  start(event) {
			const t = event.target;
			t.classList.add('dragging');
			t.style.position = 'fixed';
			t.style.transform = 'scale(1.2)';
			t.style.zIndex = '1000';
		  },
		  move(event) {
			const t = event.target;
			t.style.left = `${event.clientX - 20}px`;
			t.style.top = `${event.clientY - 40}px`;
		  },
		  end: async function (event) {
			const t = event.target;
			t.classList.remove('dragging');
			t.style.transform = 'scale(1)';
			t.style.zIndex = '10';
			t.style.position = 'relative';
			t.style.left = '';
			t.style.top = '';
  
			const $circle = $(t);
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
  
			  await window.electronAPI.removeLinesContaining(jsPath, `$('#${btnId}')`);
			  await window.electronAPI.saveAttachment(jsPath, String(jsLine), true);
  
			  $tab.append($circle[0]);
			  $circle.css({
				marginTop: '4px',
				marginLeft: `${10 + (index - 1) * 24}px`
			  });
  
			  const rect = document.querySelector(`[data-selector="#${btnId}"]`);
			  if (rect && window.editorPanel.currentMode === 'main') {
				rect.dataset.tab = tabId;
			  }
			} else {
			  // Reattach to main tile
			  await window.electronAPI.removeLinesContaining(jsPath, `$('#${btnId}')`);
			  const $tileThumb = $(`[data-tileid="${tileId}"]`).closest('.tile').find('.tile-thumbnail');
			  if ($tileThumb.length) {
				$tileThumb.append($circle[0]);
				$circle.css({
					position: 'relative',
					top: '',
					left: '',
					marginTop: '4px',
					marginLeft: `${10 + (index - 1) * 24}px`,
					zIndex: 1
				});
		      } else {
				console.warn('❗ Could not find tile thumbnail for reattachment');
			  }
  
			  const rect = document.querySelector(`[data-selector="#${btnId}"]`);
			  if (rect && window.editorPanel.currentMode === 'main') {
				delete rect.dataset.tab;
			  }
			}
		  }
		}
	  });
	}
  };
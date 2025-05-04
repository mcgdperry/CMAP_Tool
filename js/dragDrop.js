window.dragDrop = {
	setup: function () {
	  interact('.circle').draggable({
		inertia: true,
		autoScroll: true,
		listeners: {
		  start(event) {
			const el = event.target;
			el.classList.add('dragging');
			el.style.transform = 'scale(1.3)';
			el.style.zIndex = '1000';
			el.style.position = 'fixed';
			el.style.pointerEvents = 'none';
		  },
		  move(event) {
			const el = event.target;
			el.style.left = `${event.clientX - 20}px`;
			el.style.top = `${event.clientY - 40}px`;
		  },
		  end(event) {
			const el = event.target;
			el.classList.remove('dragging');
			el.style.transform = 'scale(1)';
			el.style.zIndex = '10';
			el.style.position = 'relative';
			el.style.left = '';
			el.style.top = '';
			el.style.pointerEvents = 'auto';
  
			const $circle = $(el);
			const type = $circle.data('type');
			const index = $circle.data('index');
			const tileId = $circle.data('tileid');
			const btnId = `${type}-btn${index}`;
  
			const dropX = event.clientX;
			const dropY = event.clientY;
			const $dropTarget = document.elementFromPoint(dropX, dropY);
  
			const tileData = window.projectData.tiles[tileId];
			if (!tileData) return;
  
			if ($dropTarget && $dropTarget.closest('.tab-thumb')) {
			  const $tab = $($dropTarget).closest('.tab-thumb');
			  const tabIndex = $tab.data('index');
			  const tabId = `tab${tabIndex}`;
  
			  tileData.docked = tileData.docked || {};
			  tileData.docked[btnId] = tabId;
  
			  $tab.append($circle[0]);
			  $circle.css({
				position: 'relative',
				top: 'calc(100% - 140px)',
				left: `${-10 + (index - 1) * 24}px`,
				transform: 'none',
				zIndex: 10
			  });
  
			} else {
			  const $tileThumb = $(`[data-tileid="${tileId}"]`).closest('.tile').find('.tile-thumbnail');
  
			  if (tileData.docked) {
				delete tileData.docked[btnId];
			  }
  
			  $tileThumb.closest('.tile').find('.tile-indicators').append($circle[0]);
			  $circle.css({
				position: 'relative',
				top: '-4px',
				left: `${(index - 1) * 24}px`,
				transform: 'none',
				zIndex: 1
			  });
			}
		  }
		}
	  });
	}
  };
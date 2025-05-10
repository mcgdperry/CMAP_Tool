window.makeDraggableResizable = function (el) {
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
  };
window.makeDraggableResizable = function (el) {
  interact(el)
    .draggable({
      listeners: {
        move(event) {
          const t = event.target;
          const left = (parseFloat(t.style.left) || 0) + event.dx;
          const top = (parseFloat(t.style.top) || 0) + event.dy;
          t.style.left = `${left}px`;
          t.style.top = `${top}px`;

          // 🔁 Update inspector live
          if (t.classList.contains('selected')) {
            document.getElementById('rect-top').value = Math.round(top);
            document.getElementById('rect-left').value = Math.round(left);
          }
        }
      }
    })
    .resizable({
      edges: { left: true, right: true, top: true, bottom: true },
      listeners: {
        move(event) {
          const t = event.target;
          const width = event.rect.width;
          const height = event.rect.height;
          t.style.width = `${width}px`;
          t.style.height = `${height}px`;

          // 🔁 Update inspector live
          if (t.classList.contains('selected')) {
            document.getElementById('rect-width').value = Math.round(width);
            document.getElementById('rect-height').value = Math.round(height);
          }
        }
      }
    });
};
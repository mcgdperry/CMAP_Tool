// image-editor.js
import interact from 'interactjs';

export function openImageEditor({ tileId, imageType, imagePath, rectData, onSave }) {
  const editor = document.getElementById('image-editor');
  const image = document.getElementById('editor-image');
  const rectContainer = document.getElementById('rect-container');
  const saveBtn = document.getElementById('editor-save');
  const closeBtn = document.getElementById('editor-close');

  editor.style.display = 'flex';
  image.src = imagePath;
  image.style.width = '1024px';
  image.style.height = '768px';
  rectContainer.innerHTML = '';

  if (imageType === 'thumb') {
    // Main thumbnail image - load rectangles for mods, tabs, refs
    rectData.forEach(({ id, type, color, top, left, width, height }) => {
      const rect = createRect(id, color, top, left, width, height);
      rectContainer.appendChild(rect);
      enableDragResize(rect);
    });
  } else {
    // Individual indicator (mod/ref) - only show one rectangle for close button
    const id = `${imageType} .close-btn`;
    const existing = rectData.find(r => r.id === id);
    const rect = createRect(id, imageType === 'mod' ? '#42A5F5' : '#66BB6A', existing?.top, existing?.left, existing?.width, existing?.height);
    rect.classList.add('single');
    rectContainer.appendChild(rect);
    enableDragResize(rect);
  }

  saveBtn.onclick = () => {
    const result = [];
    for (const r of rectContainer.querySelectorAll('.rect')) {
      const id = r.dataset.id;
      const top = Math.round(parseFloat(r.style.top));
      const left = Math.round(parseFloat(r.style.left));
      const width = Math.round(parseFloat(r.style.width));
      const height = Math.round(parseFloat(r.style.height));
      result.push({ id, top, left, width, height });
    }
    onSave(result);
    editor.style.display = 'none';
  };

  closeBtn.onclick = () => {
    editor.style.display = 'none';
  };
}

function createRect(id, color, top = 100, left = 100, width = 80, height = 40) {
  const rect = document.createElement('div');
  rect.className = 'rect';
  rect.dataset.id = id;
  rect.style.position = 'absolute';
  rect.style.top = `${top}px`;
  rect.style.left = `${left}px`;
  rect.style.width = `${width}px`;
  rect.style.height = `${height}px`;
  rect.style.backgroundColor = color;
  rect.style.opacity = '0.5';
  rect.style.border = '2px solid ' + color;
  return rect;
}

function enableDragResize(rect) {
  interact(rect)
    .draggable({
      onmove: event => {
        const target = event.target;
        const x = (parseFloat(target.style.left) || 0) + event.dx;
        const y = (parseFloat(target.style.top) || 0) + event.dy;
        target.style.left = `${x}px`;
        target.style.top = `${y}px`;
      }
    })
    .resizable({
      edges: { left: true, right: true, bottom: true, top: true },
    })
    .on('resizemove', event => {
      const { width, height } = event.rect;
      event.target.style.width = `${width}px`;
      event.target.style.height = `${height}px`;
    });
}

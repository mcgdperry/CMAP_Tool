window.rectInspector = {
	bindToRect(rect) {
		if (!rect) return;

		document.querySelectorAll('.rect.selected').forEach(r => r.classList.remove('selected'));
		rect.classList.add('selected');
		
		const style = window.getComputedStyle(rect);

		$('#rect-top').val(parseInt(style.top)).off().on('input', e => rect.style.top = `${e.target.value}px`);
		$('#rect-left').val(parseInt(style.left)).off().on('input', e => rect.style.left = `${e.target.value}px`);
		$('#rect-width').val(parseInt(style.width)).off().on('input', e => rect.style.width = `${e.target.value}px`);
		$('#rect-height').val(parseInt(style.height)).off().on('input', e => rect.style.height = `${e.target.value}px`);

		const input = rect.querySelector('input');
		const select = rect.querySelector('select');

		$('#rect-value').val(input?.value || '').off().on('input', e => { if (input) input.value = e.target.value; });
		$('#rect-target').val(select?.value || '').off().on('input', e => { if (select) select.value = e.target.value; });
	},



	_bindInspectorEvents() {
		const fields = {
			top: document.getElementById('insp-top'),
			left: document.getElementById('insp-left'),
			width: document.getElementById('insp-width'),
			height: document.getElementById('insp-height'),
			value: document.getElementById('insp-value')
		};

		// Sync inspector input → rect
		Object.entries(fields).forEach(([key, input]) => {
			input.addEventListener('input', () => {
			const rect = document.querySelector('.rect.selected');
			if (!rect) return;

			if (['top', 'left', 'width', 'height'].includes(key)) {
				rect.style[key] = `${input.value}px`;
			} else if (key === 'value') {
				const inputField = rect.querySelector('input');
				if (inputField) inputField.value = input.value;
			}
			});
		});
	}
};

_selectRect = function (rectEl) {
  // Deselect all others
  document.querySelectorAll('.rect.selected').forEach(el => el.classList.remove('selected'));

  // Highlight this one
  rectEl.classList.add('selected');

  // Populate inspector
  const fields = {
    top: document.getElementById('insp-top'),
    left: document.getElementById('insp-left'),
    width: document.getElementById('insp-width'),
    height: document.getElementById('insp-height'),
    value: document.getElementById('insp-value')
  };

  fields.top.value = parseInt(rectEl.style.top) || 0;
  fields.left.value = parseInt(rectEl.style.left) || 0;
  fields.width.value = parseInt(rectEl.style.width) || 100;
  fields.height.value = parseInt(rectEl.style.height) || 60;

  const input = rectEl.querySelector('input');
  fields.value.value = input ? input.value : '';
};

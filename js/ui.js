window.ui = {
	setup: function () {
		$('#bg1').append(`
			<input type="text" id="inp-brandname" maxlength="30" name="brandname" placeholder="Name of brand">
			<div id="zoom-controls">
				<label>Scale: <input type="range" id="scale-slider" min="50" max="150" value="100">%</label>
				<label><input type="checkbox" id="zoom-to-fit"> Zoom to Fit</label>
			</div>
			<button id="screens-btn">Import Screens</button>
			<div id="open-btn">Open Manifest</div>
			<div id="gen-btn">Generate Manifest</div>
			<button id="switch-btn">Switch Layout</button>
			<textarea id="preview-pane" readonly></textarea>
			<div class="image-editor hidden">
				<div class="editor-header">
					<button id="closeEditor">✕</button>
					<button id="saveEditor">Save</button>
				</div>
				<div class="editor-canvas">
					<img id="editorImage" src="" class="editor-image" />
					<div id="editorRectsContainer"></div>
				</div>
			</div>
			<div id="tile-cont"></div>
		`);

    // Import Screens
    $('#screens-btn').on('click', async () => {
      const result = await window.electronAPI.selectScreensFolder();
      if (result.canceled || !result.filePaths.length) return;

      const selectedFolder = result.filePaths[0];
      const appDir = await window.electronAPI.getAppDir();
      const importResult = await window.electronAPI.importScreens(selectedFolder, appDir);

      if (importResult.success) {
        if (window.tileRenderer?.showTiles) {
          window.tileRenderer.showTiles(window.tileArr, false);
        }
        alert('Screens imported successfully.');
      } else {
        alert('Error importing screens');
      }
    });
	}
};

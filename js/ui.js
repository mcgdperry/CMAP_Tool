window.ui = {
  setup: function () {
    $('#bg1').append(`
      <input type="text" id="inp-brandname" maxlength="30" name="brandname" placeholder="Name of brand">
      <div id="zoom-controls">
        <label>Scale: <input type="range" id="scale-slider" min="50" max="150" value="100">%</label>
        <label><input type="checkbox" id="zoom-to-fit"> Zoom to Fit</label>
      </div>
      <div id="toolbar">
        <button id="screens-btn">Import Screens</button>
        <button id="open-btn">Open Manifest</button>
        <button id="gen-btn">Generate Manifest</button>
        <button id="switch-btn">Switch Layout</button>
        <button id="export-json">Export JSON</button>
        <button id="export-js">Export JS</button>
        <button id="export-css">Export CSS</button>
      </div>
      <textarea id="preview-pane" readonly></textarea>
      <div class="image-editor hidden">
        <div class="editor-header">
        <div id="editor-info"></div>
          <button id="closeEditor">✕</button>
          <button id="saveEditor">Save</button>
        </div>
        <div class="editor-canvas">
          <img id="editorImage" src="" class="editor-image" />
          <div id="editorRectsContainer"></div>
        </div>
      </div>
      <div id="map-scroll">
        <div id="tile-cont"></div>
      </div>
      <div id="drop-overlay"><div id="drop-message">📂 Drop Screens Folder Here</div></div>
    `);

    // -- Screens Button Handler (normal import) --
    $('#screens-btn').on('click', async () => {
      const result = await window.electronAPI.selectScreensFolder();
      if (result.canceled || !result.filePaths.length) return;

      const selectedFolder = result.filePaths[0];
      const appDir = await window.electronAPI.getAppDir();
      const importResult = await window.electronAPI.importScreens(selectedFolder, appDir);

      if (!importResult.success) {
        alert('Error importing screens: ' + (importResult.error || 'Unknown error'));
        return;
      }

      await window.ui._loadScreensAndLayout();
      window.ui.showToast('✅ Screens imported successfully!');
    });

    // -- Drop Handler (drag folder) --
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      $('#drop-overlay').addClass('show');
    });

    document.addEventListener('dragleave', (e) => {
      $('#drop-overlay').removeClass('show');
    });

    document.addEventListener('drop', async (e) => {
      e.preventDefault();
      $('#drop-overlay').removeClass('show');
      //$('#tile-cont').empty();
      //window.tileArr = [];
      //window.importedTileAssets = {};
      const items = e.dataTransfer.items;
      if (!items.length) return;

      const firstItem = items[0];
      if (!firstItem.webkitGetAsEntry) {
        alert('Folder drag not supported.');
        return;
      }

      const entry = firstItem.webkitGetAsEntry();
      if (entry && entry.isDirectory) {
        const files = [];

        const reader = entry.createReader();
        const entries = await new Promise(resolve => reader.readEntries(resolve));

        for (const ent of entries) {
          if (ent.isFile) {
            const file = await new Promise(resolve => ent.file(resolve));
            files.push(file);
          }
        }
        
        if (files.length) {
          $('#tile-cont').empty();
          await window.ui._copyDroppedFiles(files);
          await window.ui._loadScreensAndLayout();
          window.ui.showToast('✅ Folder dropped and loaded!');
        } else {
          alert('Dropped folder has no valid images.');
        }
      } else {
        alert('Please drop a full folder.');
        return;
      }
    });

    document.getElementById('export-json').addEventListener('click', async () => {
      const sortedTiles = Object.keys(window.projectData.tiles)
        .sort((a, b) => {
          const [colA, rowA] = a.split('_').map(Number);
          const [colB, rowB] = b.split('_').map(Number);
          return colA - colB || rowA - rowB;
        })
        .reduce((acc, key) => {
          acc[key] = window.projectData.tiles[key];
          return acc;
        }, {});
    
      const sortedProjectData = {
        ...window.projectData,
        tiles: sortedTiles
      };
    
      const jsonString = JSON.stringify(sortedProjectData, null, 2);
      await window.electronAPI.saveAttachment('projectData.json', jsonString, false);
      alert('JSON exported!');
    });

    $('#export-js').on('click', async () => {
      const tiles = window.projectData.tiles;
      for (const tileId in tiles) {
        const docked = tiles[tileId].docked || {};
        const lines = Object.entries(docked).map(
          ([btnId, tabId]) => `$('#${btnId}').appendTo('#${tabId}');`
        );
        const content = lines.join('\n');
        if (content) {
          await window.electronAPI.saveAttachment(`js/slide_${tileId}.js`, content, false);
        }
      }
      alert('JS files exported!');
    });
    
    $('#export-css').on('click', async () => {
      const tiles = window.projectData.tiles;
      for (const tileId in tiles) {
        const rects = tiles[tileId].rects || {};
        let css = '';
        for (const selector in rects) {
          const { top, left, width, height } = rects[selector];
          css += `${selector} {\n  top: ${top}px;\n  left: ${left}px;\n  width: ${width}px;\n  height: ${height}px;\n}\n\n`;
        }
        if (css) {
          await window.electronAPI.saveAttachment(`css/slide_${tileId}.css`, css, false);
        }
      }
      alert('CSS files exported!');
    });
  },

  // -- Copy dropped files into screens folder
  _copyDroppedFiles: async (files) => {
    const appDir = await window.electronAPI.getAppDir();
    const screensFolder = `${appDir}/screens`;
  
    const fileList = await Promise.all(files.map(async (file) => {
      const arrayBuffer = await file.arrayBuffer();
      return {
        name: file.name,
        data: new Uint8Array(arrayBuffer)
      };
    }));
  
    await window.electronAPI.deleteScreensFolder(screensFolder);
  
    const copyResult = await window.electronAPI.copyFilesToScreens(fileList, screensFolder);
    if (!copyResult.success) {
      alert('Error copying dropped files: ' + (copyResult.error || 'Unknown error'));
    }
    window.projectData = { tiles: {} };
    // 👉 Clear projectData.tiles so layout refresh works cleanly
    window.projectData.tiles = {};
  },

  // -- After any import (button or drop), clean tiles and load
  _loadScreensAndLayout: async () => {
    const scanResult = await window.electronAPI.readScreensFolder();
    if (!scanResult.success) {
      alert('Error scanning screens folder.');
      return;
    }
  
    const files = scanResult.files.filter(f => /\.(jpg|jpeg|png)$/i.test(f));
    if (!files.length) {
      alert('No valid images found');
      return;
    }
  
    $('#tile-cont').empty();
    window.projectData = { tiles: {} }; // 🔥 Clear and reset
  
    const cacheBuster = Date.now();
    const assetsByTile = {};
  
    files.forEach(filename => {
      if (!filename.startsWith('slide_')) return;
  
      const base = filename.split('.')[0];
      const parts = base.split('_');
      if (parts.length < 3) return;
  
      const col = parseInt(parts[1]);
      const row = parseInt(parts[2]);
      if (isNaN(col) || isNaN(row)) return;
  
      const key = `${col}_${row.toString().padStart(2, '0')}`;
      //const relPath = `screens/${filename}?v=${cacheBuster}`;
      const relPath = `screens/${filename}`;
  
      if (!assetsByTile[key]) {
        assetsByTile[key] = { thumb: '', tabs: [], mods: [], refs: [] };
      }
  
      if (/_bg1\.(jpg|png)$/i.test(filename)) {
        if (!assetsByTile[key].thumb) assetsByTile[key].thumb = relPath;
      } else if (/_tab1\.(jpg|png)$/i.test(filename)) {
        // fallback only if no _bg1 exists yet
        if (!assetsByTile[key].thumb) assetsByTile[key].thumb = relPath;
        assetsByTile[key].tabs.push(relPath);
      } else if (/_tab\d+\.(jpg|png)$/i.test(filename)) {
        assetsByTile[key].tabs.push(relPath);
      } else if (/_mod\d+\.(jpg|png)$/i.test(filename)) {
        assetsByTile[key].mods.push(relPath);
      } else if (/_ref\d+\.(jpg|png)$/i.test(filename)) {
        assetsByTile[key].refs.push(relPath);
      }/**/
    });
  
    // 🔄 Convert to projectData.tiles
    for (const tileId in assetsByTile) {
      window.projectData.tiles[tileId] = {
        label: `Slide ${tileId.replace('_', '-')}`,
        images: {
          thumb: assetsByTile[tileId].thumb,
          tabs: assetsByTile[tileId].tabs,
          mods: assetsByTile[tileId].mods,
          refs: assetsByTile[tileId].refs
        },
        docked: {},  // Will be populated when indicators are dragged
        rects: {}    // Will be populated from editor
      };
    }
  
    window.tileRenderer.showTiles(window.projectData, false);
  
    if (window.previewPane?.update) {
      window.previewPane.update();
    }
  },

  showToast: function (message = '✅ Action Completed!') {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'show';
    setTimeout(() => {
      toast.className = toast.className.replace('show', '');
    }, 2000);
  }
};


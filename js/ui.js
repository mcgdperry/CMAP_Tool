window.ui = {
  setup: function () {
    $('#bg1').append(`
      <input type="text" id="inp-brandname" maxlength="30" name="brandname" placeholder="Name of brand/IVA">
      <input type="text" id="inp-product" maxlength="30" name="product" placeholder="Product Name">
      <div id="zoom-controls">
        <label>Scale: <input type="range" id="scale-slider" min="50" max="150" value="100">%</label>
        <label><input type="checkbox" id="zoom-to-fit"> Zoom to Fit</label>
      </div>

      <div id="toolbar">
        <button id="screens-btn">Import Screens</button>
        <button id="open-btn">Open Manifest</button>
        <button id="gen-btn">Generate Manifest</button>
        <button id="switch-btn">Switch Layout</button>
        <button id="import-json">Import JSON</button>
        <button id="export-json">Export JSON</button>
        <button id="export-js">Export JS</button>
        <button id="export-css">Export CSS</button>
        <button id="export-veeva">Export Veeva</button>
      </div>
      <textarea id="preview-pane" readonly></textarea>

      <div class="image-editor hidden">
          <div class="editor-header">
            <div class="editor-tools">
              <label>Scale: <input type="range" id="editor-scale" min="50" max="200" value="100">%</label>
              <select id="editor-resolution">
                <option value="1024x768">1024×768</option>
                <option value="1194x834">1194×834</option>
                <option value="1366x1024">1366×1024</option>
                <option value="2048x1536">2048×1536</option>
              </select>
              <label><input type="checkbox" id="show-overlay"> Show Overlays</label>
              <label><input type="checkbox" id="show-guide-layer"> Show Guide Layer</label>
              <label><input type="checkbox" id="show-tablet-frame"> Show Frame</label>
            </div>
          </div>
          <div id="editor-panel" class="editor-panel-draggable">
            <div id="editor-panel-header">
              <span>Rect Editor</span>
              <button id="closeEditor">✕</button>
              <button id="saveEditor">Save</button>
            </div>
            <div id="editor-panel-content">
              <div id="editor-rect-controls">
                <label style="margin-bottom:8px;display:block;">
                  <input type="checkbox" id="show-global-rects" style="margin-right:6px;"> Show Global Rects
                </label>
                <h4 style="margin:6px 0 4px 0;font-size:13px;">Show/Hide & Add</h4>
                <div class="rect-type-toggles">
                  <div class="rect-type-row">
                    <input type="checkbox" class="rect-type-toggle" data-type="mod" checked style="width:16px;height:16px;margin-right:4px;">
                    <button id="add-mod-btn" class="rect-type-btn fancy-btn">+ Mod</button>
                  </div>
                  <div class="rect-type-row">
                    <input type="checkbox" class="rect-type-toggle" data-type="ref" checked style="width:16px;height:16px;margin-right:4px;">
                    <button id="add-ref-btn" class="rect-type-btn fancy-btn">+ Ref</button>
                  </div>
                  <div class="rect-type-row">
                    <input type="checkbox" class="rect-type-toggle" data-type="tab" checked style="width:16px;height:16px;margin-right:4px;">
                    <button id="add-tab-btn" class="rect-type-btn fancy-btn">+ Tab</button>
                  </div>
                  <div class="rect-type-row">
                    <input type="checkbox" class="rect-type-toggle" data-type="link" checked style="width:16px;height:16px;margin-right:4px;">
                    <button id="add-link-btn" class="rect-type-btn fancy-btn">+ Link</button>
                  </div>
                  <div class="rect-type-row">
                    <input type="checkbox" class="rect-type-toggle" data-type="alt" checked style="width:16px;height:16px;margin-right:4px;">
                    <button id="add-alt-btn" class="rect-type-btn fancy-btn">+ Alt</button>
                  </div>
                  <div class="rect-type-row">
                    <input type="checkbox" class="rect-type-toggle" data-type="pres" checked style="width:16px;height:16px;margin-right:4px;">
                    <button id="add-pres-btn" class="rect-type-btn fancy-btn">+ Pres</button>
                  </div>
                  <div class="rect-type-row">
                    <input type="checkbox" class="rect-type-toggle" data-type="pdf" checked style="width:16px;height:16px;margin-right:4px;">
                    <button id="add-pdf-btn" class="rect-type-btn fancy-btn">+ PDF</button>
                  </div>
                  <div class="rect-type-row">
                    <input type="checkbox" class="rect-type-toggle" data-type="vid" checked style="width:16px;height:16px;margin-right:4px;">
                    <button id="add-vid-btn" class="rect-type-btn fancy-btn">+ Vid</button>
                  </div>
                </div>
              </div>
              <div class="editor-meta" style="margin-top:10px;">
                <strong>Tile ID:</strong> <span id="meta-tile-id"></span><br />
                <strong>Image:</strong> <span id="meta-image"></span><br />
                <strong>Rects:</strong> <span id="meta-rect-count"></span><br />
                <label style="font-size:12px;">Title: <input type="text" id="meta-tile-label" style="width:60%;font-size:12px;" /></label>
              </div>
              <div id="editor-inspector-panel" class="side-panel" style="margin-top:10px;">
                <h4 style="font-size:13px;margin-bottom:6px;">Rect Inspector</h4>
                <div id="rect-name" style="font-size:12px;margin-bottom:4px;"></div>
                <div class="insp-fields" style="display:flex;flex-wrap:wrap;gap:6px;">
                  <label style="width:24%;font-size:11px;">Top:<input type="number" id="rect-top" style="width:90%;font-size:11px;" /></label>
                  <label style="width:24%;font-size:11px;">Left:<input type="number" id="rect-left" style="width:90%;font-size:11px;" /></label>
                  <label style="width:24%;font-size:11px;">Width:<input type="number" id="rect-width" style="width:90%;font-size:11px;" /></label>
                  <label style="width:24%;font-size:11px;">Height:<input type="number" id="rect-height" style="width:90%;font-size:11px;" /></label>
                </div>
                <div class="insp-fields" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;">
                  <label style="width:48%;font-size:11px;">Value:<input type="text" id="rect-value" style="width:90%;font-size:11px;" /></label>
                  <label style="width:48%;font-size:11px;">Target:<input type="text" id="rect-target" style="width:90%;font-size:11px;" /></label>
                </div>
              </div>
            </div>
          </div>
          <div class="editor-canvas">
            <img id="editorImage" src="" class="editor-image" />
            <div id="editorRectsContainer"></div>
            <div id="globalRectsContainer" style="pointer-events: none;"></div>
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
      const brand = document.getElementById('inp-brandname')?.value?.trim();
      if (!brand) {
        alert('Enter a brand/IVA name first');
        return;
      }
      
      const clonedTiles = JSON.parse(JSON.stringify(window.projectData.tiles));

      // ✅ Simplify image arrays into counts (on the clone)
      Object.entries(clonedTiles).forEach(([tileId, tileData]) => {
        const mods = tileData.images?.mods || [];
        const refs = tileData.images?.refs || [];
        const tabs = tileData.images?.tabs || [];
        const thumb = tileData.images?.thumb;

        tileData.images = {
          modCount: mods.length,
          refCount: refs.length,
          tabCount: tabs.length,
          thumb // Keep the thumb intact so nothing breaks on re-render
        };
      });

      const sortedTiles = Object.keys(clonedTiles)
        .sort((a, b) => {
          const [colA, rowA] = a.split('_').map(Number);
          const [colB, rowB] = b.split('_').map(Number);
          return colA - colB || rowA - rowB;
        })
        .reduce((acc, key) => {
          acc[key] = clonedTiles[key];
          return acc;
        }, {});

      const jsonString = JSON.stringify({
        ...window.projectData,                                 // existing project-level data
        brandname: document.getElementById('inp-brandname')?.value || '', // updated brand input
        Product: document.getElementById('inp-product')?.value || '',     // updated product input
        tiles: sortedTiles                                     // sorted tile data
      }, null, 2);

      const filePath = `${brand}_projectData.json`;
      await window.electronAPI.saveAttachment(filePath, jsonString, false);
      alert(`Saved: ${filePath}`);
      //await window.electronAPI.saveAttachment('projectData.json', jsonString, false);
      //alert('JSON exported!');
      
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

    document.getElementById('export-veeva')?.addEventListener('click', () => {
      window.veevaExporter.export();
    });

    $('#import-json').on('click', async () => {
      try {
        const filePath = await window.electronAPI.selectFile('json');
        if (!filePath) return;
    
        const jsonContent = await window.electronAPI.readJsonFile(filePath);
        if (!jsonContent.tiles) {
          alert('⚠️ Invalid JSON structure — missing "tiles" key.');
          return;
        }
    
        // 🔁 Convert counts into image paths
        /*
        Object.entries(jsonContent.tiles).forEach(([tileId, tileData]) => {
          tileData.images = tileData.images || {};
    
          const modCount = tileData.images.modCount || 0;
          tileData.images.mods = Array.from({ length: modCount }, (_, i) =>
            `screens/slide_${tileId}_mod${i + 1}.png`
          );
    
          const refCount = tileData.images.refCount || 0;
          tileData.images.refs = Array.from({ length: refCount }, (_, i) =>
            `screens/slide_${tileId}_ref${i + 1}.png`
          );
    
          const tabCount = tileData.images.tabCount || 0;
          tileData.images.tabs = Array.from({ length: tabCount }, (_, i) =>
            `screens/slide_${tileId}_tab${i + 1}.jpg`
          );  
        });
        */
        
        for (const [tileId, tileData] of Object.entries(jsonContent.tiles)) {
          tileData.images = tileData.images || {};
    
          const modCount = tileData.images.modCount || 0;
          tileData.images.mods = Array.from({ length: modCount }, (_, i) =>
            `screens/slide_${tileId}_mod${i + 1}.png`
          );
    
          const refCount = tileData.images.refCount || 0;
          tileData.images.refs = Array.from({ length: refCount }, (_, i) =>
            `screens/slide_${tileId}_ref${i + 1}.png`
          );
    
          const tabCount = tileData.images.tabCount || 0;
          tileData.images.tabs = Array.from({ length: tabCount }, (_, i) =>
            `screens/slide_${tileId}_tab${i + 1}.jpg`
          );  

          tileData.images.thumb = `screens/slide_${tileId}_bg1.jpg`;

          const bgExists = await window.electronAPI.fileExists(tileData.images.thumb);
          if (!bgExists && tabCount > 0) {
            tileData.images.thumb = `screens/slide_${tileId}_tab1.jpg`;
          }

          const fallbackExists = await window.electronAPI.fileExists(tileData.images.thumb);
          if (!fallbackExists) {
            tileData.images.thumb = 'images/placeholder.png';
          }
          const thumbPath = `screens/slide_${tileId}_bg1.jpg`;
          const hasBg1 = await window.electronAPI.fileExists(thumbPath);
          const fallback = `screens/slide_${tileId}_tab1.jpg`;
          const hasFallback = await window.electronAPI.fileExists(fallback);
          tileData.images.thumb = hasBg1 ? thumbPath : (hasFallback ? fallback : 'images/placeholder.png');

        }

        // ✅ Commit to window.projectData and refresh
        window.projectData = jsonContent;

        document.getElementById('inp-brandname').value = jsonContent.brandname || '';
        document.getElementById('inp-product').value = jsonContent.Product || '';

    
        if (window.tileRenderer?.showTiles) {
          window.tileRenderer.showTiles(window.projectData, window.tileRenderer.isVerticalLayout);
        }
    
        if (window.previewPane?.update) {
          window.previewPane.update();
        }
    
        alert('✅ JSON imported and layout updated!');
      } catch (err) {
        console.error('Error importing JSON:', err);
        alert('❌ Failed to import JSON.');
      }
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
    window.projectData = {
      brandname: '',
      Product: '',
      tiles: {}
    }; // 🔥 Clear and reset
  
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

// Make editor panel draggable
(function() {
  // Wait until DOM is ready and panel exists
  $(document).on('mousedown', '#editor-panel-header', function(e) {
    const panel = document.getElementById('editor-panel');
    if (!panel) return;
    let offsetX = e.clientX - panel.offsetLeft;
    let offsetY = e.clientY - panel.offsetTop;
    let isDragging = true;
    document.body.style.userSelect = 'none';

    function onMouseMove(ev) {
      if (!isDragging) return;
      panel.style.left = `${ev.clientX - offsetX}px`;
      panel.style.top = `${ev.clientY - offsetY}px`;
    }
    function onMouseUp() {
      isDragging = false;
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
})();

// Rect type toggle logic (works for both global and non-global mode)
$(document).on('change', '.rect-type-toggle', function() {
  const type = $(this).data('type');
  const checked = $(this).is(':checked');
  // Toggle in both containers
  $('#editorRectsContainer .rect, #globalRectsContainer .rect').each(function() {
    const sel = $(this).data('selector') || '';
    if (sel.includes(`${type}-btn`)) {
      $(this).toggle(checked);
    }
  });
});

// Restore: Show Global Rects checkbox toggles global mode
$(document).off('change', '#show-global-rects').on('change', '#show-global-rects', function() {
  const checked = $(this).is(':checked');
  window.editorPanel.setGlobalMode(checked);
});

// --- Show Global Rects logic: hide per-tile rects, show only global rects when checked ---
$(document).off('change', '#show-global-rects').on('change', '#show-global-rects', function() {
  const checked = $(this).is(':checked');
  // Hide/show per-tile rects and global rects containers
  $('#editorRectsContainer').toggle(!checked);
  $('#globalRectsContainer').toggle(checked);
  // Optionally, update editorPanel mode for correct logic
  window.editorPanel.setGlobalMode(checked);
});


window.veevaExporter = {
  async export() {
    const brandname = document.getElementById('inp-brandname')?.value?.trim();
    const product = document.getElementById('inp-product')?.value?.trim();
    if (!brandname) return alert('Please enter a brand name.');

    const appDir = await window.electronAPI.getAppDir();
    const screensDir = `${appDir}/screens`;
    //const screensDir = path.join(appDir, 'screens');
    const exportDir = screensDir.replace(/screens[\/\\]?$/, '') + `${brandname}_IVA`;
    

    //const exportDir = path.join(appDir, `${brandname}_IVA`);
    await window.electronAPI.makeDir(exportDir);

    // Copy manifest
    //const manifestText = document.getElementById('preview-pane')?.value || '';
    const manifestText = window.manifest.generateText();
    await window.electronAPI.saveAttachment(`${exportDir}/presManifest.txt`, manifestText, false);

    // Make global folder
    //await this._setupTileFolders(path.join(exportDir, 'global'));
    await this._setupTileFolders(`${exportDir}/global`);

    const tiles = window.projectData.tiles || {};
    for (const tileId in tiles) {
      const tile = tiles[tileId];
      const folderName = `${brandname}_IVA_${tileId}`;
      //const tilePath = path.join(exportDir, folderName);
      const tilePath = `${exportDir}/${folderName}`;
      await this._setupTileFolders(tilePath);
/*
      const allScreenFiles = await window.electronAPI.readScreensFolder();
      if (allScreenFiles?.files?.length) {
        const regex = new RegExp(`^slide_${tileId}_.+\\.(jpg|png)$`, 'i');

        for (const file of allScreenFiles.files) {
          if (regex.test(file)) {
            const src = `${appDir}/screens/${file}`;
            const dest = `${tilePath}/images/${file}`;
            await window.electronAPI.copyFile(src, dest);
          }
        }
      }*/

      const allKeys = Object.keys(tile.rects || {});
      for (const sel of allKeys) {
        const match = sel.match(/^#(mod|ref|tab)-btn(\d+)/);
        if (!match) continue;

        const [_, type, index] = match;
        const baseName = `slide_${tileId}_${type}${index}`;
        const destDir = `${tilePath}/images`;

        const pngPath = `screens/${baseName}.png`;
        const jpgPath = `screens/${baseName}.jpg`;

        const pngExists = await window.electronAPI.fileExists(pngPath);
        const jpgExists = await window.electronAPI.fileExists(jpgPath);

        if (pngExists) {
          await window.electronAPI.copyFile(pngPath, `${destDir}/${baseName}.png`);
        } else if (jpgExists) {
          await window.electronAPI.copyFile(jpgPath, `${destDir}/${baseName}.jpg`);
        } else {
          // No image found — decide placeholder format
          const fallbackExt = type === 'tab' ? 'jpg' : 'png';
          const placeholder = fallbackExt === 'jpg'
            ? 'images/zany-placeholder.jpg'
            : 'images/zany-placeholder.png';

          await window.electronAPI.copyFile(placeholder, `${destDir}/${baseName}.${fallbackExt}`);
        }
      }

      const bg1Name = `slide_${tileId}_bg1.jpg`;
      const bg1Source = `screens/${bg1Name}`;
      const bg1Target = `${tilePath}/images/${bg1Name}`;
      const bg1Exists = await window.electronAPI.fileExists(bg1Source);
      if (bg1Exists) {
        await window.electronAPI.copyFile(bg1Source, bg1Target);
      }
      
      const baseImage = tile.images?.thumb?.replace('file://', '');
      if (baseImage && !baseImage.includes('placeholder')) {
        await window.electronAPI.resizeImage(baseImage, `${tilePath}/${folderName}-full.jpg`, 1024, 768);
        await window.electronAPI.resizeImage(baseImage, `${tilePath}/${folderName}-thumb.jpg`, 200, 150);
        //await window.electronAPI.resizeImage(baseImage, path.join(tilePath, `${folderName}-full.jpg`), 1024, 768);
        //await window.electronAPI.resizeImage(baseImage, path.join(tilePath, `${folderName}-thumb.jpg`), 200, 150);
      }

      // CSS
      const css = this._generateCSS(tileId, tile);
      await window.electronAPI.saveAttachment(`${tilePath}/css/slide_${tileId}.css`, css, false);
      //await window.electronAPI.saveAttachment(path.join(tilePath, 'css', `slide_${tileId}.css`), css, false);

      // JS
      const manifestTextLine = (manifestText.split('\n') || []).find(line => line.startsWith(`${brandname}_IVA_${tileId}|`)) || '';
      const manifestName = manifestTextLine.split('|')[1]?.trim() || tile.label || '';
      const js = this._generateJS(tileId, brandname, manifestName, tile);
      await window.electronAPI.saveAttachment(`${tilePath}/js/slide_${tileId}.js`, js, false);
     //await window.electronAPI.saveAttachment(path.join(tilePath, 'js', `slide_${tileId}.js`), js, false);

      // HTML
      const html = this._generateHTML(brandname, tileId, tile);
      await window.electronAPI.saveAttachment(`${tilePath}/${folderName}.html`, html, false);
      //await window.electronAPI.saveAttachment(path.join(tilePath, `${folderName}.html`), html, false);
    }

    alert('✔ Veeva export complete!');
  },

  async _setupTileFolders(basePath) {
    const folders = ['images', 'css', 'js', 'pdfs'];
    for (const name of folders) {
      await window.electronAPI.makeDir(`${basePath}/${name}`);
    }
  },

  async _copyImageIfExists(source, target) {
    const exists = await window.electronAPI.fileExists(source);
    if (exists) {
      await window.electronAPI.copyFile(source, target);
    }
  },

  _generateCSS(tileId, tile) {
    const lines = [`#bg1 {\n\tbackground-image: url('../images/slide_${tileId}_bg1.jpg');\n}`];
    for (const [sel, vals] of Object.entries(tile.rects || {})) {
      lines.push(`\n${sel} {\n\ttop: ${vals.top}px;\n\tleft: ${vals.left}px;\n\twidth: ${vals.width}px;\n\theight: ${vals.height}px;\n}`);
    }
    return lines.join('\n');
  },

  _generateJS(tileId, brandname, manifestName, tile) {
    const docked = tile.docked || {};
    const appendLines = Object.entries(docked).map(([btn, target]) => `\t\t$("#${btn}").appendTo("#${target}");`);
    return `(function(${brandname}, $, undefined) {
    var num;

    ${brandname}.loadData = function() {};

    $(function() {
      TRACKING.track("Slide View", "${manifestName}_SLIDE_VIEW", "${manifestName}");
  ${appendLines.join('\n')}
    });
  }(window.${brandname} = window.${brandname} || {}, Zepto))`;
  },
  
  _generateHTML(brandname, tileId, tile) {
    const slideId = tileId.replace('_0', '_').replace('_', '.'); // 2_01 → 2.1
    const tabCount = tile.rects ? Object.keys(tile.rects).filter(k => k.includes('tab-btn')).length : 0;
    const modCount = tile.rects ? Object.keys(tile.rects).filter(k => k.includes('mod-btn')).length : 0;
    const refCount = tile.rects ? Object.keys(tile.rects).filter(k => k.includes('ref-btn')).length : 0;
    const altCount = tile.rects ? Object.keys(tile.rects).filter(k => k.includes('alt-btn')).length : 0;
    const presCount = tile.rects ? Object.keys(tile.rects).filter(k => k.includes('pres-btn')).length : 0;
    const linkCount = tile.rects ? Object.keys(tile.rects).filter(k => k.includes('link-btn')).length : 0;

    const slideJs = `js/slide_${tileId}.js`;
    const slideCss = `css/slide_${tileId}.css`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=0">
  <title></title>
  <link rel="stylesheet" href="../global/css/global.css">
  <link rel="stylesheet" href="${slideCss}">
</head>
<body>
  <div id="frame"><div id="bg-holder"><div id="bg1" class="bg"></div></div></div>
  <script src="../global/js/zepto.min.js"></script>
  <script src="../global/js/irep_tracking.js"></script>
  <script src="../global/js/iscroll.js"></script>
  <script src="../global/js/navigation.js"></script>
  <script src="../global/js/main.js"></script>
  <script src="../global/js/veeva-library.js"></script>
  <script src="${slideJs}"></script>
  <script>
    document.addEventListener('touchmove', function(e) { e.preventDefault(); }, false);
    ${brandname}.numTabs = ${tabCount};
    ${brandname}.numMods = ${modCount};
    ${brandname}.numRefs = ${refCount};
    ${brandname}.numAlts = ${altCount};
    ${brandname}.numPres = ${presCount};
    ${brandname}.numLinks = ${linkCount};
    ${brandname}.NAV.active = '${slideId}';
  </script>
</body>
</html>`;
  }
};

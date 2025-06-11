window.veevaExporter = {
  async export() {
    const brandname = document.getElementById('inp-brandname')?.value?.trim();
    const product = document.getElementById('inp-product')?.value?.trim();
    if (!brandname) return alert('Please enter a brand name.');

    const appDir = await window.electronAPI.getAppDir();
    const screensDir = `${appDir}/screens`;
    const exportDir = screensDir.replace(/screens[\/\\]?$/, '') + `${brandname}_IVA`;

    // --- Ensure exportDir exists before saving files ---
    await window.electronAPI.makeDir(exportDir);

    // Save manifest
    const manifestText = window.manifest.generateText();
    await window.electronAPI.saveAttachment(`${exportDir}/presManifest.txt`, manifestText, false);

    // --- GLOBAL FOLDER: create only "global" (not [Brand]_IVA_global) ---
    const globalPath = `${exportDir}/global`;
    await this._setupGlobalFolders(globalPath);

    // --- GLOBAL CSS: combine global_template.css with global rect css into global.css in the global folder ---
    const globalRects = window.projectData.tiles.global?.rects || {};
    let globalCss = '';
    Object.entries(globalRects).forEach(([sel, vals]) => {
      globalCss += `${sel} {\n`;
      if (vals.top !== undefined) globalCss += `  top: ${vals.top}px;\n`;
      if (vals.left !== undefined) globalCss += `  left: ${vals.left}px;\n`;
      if (vals.width !== undefined) globalCss += `  width: ${vals.width}px;\n`;
      if (vals.height !== undefined) globalCss += `  height: ${vals.height}px;\n`;
      globalCss += `}\n\n`;
    });
    // Use just the filename; readAttachment will resolve to app folder
    const templatePath = 'global_template.css';
    let templateCss = '';
    try {
      templateCss = await window.electronAPI.readAttachment(templatePath);
    } catch {}
    const finalGlobalCss = (templateCss || '') + '\n' + globalCss;
    await window.electronAPI.saveAttachment(`${globalPath}/css/global.css`, finalGlobalCss, false);

    // --- Copy global PDFs and VIDs if any ---
    // Copy PDFs/VIDs referenced in global rects to global/pdfs and global/vids
    const globalPdfsDir = `${globalPath}/pdfs`;
    const globalVidsDir = `${globalPath}/vids`;
    await window.electronAPI.makeDir(globalPdfsDir);
    await window.electronAPI.makeDir(globalVidsDir);

    for (const [sel, rect] of Object.entries(globalRects)) {
      // PDF
      if (rect.pdf) {
        let src = `${appDir}/pdfs/${rect.pdf}`;
        let exists = await window.electronAPI.fileExists(src);
        if (!exists) {
          src = `pdfs/${rect.pdf}`;
          exists = await window.electronAPI.fileExists(src);
        }
        if (exists) {
          await window.electronAPI.copyFile(src, `${globalPdfsDir}/${rect.pdf}`);
        }
      }
      // VID
      if (rect.vid) {
        let src = `${appDir}/vids/${rect.vid}`;
        let exists = await window.electronAPI.fileExists(src);
        if (!exists) {
          src = `vids/${rect.vid}`;
          exists = await window.electronAPI.fileExists(src);
        }
        if (exists) {
          await window.electronAPI.copyFile(src, `${globalVidsDir}/${rect.vid}`);
        }
      }
    }

    // --- TILE EXPORT ---
    const tiles = window.projectData.tiles || {};
    for (const tileId in tiles) {
      if (tileId === 'global') continue; // skip global tile for folders
      const tile = tiles[tileId];
      const folderName = `${brandname}_IVA_${tileId}`;
      const tilePath = `${exportDir}/${folderName}`;
      await this._setupTileFolders(tilePath);

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

      // --- PDF Export: Copy PDFs to tile/pdfs folder ---
      const pdfsDir = `${appDir}/pdfs`;
      const exportPdfsDir = `${tilePath}/pdfs`;
      await window.electronAPI.makeDir(exportPdfsDir);

      // --- VID Export: Copy VIDs to tile/vids folder ---
      const vidsDir = `${appDir}/vids`;
      const exportVidsDir = `${tilePath}/vids`;
      await window.electronAPI.makeDir(exportVidsDir);

      // --- Copy PDFs and VIDs referenced in rects (from projectData, from app-level pdfs/vids) ---
      for (const [sel, rect] of Object.entries(tile.rects || {})) {
        // PDF
        if (rect.pdf) {
          let src = `${pdfsDir}/${rect.pdf}`;
          let exists = await window.electronAPI.fileExists(src);
          if (!exists) {
            src = `pdfs/${rect.pdf}`;
            exists = await window.electronAPI.fileExists(src);
          }
          if (exists) {
            await window.electronAPI.copyFile(src, `${exportPdfsDir}/${rect.pdf}`);
          }
        }
        // VID
        if (rect.vid) {
          let src = `${vidsDir}/${rect.vid}`;
          let exists = await window.electronAPI.fileExists(src);
          if (!exists) {
            src = `vids/${rect.vid}`;
            exists = await window.electronAPI.fileExists(src);
          }
          if (exists) {
            await window.electronAPI.copyFile(src, `${exportVidsDir}/${rect.vid}`);
          }
        }
      }

      // CSS
      const css = this._generateCSS(tileId, tile);
      await window.electronAPI.saveAttachment(`${tilePath}/css/slide_${tileId}.css`, css, false);

      // JS
      const manifestTextLine = (manifestText.split('\n') || []).find(line => line.startsWith(`${brandname}_IVA_${tileId}|`)) || '';
      const manifestName = manifestTextLine.split('|')[1]?.trim() || tile.label || '';
      const js = this._generateJS(tileId, brandname, manifestName, tile);
      await window.electronAPI.saveAttachment(`${tilePath}/js/slide_${tileId}.js`, js, false);

      // HTML
      const html = this._generateHTML(brandname, tileId, tile);
      await window.electronAPI.saveAttachment(`${tilePath}/${folderName}.html`, html, false);
    }

    alert('✔ Veeva export complete!');
  },

  async _setupGlobalFolders(globalPath) {
    // Create css, vids, pdfs, images, js folders
    await window.electronAPI.makeDir(`${globalPath}/css`);
    await window.electronAPI.makeDir(`${globalPath}/vids`);
    await window.electronAPI.makeDir(`${globalPath}/pdfs`);
    await window.electronAPI.makeDir(`${globalPath}/images`);
    await window.electronAPI.makeDir(`${globalPath}/js`);
  },

  async _setupTileFolders(basePath) {
    const folders = ['images', 'css', 'js', 'pdfs', 'vids'];
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
    // Use tab1 image if tabs exist, else bg1
    let bgImg = `slide_${tileId}_bg1.jpg`;
    const hasTabs = Array.isArray(tile.images?.tabs) && tile.images.tabs.length > 0;
    if (hasTabs) {
      bgImg = `slide_${tileId}_tab1.jpg`;
    }
    const lines = [`#bg1 {\n\tbackground-image: url('../images/${bgImg}');\n}`];
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

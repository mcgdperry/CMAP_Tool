const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = !app.isPackaged;

ipcMain.handle('select-screens-folder', async () => {
	const result = await dialog.showOpenDialog({
		properties: ['openDirectory'],
		title: 'Select Folder Containing Screen Images',
	});
	if (result.canceled || result.filePaths.length === 0) return null;
	return result.filePaths[0];
});

ipcMain.handle('get-app-dir', () => {
	return app.isPackaged ? path.dirname(process.execPath) : __dirname;
});

ipcMain.handle('importScreens', async (event, selectedFolderPath, appDir) => {
  console.log('importScreens triggered with:', selectedFolderPath, appDir);

  const screensDest = path.join(appDir, 'screens');

  try {
    // Remove existing "screens" folder if it exists
    if (fs.existsSync(screensDest)) {
      fs.rmSync(screensDest, { recursive: true, force: true });
    }

    // Recreate it
    fs.mkdirSync(screensDest);

    // Copy files from selectedFolderPath to screensDest
    const files = fs.readdirSync(selectedFolderPath);
    for (const file of files) {
      const src = path.join(selectedFolderPath, file);
      const dest = path.join(screensDest, file);
      fs.copyFileSync(src, dest);
    }

    console.log('Images copied successfully to:', screensDest);
    return { success: true };
  } catch (err) {
    console.error('Error copying images:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('selectScreensFolder', async () => {
  return dialog.showOpenDialog({ properties: ['openDirectory'] });
});

ipcMain.handle('getAppDir', () => {
  if (isDev) {
    return app.getAppPath();
  } else {
    const exePath = app.getPath('exe');
    const appBundleDir = path.dirname(path.dirname(path.dirname(path.dirname(exePath)))); // Up 3 levels from Contents/MacOS
    return appBundleDir;
  }
});

ipcMain.handle('save-rect-css', async (event, filename, contents) => {
  const saveDir = path.join(app.getAppPath(), '../../../..', 'css');
  const savePath = path.join(saveDir, path.basename(filename));

  // Ensure the directory exists
  if (!fs.existsSync(saveDir)) {
    fs.mkdirSync(saveDir, { recursive: true });
  }

  // Write the CSS file
  fs.writeFileSync(savePath, contents, 'utf-8');
});

ipcMain.handle('read-rect-css', async (event, filename) => {
  const cssPath = path.join(app.getAppPath(), '../../../..', filename); // or adjust to match your structure
  if (fs.existsSync(cssPath)) {
    return fs.readFileSync(cssPath, 'utf-8');
  }
  return '';
});

ipcMain.handle('read-attachment', async (event, filename) => {
  const filePath = path.join(app.getAppPath(), '../../../..', filename); // Outside app bundle
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    throw new Error(`Unable to read ${filePath}: ${err.message}`);
  }
});


ipcMain.handle('save-attachment', async (event, filename, lineToWrite, update = false) => {
	const savePath = path.join(app.getAppPath(), '../../../..', filename); // Adjusted for external writing

	// Ensure parent folder exists (like 'js/')
	const folder = path.dirname(savePath);
	if (!fs.existsSync(folder)) {
		fs.mkdirSync(folder, { recursive: true });
	}

	let existingLines = [];
	if (fs.existsSync(savePath)) {
		const content = fs.readFileSync(savePath, 'utf-8');
		existingLines = content.split('\n').filter(line => line.trim());
	}

	const btnId = (lineToWrite.match(/\$\('#(.+?)'\)/) || [])[1];
	const filtered = existingLines.filter(line => !line.includes(`$('#${btnId}')`));
	filtered.push(lineToWrite.trim());

	fs.writeFileSync(savePath, filtered.join('\n') + '\n', 'utf-8');
});

/*
function getAppDir() {
  return isDev ? process.cwd() : path.dirname(process.execPath);
}
*/

let win;

function createWindow() {
    win = new BrowserWindow({
        width: 1600,
        height: 1000,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // ⬅️ This is where the bridge goes
            contextIsolation: true,
            nodeIntegration: false
        },
        icon: path.join(__dirname, 'icon.png')
    });

    win.loadFile('index.html');

    win.on('closed', () => {
        win = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Handle IPC from renderer
ipcMain.on('generate-manifest', (event, fileContent) => {
  let outputDir;

  if (app.isPackaged) {
    // e.g., from /Applications/Generator.app/Contents/MacOS to /Applications
    outputDir = path.resolve(path.dirname(app.getPath('exe')), '..', '..', '..');
  } else {
    outputDir = app.getAppPath();
  }

  const filePath = path.join(outputDir, 'presManifest.txt');

  try {
      fs.writeFileSync(filePath, fileContent);
      dialog.showMessageBox({
          type: 'info',
          message: 'Saved presManifest.txt to:\n' + filePath
      });
  } catch (err) {
      dialog.showErrorBox('Save Failed', err.message);
  }
});

ipcMain.handle('remove-lines-containing', async (event, filePath, search) => {
  try {
    const savePath = path.join(app.getAppPath(), '../../../..', filePath);
    if (!fs.existsSync(savePath)) return;

    const content = fs.readFileSync(savePath, 'utf-8');
    const updated = content
      .split('\n')
      .filter(line => !line.includes(search))
      .join('\n');

    fs.writeFileSync(savePath, updated, 'utf-8');
  } catch (err) {
    console.error('Failed to remove lines:', err);
  }
});

ipcMain.handle('openManifest', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{ name: 'Text Files', extensions: ['txt'] }],
    properties: ['openFile']
  });

  if (canceled || filePaths.length === 0) return { canceled: true };

  const fileContent = fs.readFileSync(filePaths[0], 'utf-8');
  return { canceled: false, content: fileContent };
});

ipcMain.handle('get-tile-assets', async (event, tileId) => {
	const appDir = path.resolve(path.dirname(app.getPath('exe')), '..', '..', '..');
	const screensDir = path.join(appDir, 'screens');
	const result = { thumb: null, tabs: [], mods: [], refs: [] };

	const base = `slide_${tileId}`;
	const files = fs.existsSync(screensDir) ? fs.readdirSync(screensDir) : [];

	for (let file of files) {
		if (!file.startsWith(base)) continue;

		const lower = file.toLowerCase();
		const extOk = lower.endsWith('.jpg') || lower.endsWith('.png');
		if (!extOk) continue;

		const fullPath = path.join(screensDir, file);
		const relPath = `file://${fullPath}`;

		if (/_bg1\.(jpg|png)$/i.test(file) && !result.thumb) result.thumb = relPath;
		else if (/_tab1\.(jpg|png)$/i.test(file) && !result.thumb) result.thumb = relPath;

		if (/_tab\d+\.(jpg|png)$/i.test(file)) result.tabs.push(relPath);
		if (/_mod\d+\.(jpg|png)$/i.test(file)) result.mods.push(relPath);
		if (/_ref\d+\.(jpg|png)$/i.test(file)) result.refs.push(relPath);
	}

	return result;
});

ipcMain.handle('select-and-copy-screens-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Screens Folder',
  });

  if (result.canceled || result.filePaths.length === 0) return { success: false, message: 'No folder selected' };

  const sourceDir = result.filePaths[0];

  const isDev = require('electron-is-dev');
  const appDir = isDev ? process.cwd() : path.dirname(process.execPath);
  const destDir = path.join(appDir, 'screens');

  try {
    // Remove existing contents if it exists
    if (fs.existsSync(destDir)) {
      fs.rmSync(destDir, { recursive: true, force: true });
    }

    // Recreate the screens folder
    fs.mkdirSync(destDir);

    // Copy all image files
    const validExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const files = fs.readdirSync(sourceDir).filter(file => {
      return validExts.includes(path.extname(file).toLowerCase());
    });

    for (const file of files) {
      const srcPath = path.join(sourceDir, file);
      const destPath = path.join(destDir, file);
      fs.copyFileSync(srcPath, destPath);
    }

    return { success: true, copied: files.length };

  } catch (err) {
    return { success: false, message: err.message };
  }
});
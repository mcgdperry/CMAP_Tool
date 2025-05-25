const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const archiver = require('archiver');

const appPath = app.getAppPath();

const isDev = !app.isPackaged;

function getAppDir() {
  if (isDev) {
    return app.getAppPath();
  } else {
    const exePath = app.getPath('exe');
    return path.resolve(path.dirname(exePath), '..', '..', '..');
  }
}

let win;

// --- App Window
function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 1000,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'icon.png')
  });
  win.webContents.session.clearCache().then(() => {
    win.loadFile('index.html');
  });

  win.on('closed', () => { win = null; });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- IPC Handlers

// 📂 Dialog - Open folder
ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select Folder'
  });
  if (result.canceled || result.filePaths.length === 0) return { canceled: true };
  return { canceled: false, filePaths: result.filePaths };
});

// 📂 Get app working directory
ipcMain.handle('app:getAppDir', () => {
  return getAppDir();
});

// 📷 Import Screens
ipcMain.handle('screens:import', async (event, selectedFolder, appDir) => {
  try {
    const screensDest = path.join(appDir, 'screens');

    if (fs.existsSync(screensDest)) {
      fs.rmSync(screensDest, { recursive: true, force: true });
      console.log('✅ Old screens folder deleted.');
    }

    fs.mkdirSync(screensDest);
    console.log('✅ New screens folder created at', screensDest);

    const files = fs.readdirSync(selectedFolder);
    const validExtensions = ['.jpg', '.jpeg', '.png'];

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!validExtensions.includes(ext)) continue;

      const src = path.join(selectedFolder, file);
      const dest = path.join(screensDest, file);
      fs.copyFileSync(src, dest);
    }

    console.log('✅ Screens imported successfully.');
    return { success: true };
  } catch (err) {
    console.error('Error importing screens:', err);
    return { success: false, error: err.message };
  }
});

// 📂 Read Screens Folder
ipcMain.handle('read-screens-folder', async () => {
  try {
    const appDir = getAppDir();
    const screensDir = path.join(appDir, 'screens');

    if (!fs.existsSync(screensDir)) {
      return { success: false, error: 'Screens folder not found' };
    }

    const files = fs.readdirSync(screensDir).filter(file => /\.(jpg|jpeg|png)$/i.test(file));
    return { success: true, files };
  } catch (err) {
    console.error('Error reading screens folder:', err);
    return { success: false, error: err.message };
  }
});

// 📄 Copy Files to Screens
ipcMain.handle('file:copyFilesToScreens', async (event, fileList, screensFolder) => {
  try {
    if (!Array.isArray(fileList) || !screensFolder) {
      throw new Error('Invalid arguments.');
    }

    if (!fs.existsSync(screensFolder)) {
      fs.mkdirSync(screensFolder, { recursive: true });
    }

    for (const file of fileList) {
      if (!file.name || !file.data) continue;
      const destPath = path.join(screensFolder, file.name);
      fs.writeFileSync(destPath, Buffer.from(file.data));
    }

    console.log('✅ Files dropped into screens folder.');
    return { success: true };
  } catch (err) {
    console.error('Error copying dropped files:', err);
    return { success: false, error: err.message };
  }
});

// 📄 Save Manifest
ipcMain.on('file:saveManifest', (event, fileContent) => {
  try {
    const savePath = path.join(getAppDir(), 'presManifest.txt');
    fs.writeFileSync(savePath, fileContent, 'utf-8');
    dialog.showMessageBox({ type: 'info', message: 'Saved manifest:\n' + savePath });
  } catch (err) {
    dialog.showErrorBox('Save failed', err.message);
  }
});

// 📄 Open Manifest
ipcMain.handle('file:openManifest', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{ name: 'Text Files', extensions: ['txt'] }],
    properties: ['openFile']
  });

  if (canceled || filePaths.length === 0) return { canceled: true };

  const content = fs.readFileSync(filePaths[0], 'utf-8');
  return { canceled: false, content };
});

// 📄 Read Tile Assets
ipcMain.handle('file:getTileAssets', async (event, tileId) => {
  const screensDir = path.join(getAppDir(), 'screens');
  const result = { thumb: null, tabs: [], mods: [], refs: [] };

  if (!fs.existsSync(screensDir)) return result;

  const base = `slide_${tileId}`;
  const files = fs.readdirSync(screensDir);

  for (const file of files) {
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

// 📄 Attachments + Rectangles (safe)
ipcMain.handle('file:readAttachment', async (event, filename) => {
  const filePath = path.join(getAppDir(), filename);
  if (!fs.existsSync(filePath)) {
    console.warn('Attachment missing, returning blank:', filePath);
    return ''; // ✅ Return empty so the renderer doesn't crash
  }
  return fs.readFileSync(filePath, 'utf-8');
});


ipcMain.handle('file:copyPlaceholderImage', async (event, destPath) => {
  const sourcePath = path.join(appPath, 'images', 'placeholder.png');
  fs.copyFileSync(sourcePath, destPath);
});

ipcMain.handle('file:renameFile', async (_, { oldPath, newPath }) => {
  const appDir = getAppDir();
  const src = path.join(appDir, oldPath);
  const dest = path.join(appDir, newPath);
  await fs.promises.rename(src, dest);
});

ipcMain.handle('file:saveAttachment', async (event, relOrFullPath, content, isBinary) => {
  const isAbsolute = path.isAbsolute(relOrFullPath);
  const targetPath = isAbsolute ? relOrFullPath : path.join(appPath, relOrFullPath);

  if (isBinary) {
    await fs.promises.writeFile(targetPath, Buffer.from(content));
  } else {
    await fs.promises.writeFile(targetPath, content, 'utf8');
  }
});

ipcMain.handle('file:removeLinesContaining', async (event, filePath, search) => {
  try {
    const savePath = path.join(getAppDir(), filePath);
    if (!fs.existsSync(savePath)) return;
    const content = fs.readFileSync(savePath, 'utf-8');
    const updated = content.split('\n').filter(line => !line.includes(search)).join('\n');
    fs.writeFileSync(savePath, updated, 'utf-8');
  } catch (err) {
    console.error('Failed to remove lines:', err);
  }
});

ipcMain.handle('file:readRectCSS', async (event, filename) => {
  const cssPath = path.join(getAppDir(), filename);
  if (fs.existsSync(cssPath)) {
    return fs.readFileSync(cssPath, 'utf-8');
  }
  return '';
});

ipcMain.handle('file:saveRectCSS', async (event, filename, contents) => {
  const savePath = path.join(getAppDir(), filename);
  const folder = path.dirname(savePath);
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(savePath, contents, 'utf-8');
});

ipcMain.handle('check-is-directory', async (event, fullPath) => {
  try {
    const stat = fs.statSync(fullPath);
    return stat.isDirectory();
  } catch (err) {
    console.error('Failed checking folder:', err);
    return false;
  }
});

ipcMain.handle('folder:deleteScreensFolder', async (event, screensPath) => {
  try {
    if (fs.existsSync(screensPath)) {
      fs.rmSync(screensPath, { recursive: true, force: true });
      console.log('Screens folder deleted:', screensPath);
    }
    return { success: true };
  } catch (err) {
    console.error('Error deleting screens folder:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('file:deleteImage', async (_, filePath) => {
  try {
    await fs.promises.unlink(path.join(appPath, filePath));
    return true;
  } catch (e) {
    console.error('Failed to delete image:', e);
    return false;
  }
});

ipcMain.handle('dialog:selectFile', async (_, fileType) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: fileType.toUpperCase(), extensions: [fileType] }]
  });
  return result.canceled ? null : result.filePaths[0];
});

// 🔹 Return screens folder path
/*
ipcMain.handle('file:getScreensDir', () => {
  return path.join(app.getAppPath(), 'screens');
});

// 🔹 Check if file exists
ipcMain.handle('file:fileExists', async (event, filePath) => {
  return fs.existsSync(filePath);
});
*/

// 🔹 Create folder (if it doesn't exist)
ipcMain.handle('file:makeDir', async (event, dirPath) => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  return true;
});

// 🔹 Copy file
ipcMain.handle('file:copyFile', async (event, source, target) => {
  fs.copyFileSync(source, target);
  return true;
});

// 🔹 Delete file
ipcMain.handle('file:deleteFile', async (event, filePath) => {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  return true;
});

// 🔹 Resize image using sharp
ipcMain.handle('file:resizeImage', async (event, source, target, width, height) => {
  await sharp(source).resize(width, height).toFile(target);
  return true;
});

// 🔹 Zip a folder
ipcMain.handle('file:zipFolder', async (event, folderPath, zipPath) => {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(true));
    archive.on('error', err => reject(err));

    archive.pipe(output);
    archive.directory(folderPath, false);
    archive.finalize();
  });
});

ipcMain.handle('file:readJsonFile', async (_, filePath) => {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  return JSON.parse(content);
});

ipcMain.handle('file:exists', async (_, relativePath) => {
  const appDir = getAppDir(); // Assuming this already exists in your code
  const fullPath = path.join(appDir, relativePath);
  try {
    await fs.promises.access(fullPath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('dialog:promptImageUpload', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select an Image',
    filters: [{ name: 'Images', extensions: ['jpg', 'png'] }],
    properties: ['openFile']
  });

  if (result.canceled || !result.filePaths.length) return null;

  const filePath = result.filePaths[0];
  const buffer = await fs.promises.readFile(filePath);

  return {
    name: path.basename(filePath),
    data: Array.from(buffer) // convert to array for serialization
  };
});
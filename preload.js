const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  deleteScreensFolder: (screensPath) => ipcRenderer.invoke('folder:deleteScreensFolder', screensPath),
  selectScreensFolder: () => ipcRenderer.invoke('dialog:openFolder'),
  getAppDir: () => ipcRenderer.invoke('app:getAppDir'),
  importScreens: (selectedFolder, appDir) => ipcRenderer.invoke('screens:import', selectedFolder, appDir),
  readScreensFolder: () => ipcRenderer.invoke('read-screens-folder'),
  copyFilesToScreens: (fileList, screensFolder) => ipcRenderer.invoke('file:copyFilesToScreens', fileList, screensFolder),
  generateManifest: (fileContent) => ipcRenderer.send('file:saveManifest', fileContent),
  openManifest: () => ipcRenderer.invoke('file:openManifest'),
  readAttachment: (filename) => ipcRenderer.invoke('file:readAttachment', filename),
  saveAttachment: (filename, lineToWrite, append) => ipcRenderer.invoke('file:saveAttachment', filename, lineToWrite, append),
  removeLinesContaining: (filePath, search) => ipcRenderer.invoke('file:removeLinesContaining', filePath, search),
  readRectCSS: (filename) => ipcRenderer.invoke('file:readRectCSS', filename),
  saveRectCSS: (filename, contents) => ipcRenderer.invoke('file:saveRectCSS', filename, contents),
  checkIsDirectory: (fullPath) => ipcRenderer.invoke('check-is-directory', fullPath),
  getTileAssets: (tileId) => ipcRenderer.invoke('file:getTileAssets', tileId)
});
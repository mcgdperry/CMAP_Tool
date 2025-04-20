const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectScreensFolder: () => ipcRenderer.invoke('selectScreensFolder'),
    getAppDir: () => ipcRenderer.invoke('getAppDir'),
    importScreens: (sourceDir, appDir) => ipcRenderer.invoke('importScreens', sourceDir, appDir),
    generateManifest: (fileContent) => ipcRenderer.send('generate-manifest', fileContent),
    openManifest: () => ipcRenderer.invoke('openManifest'),
    getTileAssets: (tileId) => ipcRenderer.invoke('get-tile-assets', tileId),
    saveRectCSS: (filename, contents) => ipcRenderer.invoke('save-rect-css', filename, contents),
    readRectCSS: async (filename) => ipcRenderer.invoke('read-rect-css', filename)
});

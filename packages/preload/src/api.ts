const {contextBridge, ipcRenderer} = require('electron/renderer');

contextBridge.exposeInMainWorld('electronAPI', {
  processPsd: filePath => ipcRenderer.send('process-psd', filePath),
  processSvg: filePath => ipcRenderer.send('process-svg', filePath),
  downloadSvg: psdData => ipcRenderer.send('download-svg', psdData),
  onProcessPsdDone: callback =>
    ipcRenderer.on('process-psd-done', (_event, value) => callback(value)),
  onProcessing: callback => ipcRenderer.on('processing-layers', (_event, value) => callback(value)),
  requireLog: () => ipcRenderer.send('require-log'),
  onLog: callback => ipcRenderer.on('on-log', (_event, value) => callback(value)),

  bulkUpdateMockups: filePath => ipcRenderer.send('bulk-update-mockups', filePath),
  mergeFiles: filePaths => ipcRenderer.send('merge-files', filePaths),
  mergeAiFiles: filePaths => ipcRenderer.send('merge-ai-files', filePaths),
  mergeSVGAndPNG: (filePaths, width, height) =>
    ipcRenderer.send('merge-svg-and-png', filePaths, width, height),

  exportImage: imageData => ipcRenderer.send('export-image', JSON.stringify(imageData)),
  saveFont: (fontData, fontName) => ipcRenderer.send('save-font', fontData, fontName),
  uploadToServer: (fileName, fileSize) => ipcRenderer.send('upload-to-server', fileName, fileSize),
  getTemplates: () => ipcRenderer.send('get-templates'),
  onGetTemplatesDone: callback =>
    ipcRenderer.on('get-templates-done', (_event, value) => callback(value)),
  getDetailTemplate: templateId => ipcRenderer.send('get-detail-template', templateId),
  onGetDetailTemplateDone: callback =>
    ipcRenderer.on('get-detail-template-done', (_event, value) => callback(value)),
});

ipcRenderer.on('bulk-update-complete', (event, requestId) => {
  window.dispatchEvent(new CustomEvent('trigger-check-progress', {detail: requestId}));
});

ipcRenderer.on('merge-files-progress', (event, processedFiles, totalFiles) => {
  window.dispatchEvent(
    new CustomEvent('merge-files-progress', {detail: {processedFiles, totalFiles}}),
  );
});

import {app, ipcMain} from 'electron';
import './security-restrictions';
import {restoreOrCreateWindow} from '/@/mainWindow';
import {platform} from 'node:process';

/**
 * Prevent electron from running multiple instances.
 */
const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
  app.quit();
  process.exit(0);
}
app.on('second-instance', restoreOrCreateWindow);

/**
 * Disable Hardware Acceleration to save more system resources.
 */
app.disableHardwareAcceleration();

/**
 * Shout down background process if all windows was closed
 */
app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit();
  }
});

/**
 * @see https://www.electronjs.org/docs/latest/api/app#event-activate-macos Event: 'activate'.
 */
app.on('activate', restoreOrCreateWindow);

/**
 * Create the application window when the background process is ready.
 */

import {handleBulkUpdateMockups} from '../../handlers/bulk-update-mockups';
import {handleMergeDxfFiles} from '../../handlers/merge-files';
import {handleMergeAiFiles} from '../../handlers/merge-ai-files';
import {handleProcessPsd} from '../../handlers/process-psd';
import {handleProcessSvg} from '../../handlers/process-svg';
import {handleDownloadSvg} from '../../handlers/download-svg';
import {handleRequireLog} from '../../handlers/require-log';
import {handleExportImage} from '../../handlers/export-image';
import {handleSaveFont} from '../../handlers/save-font';
import {handleUploadToServer} from '../../handlers/upload-to-server';
import {handleGetTemplates, handleGetDetailTemplate} from '../../handlers/templates';
import {handleMergeSVGAndPNG} from '../../handlers/merge-svg-and-png';

app
  .whenReady()
  .then(() => {
    ipcMain.on('bulk-update-mockups', handleBulkUpdateMockups);
    ipcMain.on('merge-files', handleMergeDxfFiles);
    ipcMain.on('merge-ai-files', handleMergeAiFiles);
    ipcMain.on('merge-svg-and-png', handleMergeSVGAndPNG);
    ipcMain.on('process-psd', handleProcessPsd);
    ipcMain.on('process-svg', handleProcessSvg);
    ipcMain.on('download-svg', handleDownloadSvg);
    ipcMain.on('upload-to-server', handleUploadToServer);
    ipcMain.on('require-log', handleRequireLog);
    ipcMain.on('export-image', handleExportImage);
    ipcMain.on('save-font', handleSaveFont);
    ipcMain.on('get-templates', handleGetTemplates);
    ipcMain.on('get-detail-template', handleGetDetailTemplate);
    restoreOrCreateWindow();
  })
  .catch(e => console.error('Failed create window:', e));

/**
 * Install Vue.js or any other extension in development mode only.
 * Note: You must install `electron-devtools-installer` manually
 */
// if (import.meta.env.DEV) {
//   app
//     .whenReady()
//     .then(() => import('electron-devtools-installer'))
//     .then(module => {
//       const {default: installExtension, VUEJS3_DEVTOOLS} =
//         // @ts-expect-error Hotfix for https://github.com/cawa-93/vite-electron-builder/issues/915
//         typeof module.default === 'function' ? module : (module.default as typeof module);
//
//       return installExtension(VUEJS3_DEVTOOLS, {
//         loadExtensionOptions: {
//           allowFileAccess: true,
//         },
//       });
//     })
//     .catch(e => console.error('Failed install extension:', e));
// }

/**
 * Check for app updates, install it in background and notify user that new version was installed.
 * No reason run this in non-production build.
 * @see https://www.electron.build/auto-update.html#quick-setup-guide
 *
 * Note: It may throw "ENOENT: no such file app-update.yml"
 * if you compile production app without publishing it to distribution server.
 * Like `npm run compile` does. It's ok 😅
 */
if (import.meta.env.PROD) {
  app
    .whenReady()
    .then(() =>
      /**
       * Here we forced to use `require` since electron doesn't fully support dynamic import in asar archives
       * @see https://github.com/electron/electron/issues/38829
       * Potentially it may be fixed by this https://github.com/electron/electron/pull/37535
       */
      require('electron-updater').autoUpdater.checkForUpdatesAndNotify(),
    )
    .catch(e => console.error('Failed check and install updates:', e));
}

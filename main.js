const { app, BrowserWindow, screen, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');

// Configure logging
log.transports.file.level = 'info';
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}';
log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'logs/main.log');

// Configure auto updater
autoUpdater.logger = log;
autoUpdater.autoDownload = false;

function createWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const win = new BrowserWindow({
        width: Math.min(1200, Math.round(width * 0.8)),
        height: Math.min(900, Math.round(height * 0.9)),
        minWidth: 320,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, 'favicon.ico'),
        center: true,
        resizable: true
    });

    // Enable zoom with keyboard shortcuts
    win.webContents.on('before-input-event', (event, input) => {
        if (input.control && input.key === '=') {
            win.webContents.setZoomLevel(win.webContents.getZoomLevel() + 0.5);
        }
        if (input.control && input.key === '-') {
            win.webContents.setZoomLevel(win.webContents.getZoomLevel() - 0.5);
        }
        if (input.control && input.key === '0') {
            win.webContents.setZoomLevel(0);
        }
    });

    win.loadFile('index.html');

    // Check for updates when app starts
    autoUpdater.checkForUpdates().catch(err => {
        log.error('Error checking for updates:', err);
    });
}

// Auto-updater events
autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `Version ${info.version} is available. Would you like to download it now?`,
        buttons: ['Yes', 'No']
    }).then((result) => {
        if (result.response === 0) {
            autoUpdater.downloadUpdate();
        }
    });
});

autoUpdater.on('update-downloaded', (info) => {
    dialog.showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded. Would you like to install it now?',
        buttons: ['Yes', 'Later']
    }).then((result) => {
        if (result.response === 0) {
            autoUpdater.quitAndInstall();
        }
    });
});

autoUpdater.on('error', (err) => {
    log.error('AutoUpdater error:', err);
    dialog.showErrorBox('Update Error', 'An error occurred while updating the application.');
});

// Error handling
process.on('uncaughtException', (error) => {
    log.error('Uncaught Exception:', error);
    dialog.showErrorBox('Error', 'An unexpected error occurred. Please check the logs for details.');
});

app.whenReady().then(() => {
    createWindow();
    
    // Check for updates every hour
    setInterval(() => {
        autoUpdater.checkForUpdates().catch(err => {
            log.error('Error checking for updates:', err);
        });
    }, 60 * 60 * 1000);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
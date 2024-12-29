// src/gui/gui.js
/**
 * GUI Entry Point (Electron Example)
 * Provides a graphical interface to configure and run LLM-Pack.
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Logger = require('../utils/logger');
const LlmPackAPI = require('../api/api');
const fs = require('fs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Load the index.html that renders the GUI
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Listen for app to be ready
app.on('ready', createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// On macOS, re-create window when dock icon is clicked
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

/**
 * IPC Handlers
 * Provide a way for the renderer process to communicate with LLM-Pack API
 */
ipcMain.handle('llm-pack:run', async (event, { rootDir, configOverride }) => {
  try {
    const api = new LlmPackAPI(rootDir, configOverride);
    await api.runAll();
    Logger.info('LLM-Pack: RunAll completed via GUI');
    return { status: 'success', message: 'Pipeline execution complete.' };
  } catch (error) {
    Logger.error(`LLM-Pack: RunAll error via GUI - ${error.message}`);
    return { status: 'error', message: error.message };
  }
});

ipcMain.handle('llm-pack:saveConfig', async (event, configOverride) => {
  try {
    const configPath = path.join(app.getPath('userData'), '.llm-pack.config.json');
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(configOverride, null, 2), 'utf8');
    Logger.info('Configuration saved successfully via GUI.');
    return { status: 'success', message: 'Configuration saved successfully.' };
  } catch (error) {
    Logger.error(`Failed to save configuration via GUI: ${error.message}`, error);
    return { status: 'error', message: 'Failed to save configuration. Check logs for details.' };
  }
});

ipcMain.handle('llm-pack:loadConfig', async () => {
  try {
    const configPath = path.join(app.getPath('userData'), '.llm-pack.config.json');
    if (fs.existsSync(configPath)) {
      const rawData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(rawData);
      Logger.info('Configuration loaded successfully for GUI.');
      return { status: 'success', config };
    } else {
      Logger.info('No configuration file found. Using defaults.');
      return { status: 'success', config: {} };
    }
  } catch (error) {
    Logger.error(`Failed to load configuration for GUI: ${error.message}`, error);
    return { status: 'error', message: 'Failed to load configuration. Check logs for details.' };
  }
});

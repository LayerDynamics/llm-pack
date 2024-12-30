const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Logger = require('../utils/logger');
const SettingsManager = require('./services/settingsManager');

class GUI {
	constructor() {
		this.settingsManager = new SettingsManager();
		this.indexPath = path.join(__dirname, 'index.html');
		this.mainWindow = null;
		this.setupIPCHandlers(); // Move this here
	}

	async createWindow() {
		try {
			this.mainWindow = new BrowserWindow({
				width: 800,
				height: 600,
				webPreferences: {
					nodeIntegration: true,
					contextIsolation: false,
				},
			});

			await this.loadFile(this.indexPath);

			this.mainWindow.on('closed', () => {
				this.mainWindow = null;
			});

			this.initializeLogging();
		} catch (err) {
			Logger.error('Failed to create window:', err);
			throw err;
		}
	}

	async loadFile(filePath) {
		if (!this.mainWindow) {
			throw new Error('Window not initialized');
		}
		return this.mainWindow.loadFile(filePath);
	}

	setupIPCHandlers() {
		ipcMain.handle('settings:load', async () => {
			try {
				const settings = await this.settingsManager.loadSettings();
				Logger.info('Settings loaded successfully');
				return settings;
			} catch (error) {
				Logger.error('Failed to load settings:', error);
				throw error;
			}
		});

		ipcMain.handle('settings:save', async (event, settings) => {
			try {
				await this.settingsManager.saveSettings(settings);
			} catch (error) {
				Logger.error('Failed to save settings:', error);
				throw error;
			}
		});

		ipcMain.handle('log:new', (event, logEntry) => {
			if (this.mainWindow) {
				this.mainWindow.webContents.send('log:update', logEntry);
			}
		});
	}

	initializeLogging() {
		Logger.on('log', (logEntry) => {
			console.log('Sending log to renderer:', logEntry);
			if (this.mainWindow) {
				this.mainWindow.webContents.send('log:update', logEntry);
			}
		});

		// Send initial log
		Logger.info('Application started');
	}
}

// Replace the app initialization code at the bottom with:
if (process.env.NODE_ENV !== 'test') {
	// Create a single instance
	const gui = new GUI();

	// Set up app event handlers
	app.whenReady().then(() => {
		gui.createWindow();

		app.on('activate', () => {
			if (gui.mainWindow === null) {
				gui.createWindow();
			}
		});
	});

	app.on('window-all-closed', () => {
		if (process.platform !== 'darwin') {
			app.quit();
		}
	});
}

module.exports = GUI;

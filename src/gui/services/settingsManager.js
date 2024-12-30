const fs = require('fs/promises');
const path = require('path');
const { app } = require('electron');

class SettingsManager {
  constructor() {
    const userDataPath = app.getPath('userData') || path.join(process.cwd(), 'test-data');
    this.settingsPath = path.join(userDataPath, 'settings.json');
    this.ensureSettingsDirectory();
  }

  async ensureSettingsDirectory() {
    try {
      await fs.mkdir(path.dirname(this.settingsPath), { recursive: true });
      // Create default settings if they don't exist
      try {
        await fs.access(this.settingsPath);
      } catch {
        await this.saveSettings(this.getDefaultSettings());
      }
    } catch (err) {
      console.error('Failed to create settings directory:', err);
    }
  }

  getDefaultSettings() {
    return {
      theme: 'light',
      logLevel: 'info',
      maxLogs: 100,
      autoScroll: true,
      version: '1.0.0'
    };
  }

  async saveSettings(settings) {
    try {
      await fs.mkdir(path.dirname(this.settingsPath), { recursive: true });
      await fs.writeFile(
        this.settingsPath,
        JSON.stringify(settings, null, 2),
      );
    } catch (err) {
      console.error('Failed to save settings:', err);
      throw err;
    }
  }

  async loadSettings() {
    try {
      const data = await fs.readFile(this.settingsPath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return this.getDefaultSettings();
      }
      throw err;
    }
  }
}

module.exports = SettingsManager;

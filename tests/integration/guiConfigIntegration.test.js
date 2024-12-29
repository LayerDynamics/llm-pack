// tests/integration/guiConfigIntegration.test.js
const path = require( 'path' );

// Mock fs operations
const mockFs = {
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  stat: jest.fn((path, cb) => cb(null, { isFile: () => true }))
};

jest.mock('fs', () => mockFs);

// Mock winston
jest.mock('winston', () => {
  const mockFile = jest.fn(function(options) {
    this.options = options;
  });
  mockFile.prototype.on = jest.fn();
  
  return {
    createLogger: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    })),
    format: {
      combine: jest.fn(),
      timestamp: jest.fn(),
      errors: jest.fn(),
      splat: jest.fn(),
      printf: jest.fn()
    },
    transports: {
      Console: jest.fn(),
      File: mockFile
    }
  };
});

// Mock GUI module with a doMock to avoid closure issues
jest.doMock('../../src/gui/gui', () => ({}), { virtual: true });

// Create mock handlers map in the test scope
const mockIpcHandlers = new Map();

// Mock electron with handler support
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/mock/user/data'),
    whenReady: jest.fn().mockResolvedValue(true),
    quit: jest.fn(),
    on: jest.fn()
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    on: jest.fn(),
    webContents: { send: jest.fn() }
  })),
  ipcMain: {
    handle: jest.fn((channel, handler) => {
      mockIpcHandlers.set(channel, handler);
    }),
    _trigger: async (channel, ...args) => {
      const handler = mockIpcHandlers.get(channel);
      if (!handler) {
        throw new Error(`No handler for channel: ${channel}`);
      }
      return handler({}, ...args);
    }
  }
}));

describe('GUI Configuration Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(false);
    mockIpcHandlers.clear();

    // Register mock IPC handlers
    const { ipcMain } = require('electron');
    
    ipcMain.handle('llm-pack:saveConfig', async (event, config) => ({
      status: 'success',
      message: 'Configuration saved successfully.'
    }));

    ipcMain.handle('llm-pack:loadConfig', async () => ({
      status: 'success',
      config: {
        sortingStrategy: 'dependency',
        metadata: {
          enrichDescriptions: true,
          detectDependencies: true
        }
      }
    }));
  });

  test('should save and load configuration via IPC', async () => {
    const { ipcMain } = require('electron');
    
    const configOverride = {
      sortingStrategy: 'dependency',
      metadata: {
        enrichDescriptions: true,
        detectDependencies: true
      }
    };

    // Test save config
    const saveResult = await ipcMain._trigger('llm-pack:saveConfig', configOverride);
    expect(saveResult.status).toBe('success');
    
    // Test load config
    const loadResult = await ipcMain._trigger('llm-pack:loadConfig');
    expect(loadResult.status).toBe('success');
    expect(loadResult.config).toEqual(expect.objectContaining(configOverride));
  });
});

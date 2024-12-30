// tests/setup.js

// Mock EventEmitter before anything else
jest.mock('events', () => ({
    EventEmitter: jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        emit: jest.fn(),
        removeListener: jest.fn()
    }))
}));

require('@testing-library/jest-dom');

// Add setImmediate polyfill
global.setImmediate = require('timers').setImmediate;

// Mock window
global.window = {
	require: require,
	process: process,
	fs: {
		readFile: jest.fn(),
		readFileSync: jest.fn(),
		writeFile: jest.fn(),
		writeFileSync: jest.fn(),
		existsSync: jest.fn(),
		mkdirSync: jest.fn(),
	},
};

// Mock Electron
const mockIpcRenderer = {
	on: jest.fn(),
	send: jest.fn(),
	invoke: jest.fn(),
};

const mockIpcMain = {
	handle: jest.fn(),
	on: jest.fn(),
};

const mockApp = {
	getPath: jest.fn(() => '/mock/path'),
	on: jest.fn(),
	whenReady: jest.fn().mockResolvedValue(true),
};

const mockBrowserWindow = {
	loadFile: jest.fn().mockResolvedValue(undefined),
	on: jest.fn(),
	webContents: { send: jest.fn() },
};

jest.mock('electron', () => ({
	ipcRenderer: mockIpcRenderer,
	ipcMain: mockIpcMain,
	app: mockApp,
	BrowserWindow: jest.fn(() => mockBrowserWindow),
}));

// Mock console methods
global.console = {
	...console,
	log: jest.fn(),
	error: jest.fn(),
	warn: jest.fn(),
	info: jest.fn(),
};

// Mock HTML methods
Element.prototype.scrollIntoView = jest.fn();

beforeEach(() => {
	jest.clearAllMocks();
});

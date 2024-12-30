// tests/gui/setup.js

require('@testing-library/jest-dom');

// Mock EventEmitter before other requires
jest.mock('events', () => {
    return {
        EventEmitter: jest.fn().mockImplementation(() => ({
            on: jest.fn(),
            emit: jest.fn(),
            removeListener: jest.fn()
        }))
    };
});

const { EventEmitter } = require('events');

// Setup document for renderer tests
document.body.innerHTML = '<div id="app"></div>';

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Polyfill for setImmediate
global.setImmediate = require('timers').setImmediate;

// Mock React DOM
const mockRoot = {
	render: jest.fn(),
	unmount: jest.fn(),
};

jest.mock('react-dom/client', () => ({
	createRoot: jest.fn(() => mockRoot),
}));

// Mock Electron
class MockBrowserWindow extends EventEmitter {
	constructor(opts) {
		super();
		this.webContents = { send: jest.fn() };
		this.loadFile = jest.fn().mockResolvedValue();
		this.options = opts;
	}
}

const electron = {
	app: {
		getPath: jest.fn(() => '/mock/path'),
		quit: jest.fn(),
		on: jest.fn(),
		whenReady: jest.fn().mockResolvedValue(),
	},
	BrowserWindow: jest.fn((opts) => new MockBrowserWindow(opts)),
	ipcMain: {
		handle: jest.fn(),
		on: jest.fn(),
	},
	ipcRenderer: {
		on: jest.fn(),
		send: jest.fn(),
		invoke: jest.fn(),
	},
};

jest.mock('electron', () => electron);

// Setup test utilities
const React = require('react');
const { render: rtlRender, act: rtlAct } = require('@testing-library/react');

const render = (ui, options = {}) => {
	const Wrapper = ({ children }) => children;
	return rtlRender(ui, { wrapper: Wrapper, ...options });
};

global.React = React;
global.render = render;
global.act = rtlAct;

// Mock SettingsManager
jest.mock('../../src/gui/services/settingsManager', () => {
	return jest.fn().mockImplementation(() => ({
		loadSettings: jest.fn().mockResolvedValue({}),
		saveSettings: jest.fn().mockResolvedValue(),
	}));
});

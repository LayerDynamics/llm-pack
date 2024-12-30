const { EventEmitter } = require('events');
const path = require('path');

class BrowserWindowMock extends EventEmitter {
	constructor(opts) {
		super();
		this.webContents = {
			send: jest.fn(),
		};
		this.loadFile = jest.fn().mockResolvedValue();
		this.on = jest.fn((event, callback) => {
			super.on(event, callback);
			return this;
		});
		this.options = opts;
	}
}

const mockBrowserWindow = jest
	.fn()
	.mockImplementation((opts) => new BrowserWindowMock(opts));

const mockIpcMain = new EventEmitter();
mockIpcMain.handle = jest.fn();

const mockApp = new EventEmitter();
mockApp.getPath = jest.fn((key) => {
	switch (key) {
		case 'userData':
			return path.join(__dirname, '..', '..', 'test-data');
		default:
			return '/mock/path';
	}
});
mockApp.quit = jest.fn();

module.exports = {
	app: mockApp,
	BrowserWindow: mockBrowserWindow,
	ipcMain: mockIpcMain,
	ipcRenderer: {
		on: jest.fn(),
		send: jest.fn(),
		invoke: jest.fn(),
	},
	mocks: {
		mockBrowserWindow,
		mockIpcMain,
	},
};

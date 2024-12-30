const path = require('path');
const GUI = require('../../src/gui/gui');
const { app, BrowserWindow, ipcMain } = require('electron');
const Logger = require('../../src/utils/logger');

jest.mock('../../src/utils/logger', () => ({
	error: jest.fn(),
	info: jest.fn(),
	on: jest.fn(),
	emit: jest.fn(),
}));

describe('GUI', () => {
	let gui;

	beforeEach(() => {
		process.env.NODE_ENV = 'test';
		gui = new GUI();
		jest.clearAllMocks();
		// Add this line to initialize handlers before tests
		gui.setupIPCHandlers();
	});

	test('creates window with correct configuration', async () => {
		await gui.createWindow();

		const mockWindow = BrowserWindow.mock.results[0].value;
		expect(mockWindow.loadFile).toHaveBeenCalledWith(
			expect.stringContaining('index.html'),
		);
		expect(mockWindow.on).toHaveBeenCalledWith('closed', expect.any(Function));
	});

	test('sets up IPC handlers', async () => {
		await gui.createWindow();

		expect(ipcMain.handle).toHaveBeenCalledWith(
			'settings:save',
			expect.any(Function),
		);
		expect(ipcMain.handle).toHaveBeenCalledWith(
			'settings:load',
			expect.any(Function),
		);
		expect(ipcMain.handle).toHaveBeenCalledWith(
			'log:new',
			expect.any(Function),
		);
	});

	test('forwards logger events to renderer', async () => {
		await gui.createWindow();
		const mockWindow = BrowserWindow.mock.results[0].value;

		// Extract the callback passed to Logger.on
		const logCallback = Logger.on.mock.calls[0][1];
		
		// Simulate log event
		const logEntry = { level: 'info', message: 'Test log' };
		logCallback(logEntry);

		expect(mockWindow.webContents.send).toHaveBeenCalledWith(
			'log:update',
			logEntry
		);
	});

	test('handles window creation errors gracefully', async () => {
		const error = new Error('Window creation failed');
		BrowserWindow.mockImplementationOnce(() => {
			throw error;
		});

		await expect(gui.createWindow()).rejects.toThrow('Window creation failed');
		expect(Logger.error).toHaveBeenCalled();
	});
});

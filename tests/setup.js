// tests/setup.js

// Create mock logger instance
const mockLogger = {
	info: jest.fn(),
	error: jest.fn(),
	warn: jest.fn(),
	debug: jest.fn(),
	log: jest.fn(),
};

// Global mocks
global.__mockLogger = mockLogger;

// Setup test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'debug';

// Mock Winston
jest.mock('winston', () => ({
	format: {
		combine: jest.fn(() => ({ format: 'combined' })),
		timestamp: jest.fn(() => ({ format: 'timestamp' })),
		errors: jest.fn(() => ({ format: 'errors' })),
		splat: jest.fn(() => ({ format: 'splat' })),
		printf: jest.fn((formatter) => ({ format: 'printf', formatter })),
	},
	transports: {
		Console: jest.fn(),
		File: jest.fn(),
	},
	createLogger: jest.fn(() => global.__mockLogger),
}));

// Mock Electron
jest.mock('electron', () => ({
	app: {
		getPath: jest.fn(() => '/mock/user/data'),
		whenReady: jest.fn(() => Promise.resolve(true)),
		quit: jest.fn(),
	},
	BrowserWindow: jest.fn().mockImplementation(() => ({
		loadFile: jest.fn(),
		on: jest.fn(),
		webContents: { send: jest.fn() },
	})),
	ipcMain: {
		handle: jest.fn(),
	},
}));

// Remove mock-fs setup from global beforeEach and afterEach
beforeEach(() => {
	// Any other global beforeEach logic
});

afterEach(() => {
	// Remove mock-fs restore
	jest.resetModules();
	jest.clearAllMocks();
});

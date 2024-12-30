const React = require('react');
const { render, screen, act } = require('@testing-library/react');
const { ipcRenderer } = require('electron');
const App = require('../../src/gui/renderer');

jest.mock('electron', () => ({
	ipcRenderer: {
		invoke: jest.fn(),
		on: jest.fn(),
		send: jest.fn(),
	},
}));

describe('Renderer App', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('renders without crashing', () => {
		render(<App />);
		expect(screen.getByText('LLM-Pack')).toBeInTheDocument();
	});

	test('loads settings on mount', async () => {
		const mockSettings = {
			theme: 'dark',
			logLevel: 'debug',
		};

		ipcRenderer.invoke.mockResolvedValueOnce(mockSettings);

		await act(async () => {
			render(<App />);
		});

		expect(ipcRenderer.invoke).toHaveBeenCalledWith('settings:load');
	});

	test('updates logs when receiving log events', async () => {
		ipcRenderer.invoke.mockResolvedValueOnce({}); // settings

		await act(async () => {
			render(<App />);
		});

		const logEntry = {
			level: 'info',
			message: 'Test log',
		};

		await act(async () => {
			// Simulate receiving a log event
			const onCallback = ipcRenderer.on.mock.calls[0][1];
			onCallback({}, logEntry);
		});

		expect(screen.getByText('Test log')).toBeInTheDocument();
	});
});

const React = require('react');
const { render, screen } = require('@testing-library/react');
const { act } = require('react-dom/test-utils');
const LogViewer = require('../../../src/gui/components/LogViewer');

describe('LogViewer', () => {
	beforeEach(() => {
		// Mock scrollIntoView since it's not implemented in JSDOM
		window.HTMLElement.prototype.scrollIntoView = jest.fn();
	});

	test('renders log entries with correct styling', () => {
		const logs = [
			{ level: 'info', message: 'Info message' },
			{ level: 'error', message: 'Error message' },
			{ level: 'warn', message: 'Warning message' }
		];

		render(<LogViewer logs={logs} />);

		const infoLog = screen.getByText('Info message');
		const errorLog = screen.getByText('Error message');
		const warnLog = screen.getByText('Warning message');

		expect(infoLog).toHaveClass('log-entry', 'log-info');
		expect(errorLog).toHaveClass('log-entry', 'log-error');
		expect(warnLog).toHaveClass('log-entry', 'log-warn');
	});

	test('autoscrolls when new logs are added', () => {
		const scrollIntoViewMock = jest.fn();
		window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

		const { rerender } = render(<LogViewer logs={[]} />);

		act(() => {
			rerender(
				<LogViewer 
					logs={[
						{ level: 'info', message: 'New log' }
					]} 
				/>
			);
		});

		expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
	});

	test('renders empty state when no logs exist', () => {
		act(() => {
			render(<LogViewer logs={[]} />);
		});
		expect(screen.getByText('No logs to display')).toBeInTheDocument();
	});

	test('handles log entries with timestamps', () => {
		const logs = [
			{ 
				level: 'info', 
				message: 'Test message', 
				timestamp: '2023-01-01T12:00:00Z' 
			}
		];

		act(() => {
			render(<LogViewer logs={logs} />);
		});
		
		expect(screen.getByText(/Test message/)).toBeInTheDocument();
		expect(screen.getByText('2023-01-01')).toBeInTheDocument();
	});
});
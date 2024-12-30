const React = require('react');
const { render, screen } = require('../test-utils');
const userEvent = require('@testing-library/user-event').default;
const ErrorDialog = require('../../../src/gui/components/ErrorDialog');

describe('ErrorDialog', () => {
	const mockError = {
		title: 'Test Error',
		message: 'Something went wrong',
		recoverable: true,
	};

	test('displays error title and message', () => {
		render(
			<ErrorDialog error={mockError} onRetry={() => {}} onClose={() => {}} />,
		);

		expect(screen.getByTestId('error-title')).toHaveTextContent('Test Error');
		expect(screen.getByTestId('error-message')).toHaveTextContent(
			'Something went wrong',
		);
	});

	test('calls onRetry when retry button is clicked', async () => {
		const onRetry = jest.fn();
		render(
			<ErrorDialog error={mockError} onRetry={onRetry} onClose={() => {}} />,
		);

		await userEvent.click(screen.getByTestId('retry-button'));
		expect(onRetry).toHaveBeenCalled();
	});

	test('calls onClose when close button is clicked', async () => {
		const onClose = jest.fn();
		render(
			<ErrorDialog error={mockError} onRetry={() => {}} onClose={onClose} />,
		);

		await userEvent.click(screen.getByTestId('close-button'));
		expect(onClose).toHaveBeenCalled();
	});

	test('does not show retry button for non-recoverable errors', () => {
		const nonRecoverableError = {
			...mockError,
			recoverable: false,
		};

		render(
			<ErrorDialog
				error={nonRecoverableError}
				onRetry={() => {}}
				onClose={() => {}}
			/>,
		);

		expect(screen.queryByTestId('retry-button')).not.toBeInTheDocument();
	});

	test('renders with proper ARIA attributes', () => {
		render(
			<ErrorDialog error={mockError} onRetry={() => {}} onClose={() => {}} />,
		);

		const alertElement = screen.getByRole('alert');
		expect(alertElement).toBeInTheDocument();
	});
});

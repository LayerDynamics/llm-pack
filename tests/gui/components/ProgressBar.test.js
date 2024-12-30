const React = require('react');
const { render, screen } = require('../test-utils');
const ProgressBar = require('../../../src/gui/components/ProgressBar');

describe('ProgressBar', () => {
	test('renders with correct progress percentage', () => {
		render(<ProgressBar progress={50} status='Processing' />);

		const progressBar = screen.getByTestId('progress-bar');
		expect(progressBar).toHaveStyle({ width: '50%' });
		expect(progressBar).toHaveAttribute('aria-valuenow', '50');
	});

	test('displays status text', () => {
		render(<ProgressBar progress={75} status='Almost done' />);

		const statusText = screen.getByTestId('status-text');
		expect(statusText).toHaveTextContent('Almost done');
	});

	test('has correct accessibility attributes', () => {
		render(<ProgressBar progress={25} status='Starting' />);

		const progressBar = screen.getByTestId('progress-bar');
		expect(progressBar).toHaveAttribute('role', 'progressbar');
		expect(progressBar).toHaveAttribute('aria-valuemin', '0');
		expect(progressBar).toHaveAttribute('aria-valuemax', '100');
		expect(progressBar).toHaveAttribute('aria-valuenow', '25');
		expect(progressBar).toHaveAttribute('aria-label', 'Starting');
	});
});

// src/gui/components/ErrorDialog.js
const React = require('react');
const { Alert, AlertTitle, AlertDescription } = require('./ui/alert');

const ErrorDialog = ({ error, onRetry, onClose }) => {
	return (
		<Alert variant='destructive' role='alert' data-testid='error-dialog'>
			<AlertTitle data-testid='error-title'>{error.title}</AlertTitle>
			<AlertDescription data-testid='error-message'>
				{error.message}
			</AlertDescription>
			<div className='mt-4 flex gap-3'>
				{error.recoverable && (
					<button
						onClick={onRetry}
						className='bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded'
						data-testid='retry-button'
						aria-label='Retry operation'>
						Retry Operation
					</button>
				)}
				<button
					onClick={onClose}
					className='bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded'
					data-testid='close-button'
					aria-label='Close dialog'>
					Close
				</button>
			</div>
		</Alert>
	);
};

module.exports = ErrorDialog;

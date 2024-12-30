// src/gui/components/ProgressBar.js
const React = require('react');

const ProgressBar = ({ progress = 0, status = '' }) => {
	const id = React.useId();

	return (
		<div
			className='progress-container relative w-full h-5'
			role='none'>
			<div
				id={id}
				role='progressbar'
				aria-valuenow={progress}
				aria-valuemin='0'
				aria-valuemax='100'
				aria-label={status || `Progress: ${progress}%`}
				className='progress-bar absolute left-0 top-0 h-full bg-blue-500 transition-all duration-300 ease-in-out'
				data-testid='progress-bar'
				style={{ width: `${progress}%` }}
			/>
			{status && (
				<div
					aria-hidden='true'
					className='status-text absolute inset-0 flex items-center justify-center text-sm text-gray-700'
					data-testid='status-text'>
					{status}
				</div>
			)}
		</div>
	);
};

module.exports = ProgressBar;

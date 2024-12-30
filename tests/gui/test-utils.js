// tests/gui/test-utils.js
const React = require('react');
const {
	render: rtlRender,
	screen,
	act: rtlAct,
} = require('@testing-library/react');
const userEvent = require('@testing-library/user-event').default;

const render = (ui, options = {}) => {
    const Wrapper = ({ children }) => (
        <div id="test-wrapper">{children}</div>
    );

    return rtlRender(ui, { wrapper: Wrapper, ...options });
};

// Re-export everything
module.exports = {
    ...require('@testing-library/react'),
    render,
	screen,
	act: rtlAct,
};

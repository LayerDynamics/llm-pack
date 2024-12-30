const React = require('react');
const { render: rtlRender, act: rtlAct } = require('@testing-library/react');

// Use Testing Library's act wrapper
const act = rtlAct;

// Use Testing Library's render
const render = (element) => {
  const utils = rtlRender(element);
  return {
    ...utils,
    rerender: (newElement) => rtlRender(newElement, { container: utils.container }),
  };
};

module.exports = {
  act,
  render,
  Events: {
    click: 'click',
    mouseDown: 'mouseDown',
    mouseUp: 'mouseUp',
    mouseMove: 'mouseMove',
  },
  Simulate: {
    click(element) {
      element.click();
    },
  },
};

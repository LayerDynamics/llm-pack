const React = require('react');
const { render: rtlRender, screen, act: rtlAct } = require('@testing-library/react');
const { act: reactAct } = require('react');

async function render(ui, options = {}) {
  let result;
  await reactAct(async () => {
    result = rtlRender(ui, {
      ...options,
    });
    // Allow effects to complete
    await new Promise(resolve => setTimeout(resolve, 0));
  });
  return result;
}

module.exports = {
  render,
  screen,
  act: reactAct,
};


const mockFs = require( 'mock-fs' );

const setupMockFileSystem = () => {
  mockFs({
    '/project': {
      '.gitignore': `
        node_modules/
        *.log
      `,
      '.llm-pack.ignore': `
        dist/
        secrets/
      `,
      'node_modules': {
        'module.js': 'console.log("module");',
      },
      'dist': {
        'bundle.js': 'console.log("bundle");',
      },
      'secrets': {
        'secret.txt': 'This is a secret.',
      },
      'src': {
        'main.js': 'console.log("main");',
        'utils.js': 'console.log("utils");',
        'helpers': {
          'helper.js': 'console.log("helper");',
        },
      },
      'README.md': '# Project',
      'error.log': 'This is a log file.',
    },
    '/empty-project': {},
    '/non-existent': null
  });
};

const teardownMockFileSystem = () => {
  mockFs.restore();
};

module.exports = {
  setupMockFileSystem,
  teardownMockFileSystem,
};

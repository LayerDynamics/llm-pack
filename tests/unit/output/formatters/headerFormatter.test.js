
const HeaderFormatter = require('../../../../src/output/formatters/headerFormatter');

describe('HeaderFormatter', () => {
  let formatter;

  beforeEach(() => {
    formatter = new HeaderFormatter();
  });

  test('should create file header correctly', () => {
    const file = { fileName: 'example.js' };
    const header = formatter.createFileHeader(file);
    expect(header).toContain('# example.js');
  });

  test('should format metadata with description and dependencies', () => {
    const metadata = { description: 'Test file', dependencies: ['dep1', 'dep2'] };
    const section = formatter.formatMetadataSection(metadata);
    expect(section).toContain('**Description**: Test file');
    expect(section).toContain('**Dependencies**: dep1, dep2');
  });

  test('should create separator', () => {
    const sep = formatter.createSeparator();
    expect(sep).toContain('---');
  });
});
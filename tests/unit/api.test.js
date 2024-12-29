// tests/unit/api.test.js
const mockFs = require("mock-fs");
const fs = require("fs");
const path = require("path");
const LlmPackAPI = require("@/api/api"); // Use absolute path based on moduleNameMapper
const Logger = require("@/utils/logger");

// Mock the logger to prevent actual logging during tests
jest.mock("@/utils/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  log: jest.fn(),
}));

describe("LlmPackAPI Integration", () => {
  const rootDir = "/project";
  const configFileName = ".llm-pack.config.json";
  const outputDir = ".llm-pack";
  const outputFileName = "consolidated_output.md";
  const configPath = path.join(rootDir, configFileName);

  beforeEach(() => {
    mockFs(
      {
        "/project": {
          ".gitignore": `
            node_modules/
            *.log
          `,
          ".llm-pack.ignore": `
            dist/
          `,
          src: {
            "main.js": 'import utils from "./utils.js";\nconsole.log("Main");',
            "utils.js": "export const add = (a, b) => a + b;",
            "ignored.log": "Should be ignored due to .gitignore",
            api: {
              "api.js": `module.exports = class LlmPackAPI {
                constructor(rootDir, configOverride = {}) {
                  this.rootDir = rootDir;
                  this.config = { /* default config */ };
                  Object.assign(this.config, configOverride);
                }
                async runAll() {
                  // Implementation
                }
                async consolidateFiles(files) {
                  // Implementation that may read files
                }
              };`,
            },
          },
          dist: {
            "bundle.js": 'console.log("bundle");',
          },
          "README.md": "# LLM-Pack Project",
          // Example user config
          ".llm-pack.config.json": JSON.stringify({
            sortingStrategy: "lexical",
            metadata: {
              enrichDescriptions: false,
            },
            output: {
              dir: outputDir,
              fileName: outputFileName,
            },
          }),
          plugins: {
            TestPlugin: {
              "plugin.json": JSON.stringify({
                name: "TestPlugin",
                version: "1.0.0",
                entry: "index.js",
              }),
              "index.js": `
                module.exports = class TestPlugin {
                  init() {}
                  beforeConsolidate() {}
                };
              `,
            },
          },
        },
      },
      { createCwd: false, createTmp: false, inherit: true }, // Enable inherit
    );
  });

  afterEach(() => {
    mockFs.restore();
    jest.clearAllMocks();
  });

  test("should run the full process (scan, enrich, sort, consolidate) without errors", async () => {
    const llmPackAPI = new LlmPackAPI(rootDir);
    await llmPackAPI.runAll();

    // Check that the output file is created
    const consolidatedPath = path.join(rootDir, outputDir, outputFileName);
    expect(fs.existsSync(consolidatedPath)).toBe(true);

    // Validate partial content of the consolidated file
    const consolidatedContent = fs.readFileSync(consolidatedPath, "utf8");
    expect(consolidatedContent).toContain("# main.js");
    expect(consolidatedContent).toContain("# utils.js");
    expect(consolidatedContent).toContain("# README.md"); // included because it's not ignored
    expect(consolidatedContent).not.toContain("ignored.log"); // ignored due to .gitignore
    expect(consolidatedContent).not.toContain("bundle.js"); // ignored due to .llm-pack.ignore
  });

  test("should allow overriding config programmatically", async () => {
    // Provide a custom config override
    const overrideConfig = {
      sortingStrategy: "lexical",
      output: {
        dir: ".custom-pack",
        fileName: "my_output.md",
      },
    };

    const llmPackAPI = new LlmPackAPI(rootDir, overrideConfig);
    await llmPackAPI.runAll();

    // Check that the output file is created in the overridden path
    const customOutputPath = path.join(rootDir, ".custom-pack", "my_output.md");
    expect(fs.existsSync(customOutputPath)).toBe(true);
  });

  test("should handle missing file content during consolidateFiles", async () => {
    const llmPackAPI = new LlmPackAPI(rootDir);
    const sortedFiles = [
      { path: "/project/src/test.js" }, // File without content
    ];

    mockFs(
      {
        "/project": {
          src: {
            "test.js": "test content", // Ensure the file exists
            ".llm-pack": {},
          },
        },
      },
      { inherit: true },
    );

    await llmPackAPI.consolidateFiles(sortedFiles);

    const consolidatedPath = path.join(rootDir, outputDir, outputFileName);
    expect(fs.existsSync(consolidatedPath)).toBe(true);
  });

  test("should handle different sorting strategies", async () => {
    const llmPackAPI = new LlmPackAPI(rootDir, {
      sortingStrategy: "size",
    });
    await llmPackAPI.runAll();

    const llmPackAPI2 = new LlmPackAPI(rootDir, {
      sortingStrategy: "type",
    });
    await llmPackAPI2.runAll();

    const llmPackAPI3 = new LlmPackAPI(rootDir, {
      sortingStrategy: "invalid",
    });
    await llmPackAPI3.runAll(); // Should default to lexical
  });

  test("should log an error if file reading fails during consolidateFiles", async () => {
    // Restore real fs before requiring modules
    mockFs.restore();

    // Mock filesystem for this specific test
    mockFs({
      "/fake": {}, // Empty directory for the test
    });

    jest
      .spyOn(fs.promises, "readFile")
      .mockRejectedValueOnce(new Error("Read error"));

    const api = new LlmPackAPI("/fake");
    await api.consolidateFiles([{ path: "/fake/fail.js" }]);

    expect(Logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Failed to read file content: /fake/fail.js"),
      expect.any(Error),
    );
  });
});

// plugins/CustomMetadataEnricher/index.js
const PluginBase = require('../../src/core/pluginBase');
const Logger = require('../../src/utils/logger');

class CustomMetadataEnricher extends PluginBase {
  init() {
    Logger.info('CustomMetadataEnricher initialized.');
  }

  afterEnrich(enrichedFiles) {
    enrichedFiles.forEach(file => {
      file.metadata.project = 'LLM-Pack Project';
      file.metadata.owner = 'Jane Doe';
    });
    Logger.info('CustomMetadataEnricher: Added custom metadata.');
  }

  beforeConsolidate(sortedFiles) {
    Logger.info('CustomMetadataEnricher: Preparing files for consolidation.');
  }
}

module.exports = CustomMetadataEnricher;

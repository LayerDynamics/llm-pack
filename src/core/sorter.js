class Sorter {
  constructor(strategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  sort(files) {
    if (!this.strategy || typeof this.strategy.sort !== 'function') {
      throw new Error('Invalid sorting strategy.');
    }
    return this.strategy.sort(files);
  }
}

module.exports = Sorter;

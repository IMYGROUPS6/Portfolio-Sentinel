const crypto = require('crypto');

class SimulatedMCPAdapter {
  constructor() {
    this.prices = { BTC: 68000, ETH: 3600, USDT: 1 };
    this.holdings = {
      BTC: { asset: 'BTC', quantity: 1.1, averageCost: 55000 },
      ETH: { asset: 'ETH', quantity: 8, averageCost: 3900 },
      USDT: { asset: 'USDT', quantity: 12000, averageCost: 1 }
    };
    this.volatility = { BTC: 0.08, ETH: 0.14 };
    this.roc = { BTC: -0.04, ETH: -0.09 };
    this.executions = new Set();
  }

  async getPortfolioSnapshot() {
    const assets = Object.values(this.holdings).map((holding) => ({
      ...holding,
      price: this.prices[holding.asset],
      value: holding.quantity * this.prices[holding.asset],
      unrealizedPnl: holding.quantity * (this.prices[holding.asset] - holding.averageCost),
      volatility: this.volatility[holding.asset] || 0,
      rateOfChange: this.roc[holding.asset] || 0
    }));
    const fingerprint = crypto.createHash('sha256').update(JSON.stringify({ assets, prices: this.prices })).digest('hex');
    return { timestamp: new Date().toISOString(), assets, fingerprint, mode: 'simulation' };
  }

  async executeReducePosition({ asset, quantity, executionId }) {
    if (this.executions.has(executionId)) return { status: 'duplicate', executionId };
    const holding = this.holdings[asset];
    if (!holding || quantity <= 0 || quantity > holding.quantity) throw new Error('Invalid simulated order quantity');
    const proceeds = quantity * this.prices[asset];
    holding.quantity -= quantity;
    this.holdings.USDT.quantity += proceeds;
    this.executions.add(executionId);
    return { status: 'filled', executionId, asset, quantity, proceeds, price: this.prices[asset] };
  }

  async emergencyStop() {
    return { status: 'acknowledged', mode: 'simulation', message: 'Simulation emergency stop engaged' };
  }
}

module.exports = { SimulatedMCPAdapter };

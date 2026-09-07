function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function calculateRisk(snapshot, thresholds = {}) {
  const concentrationLimit = thresholds.concentrationLimit || 0.55;
  const volatilityLimit = thresholds.volatilityLimit || 0.1;
  const pnlLimit = thresholds.pnlLimit || -0.1;
  const deteriorationLimit = thresholds.deteriorationLimit || -0.06;
  const totalValue = snapshot.assets.reduce((sum, asset) => sum + asset.value, 0);
  const largest = snapshot.assets.reduce((current, asset) => asset.value > current.value ? asset : current, snapshot.assets[0]);
  const concentration = totalValue ? largest.value / totalValue : 0;
  const concentrationScore = clamp((concentration / concentrationLimit) * 35);
  const volatileAssets = snapshot.assets.filter((asset) => asset.volatility >= volatilityLimit);
  const volatilityScore = volatileAssets.length ? clamp(Math.max(...volatileAssets.map((asset) => asset.volatility / volatilityLimit * 25))) : 0;
  const losingAssets = snapshot.assets.filter((asset) => asset.value > 1 && asset.unrealizedPnl / asset.value <= pnlLimit);
  const pnlScore = losingAssets.length ? clamp(Math.max(...losingAssets.map((asset) => Math.abs(asset.unrealizedPnl / asset.value) / Math.abs(pnlLimit) * 20))) : 0;
  const deterioratingAssets = snapshot.assets.filter((asset) => asset.rateOfChange <= deteriorationLimit);
  const deteriorationScore = deterioratingAssets.length ? clamp(Math.max(...deterioratingAssets.map((asset) => Math.abs(asset.rateOfChange) / Math.abs(deteriorationLimit) * 20))) : 0;
  const score = Math.round(clamp(concentrationScore + volatilityScore + pnlScore + deteriorationScore));
  const riskTier = score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'moderate' : 'low';
  const evidence = [
    { signal: 'concentration', value: Number(concentration.toFixed(4)), score: Math.round(concentrationScore), triggered: concentration >= concentrationLimit, detail: `${largest.asset} is ${(concentration * 100).toFixed(1)}% of portfolio value` },
    { signal: 'volatility', value: volatileAssets.map((asset) => ({ asset: asset.asset, volatility: asset.volatility })), score: Math.round(volatilityScore), triggered: volatileAssets.length > 0, detail: `${volatileAssets.length} asset(s) exceed volatility threshold` },
    { signal: 'unrealized_pnl', value: losingAssets.map((asset) => ({ asset: asset.asset, pnl: asset.unrealizedPnl })), score: Math.round(pnlScore), triggered: losingAssets.length > 0, detail: `${losingAssets.length} asset(s) breach unrealized PnL threshold` },
    { signal: 'rate_of_change', value: deterioratingAssets.map((asset) => ({ asset: asset.asset, rateOfChange: asset.rateOfChange })), score: Math.round(deteriorationScore), triggered: deterioratingAssets.length > 0, detail: `${deterioratingAssets.length} asset(s) show abrupt deterioration` }
  ];
  const target = largest.asset === 'USDT' ? snapshot.assets.find((asset) => asset.asset !== 'USDT') : largest;
  const quantity = target ? Number((target.quantity * 0.25).toFixed(8)) : 0;
  return { score, riskTier, totalValue, evidence, recommendedAction: target && quantity > 0 ? { type: 'REDUCE_POSITION', asset: target.asset, quantity, destination: 'USDT', reason: 'Reduce the largest exposed position by 25%' } : null, snapshotFingerprint: snapshot.fingerprint };
}

module.exports = { calculateRisk };

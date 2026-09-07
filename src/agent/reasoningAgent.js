function buildDecision(risk) {
  const triggered = risk.evidence.filter((item) => item.triggered);
  return {
    risk_tier: risk.riskTier,
    evidence: triggered.map((item) => item.detail),
    options_considered: ['Hold and continue monitoring', 'Reduce the overweight spot position through a stablecoin conversion'],
    recommended_action: risk.recommendedAction,
    expected_effect: risk.recommendedAction ? `Decrease ${risk.recommendedAction.asset} exposure by 25% and increase USDT liquidity` : 'No corrective action required',
    confidence: triggered.length >= 2 ? 0.91 : 0.76
  };
}

module.exports = { buildDecision };

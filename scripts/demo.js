const { SimulatedMCPAdapter } = require('../src/adapters/SimulatedMCPAdapter');
const { PortfolioSentinel } = require('../src/sentinel');

async function main() {
  const sentinel = new PortfolioSentinel({ adapter: new SimulatedMCPAdapter() });
  const detected = await sentinel.inspect();
  console.log('DETECT:', detected.risk.score, detected.risk.riskTier);
  console.log('EXPLAIN:', detected.decision.evidence.join('; '));
  const proposed = sentinel.requestApproval();
  console.log('ASK APPROVAL: expires', proposed.approval.expiresAt);
  const result = await sentinel.approveAndExecute(sentinel.current.approval.token);
  console.log('VERIFY:', result.execution.status, 'state:', result.state);
  console.log('AUDIT EVENTS:', result.audit.length);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });

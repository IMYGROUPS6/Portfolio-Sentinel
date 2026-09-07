const request = require('supertest');
const { createApp } = require('../server');
const { SimulatedMCPAdapter } = require('../src/adapters/SimulatedMCPAdapter');
const { PortfolioSentinel } = require('../src/sentinel');
const { ApprovalGateway } = require('../src/gateway/approvalGateway');

describe('Portfolio Sentinel safety workflow', () => {
  test('calculates risk and requires approval before execution', async () => {
    const sentinel = new PortfolioSentinel({ adapter: new SimulatedMCPAdapter() });
    const inspected = await sentinel.inspect();
    expect(inspected.state).toBe('PROPOSAL_READY');
    expect(inspected.risk.score).toBeGreaterThan(0);
    expect(inspected.execution).toBeNull();
    sentinel.requestApproval();
    const result = await sentinel.approveAndExecute(sentinel.current.approval.token);
    expect(result.execution.status).toBe('filled');
    expect(result.state).toBe('REPORTED');
  });

  test('rejects stale portfolio approvals', async () => {
    const adapter = new SimulatedMCPAdapter();
    const sentinel = new PortfolioSentinel({ adapter });
    await sentinel.inspect();
    sentinel.requestApproval();
    adapter.prices.BTC = 50000;
    await expect(sentinel.approveAndExecute(sentinel.current.approval.token)).rejects.toThrow('stale');
  });

  test('rejects expired and duplicate approvals', async () => {
    const gateway = new ApprovalGateway({ ttlMs: 0 });
    const approval = gateway.issue({ proposal: {}, fingerprint: 'x' });
    expect(() => gateway.consume(approval.token, 'x')).toThrow('expired');
    const normal = new ApprovalGateway();
    const next = normal.issue({ proposal: {}, fingerprint: 'x' });
    normal.consume(next.token, 'x');
    expect(() => normal.consume(next.token, 'x')).toThrow('already used');
  });

  test('requires explicit emergency confirmation', async () => {
    const sentinel = new PortfolioSentinel({ adapter: new SimulatedMCPAdapter() });
    await expect(sentinel.emergencyStop(false)).rejects.toThrow('explicit confirmation');
    const result = await sentinel.emergencyStop(true);
    expect(result.stopRequested).toBe(true);
  });

  test('serves the approval-gated workflow over HTTP', async () => {
    const sentinel = new PortfolioSentinel({ adapter: new SimulatedMCPAdapter() });
    const app = createApp(sentinel);
    const scan = await request(app).post('/api/scan').expect(200);
    expect(scan.body.risk.riskTier).toBeDefined();
    await request(app).post('/api/proposal').expect(200);
    await request(app).post('/api/approve').send({ token: sentinel.current.approval.token }).expect(200);
    const status = await request(app).get('/api/status').expect(200);
    expect(status.body.state).toBe('REPORTED');
  });
});

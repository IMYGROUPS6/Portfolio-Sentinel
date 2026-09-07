const { calculateRisk } = require('./engine/riskEngine');
const { buildDecision } = require('./agent/reasoningAgent');
const { ApprovalGateway } = require('./gateway/approvalGateway');
const { AuditTrail } = require('./audit/auditTrail');

class PortfolioSentinel {
  constructor({ adapter, approvalGateway = new ApprovalGateway(), auditTrail = new AuditTrail() }) {
    this.adapter = adapter;
    this.approvalGateway = approvalGateway;
    this.auditTrail = auditTrail;
    this.state = 'MONITORING';
    this.current = null;
    this.stopRequested = false;
  }

  async inspect() {
    this.state = 'INVESTIGATING';
    const snapshot = await this.adapter.getPortfolioSnapshot();
    const risk = calculateRisk(snapshot);
    this.state = 'REASONING';
    const decision = buildDecision(risk);
    this.current = { snapshot, risk, decision };
    this.auditTrail.record('RISK_DETECTED', { state: this.state, riskScore: risk.score, riskTier: risk.riskTier, fingerprint: snapshot.fingerprint });
    if (decision.recommended_action) {
      this.state = 'PROPOSAL_READY';
      this.auditTrail.record('PROPOSAL_READY', { action: decision.recommended_action, fingerprint: snapshot.fingerprint });
    } else {
      this.state = 'MONITORING';
    }
    return this.getStatus();
  }

  requestApproval() {
    if (!this.current || !this.current.decision.recommended_action) throw new Error('No actionable proposal is ready');
    const approval = this.approvalGateway.issue({ proposal: this.current.decision, fingerprint: this.current.snapshot.fingerprint });
    this.current.approval = approval;
    this.state = 'AWAITING_APPROVAL';
    this.auditTrail.record('APPROVAL_REQUESTED', { token: approval.token, expiresAt: approval.expiresAt });
    return this.getStatus();
  }

  async approveAndExecute(token) {
    if (!this.current) throw new Error('No current proposal');
    const latest = await this.adapter.getPortfolioSnapshot();
    const approval = this.approvalGateway.consume(token, latest.fingerprint);
    this.state = 'EXECUTING';
    this.auditTrail.record('APPROVED', { token, fingerprint: latest.fingerprint });
    const action = approval.proposal.recommended_action;
    const execution = await this.adapter.executeReducePosition({ ...action, executionId: token });
    this.state = 'VERIFYING';
    const verifiedSnapshot = await this.adapter.getPortfolioSnapshot();
    this.auditTrail.record('EXECUTED', { execution, token });
    this.auditTrail.record('VERIFIED', { fingerprint: verifiedSnapshot.fingerprint, totalValue: verifiedSnapshot.assets.reduce((sum, asset) => sum + asset.value, 0) });
    this.state = 'REPORTED';
    this.current = { snapshot: verifiedSnapshot, risk: calculateRisk(verifiedSnapshot), decision: buildDecision(calculateRisk(verifiedSnapshot)), execution };
    return this.getStatus();
  }

  async emergencyStop(confirm) {
    if (confirm !== true) throw new Error('Emergency Stop requires explicit confirmation');
    this.state = 'EMERGENCY_PENDING';
    this.auditTrail.record('EMERGENCY_STOP_REQUESTED');
    this.state = 'EMERGENCY_EXECUTING';
    const result = await this.adapter.emergencyStop();
    this.stopRequested = true;
    this.state = 'VERIFYING';
    this.auditTrail.record('EMERGENCY_STOP_EXECUTED', { result });
    this.state = 'REPORTED';
    return this.getStatus();
  }

  getStatus() {
    return { state: this.state, mode: this.current?.snapshot?.mode || 'simulation', risk: this.current?.risk || null, decision: this.current?.decision || null, approval: this.current?.approval ? { token: this.current.approval.token, expiresAt: this.current.approval.expiresAt, status: this.current.approval.status } : null, execution: this.current?.execution || null, audit: this.auditTrail.list(), stopRequested: this.stopRequested };
  }
}

module.exports = { PortfolioSentinel };

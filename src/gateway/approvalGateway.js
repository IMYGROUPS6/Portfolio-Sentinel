const crypto = require('crypto');

class ApprovalGateway {
  constructor({ ttlMs = 120000 } = {}) {
    this.ttlMs = ttlMs ?? 120000;
    this.pending = new Map();
    this.used = new Set();
  }

  issue({ proposal, fingerprint }) {
    const token = crypto.randomBytes(18).toString('hex');
    const approval = { token, proposal, fingerprint, issuedAt: Date.now(), expiresAt: Date.now() + this.ttlMs, status: 'awaiting_approval' };
    this.pending.set(token, approval);
    return approval;
  }

  consume(token, fingerprint) {
    const approval = this.pending.get(token);
    if (!approval) throw new Error('Approval not found');
    if (this.used.has(token) || approval.status === 'used') throw new Error('Approval already used');
    if (Date.now() >= approval.expiresAt) { approval.status = 'expired'; throw new Error('Approval expired'); }
    if (approval.fingerprint !== fingerprint) throw new Error('Approval is stale for the current portfolio state');
    approval.status = 'used';
    this.used.add(token);
    return approval;
  }
}

module.exports = { ApprovalGateway };

class AuditTrail {
  constructor() { this.events = []; }
  record(type, data = {}) { this.events.push({ id: this.events.length + 1, type, timestamp: new Date().toISOString(), ...data }); return this.events[this.events.length - 1]; }
  list() { return [...this.events]; }
}

module.exports = { AuditTrail };

# Portfolio Sentinel

**AI Portfolio Risk Management Agent for Binance Agent OS**

Portfolio Sentinel is an AI-powered portfolio risk-management agent designed for the Binance Agent OS Mini Hackathon — Track A: Agent Creation, Trading Workflows.

## What it does

Portfolio Sentinel follows an approval-first agent workflow:

**Observe → Detect → Investigate → Reason → Evaluate → Explain → Ask Approval → Act → Verify → Report**

It combines multiple portfolio risk signals — including concentration, volatility, unrealized PnL, and abrupt risk deterioration — into a deterministic risk assessment. An AI reasoning layer interprets the verified evidence, compares possible responses, and proposes one specific corrective action.

### Safety model

- No fund-moving action occurs without explicit user approval.
- Approvals are time-limited.
- Approvals are tied to the portfolio state and protected against replay.
- Executed actions are verified by rereading portfolio state.
- A dedicated Emergency Stop workflow is included for critical risk deterioration.
- An append-only audit trail records the agent lifecycle.

## Current demo

The submitted build demonstrates the complete workflow using a **simulated MCP adapter**:

1. Observe portfolio state
2. Detect multi-signal risk
3. Investigate supporting evidence
4. Generate structured AI reasoning
5. Evaluate response options
6. Present an explainable proposal
7. Request explicit approval
8. Execute the approved action in simulation
9. Verify the resulting state
10. Report the audit trail

The live Binance MCP adapter is isolated from the simulation adapter. The submitted build does not use guessed tool schemas or undocumented live API calls.

## Architecture

```text
Dashboard
   ↓
Sentinel Loop
   ↓
Risk Engine ──→ Reasoning Agent
   ↓                  ↓
State Machine → Approval Gateway
   ↓                  ↓
MCP Adapter → Execute → Verify
   ↓
Audit Trail
```

### Project structure

```text
src/
├── adapters/
│   ├── BinanceMCPAdapter.js
│   └── SimulatedMCPAdapter.js
├── agent/
│   └── reasoningAgent.js
├── audit/
│   └── auditTrail.js
├── engine/
│   └── riskEngine.js
├── gateway/
│   └── approvalGateway.js
└── sentinel.js

public/
tests/
scripts/
server.js
```

## Run locally

Requirements: Node.js 18+ and npm.

```bash
npm install
npm start
```

Open `http://localhost:3000` in your browser.

Run the automated tests:

```bash
npm test
```

Run the end-to-end demo:

```bash
npm run demo
```

## Binance Agent OS integration

The architecture isolates Binance Agent OS connectivity behind an MCP adapter. For live deployment, configure the official Binance Agent OS / MCP connection and use the minimum required permissions, beginning with read-only access where possible.

Use a dedicated Agentic sub-account and never commit API keys, tokens, or `.env` secrets to the repository.

## Hackathon

**Binance Agent OS Mini Hackathon**

- Track: Track A — Agent Creation
- Theme: Trading Workflows
- Project: Portfolio Sentinel

## Status

The current repository is a hackathon demonstration build. Simulation mode is intentional so the complete safety workflow can be demonstrated without moving real funds.

## License

ISC

const $ = (selector) => document.querySelector(selector);
let latest = null;

function render(status) {
  latest = status;
  $('#state').textContent = status.state;
  $('#score').textContent = status.risk ? status.risk.score : '--';
  $('#tier').textContent = status.risk ? `${status.risk.riskTier} risk` : 'Awaiting scan';
  $('#meter').style.width = `${status.risk ? status.risk.score : 0}%`;
  $('#timestamp').textContent = status.risk ? `FINGERPRINT ${status.risk.snapshotFingerprint.slice(0, 10)}...` : 'No scan yet';
  $('#evidence').innerHTML = status.risk ? status.risk.evidence.map((item) => `<article class="evidence ${item.triggered ? '' : 'ok'}"><div><div class="evidence-name">${item.signal.replaceAll('_', ' ').toUpperCase()}</div><div class="evidence-detail">${item.detail}</div></div><div class="evidence-score">${item.score}</div></article>`).join('') : '<div class="empty">Run a scan to inspect verified portfolio signals.</div>';
  const action = status.decision?.recommended_action;
  $('#decision').innerHTML = status.decision ? `<h4>${action ? 'Reduce concentrated exposure' : 'Continue monitoring'}</h4><p>${status.decision.expected_effect}</p><span class="action-tag">CONFIDENCE ${(status.decision.confidence * 100).toFixed(0)}% / ${action ? `${action.asset} -> ${action.destination}` : 'NO ACTION'}</span>` : '<div class="empty">No recommendation is active.</div>';
  $('#approve').disabled = !(status.state === 'AWAITING_APPROVAL' && status.approval);
  $('#audit').innerHTML = status.audit.map((event) => `<div class="audit-event"><b>${event.type}</b>${new Date(event.timestamp).toLocaleTimeString()}</div>`).join('');
}
async function call(url, options = {}) { const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options }); const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; }
$('#scan').onclick = async () => { $('#message').textContent = 'Investigating verified account data...'; try { render(await call('/api/scan', { method: 'POST' })); const proposal = await call('/api/proposal', { method: 'POST' }); render(proposal); $('#message').textContent = 'Proposal ready. Explicit approval required.'; } catch (error) { $('#message').textContent = error.message; } };
$('#approve').onclick = async () => { if (!latest?.approval) return; const token = latest.approval.token; $('#approve').disabled = true; $('#message').textContent = 'Executing approved action and verifying result...'; try { render(await call('/api/approve', { method: 'POST', body: JSON.stringify({ token }) })); $('#message').textContent = 'Action verified and recorded.'; } catch (error) { $('#message').textContent = error.message; } };
$('#emergency').onclick = async () => { if (!window.confirm('Confirm Emergency Stop? This requires explicit confirmation.')) return; try { render(await call('/api/emergency-stop', { method: 'POST', body: JSON.stringify({ confirm: true }) })); $('#message').textContent = 'Emergency Stop engaged.'; } catch (error) { $('#message').textContent = error.message; } };
call('/api/status').then(render).catch(() => {});

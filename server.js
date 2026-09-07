const express = require('express');
const path = require('path');
const { SimulatedMCPAdapter } = require('./src/adapters/SimulatedMCPAdapter');
const { PortfolioSentinel } = require('./src/sentinel');

function createApp(sentinel = new PortfolioSentinel({ adapter: new SimulatedMCPAdapter() })) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('/api/status', (req, res) => res.json(sentinel.getStatus()));
  app.post('/api/scan', async (req, res) => { try { res.json(await sentinel.inspect()); } catch (error) { res.status(500).json({ error: error.message }); } });
  app.post('/api/approve', async (req, res) => { try { res.json(await sentinel.approveAndExecute(req.body.token)); } catch (error) { res.status(409).json({ error: error.message }); } });
  app.post('/api/proposal', (req, res) => { try { res.json(sentinel.requestApproval()); } catch (error) { res.status(409).json({ error: error.message }); } });
  app.post('/api/emergency-stop', async (req, res) => { try { res.json(await sentinel.emergencyStop(req.body.confirm)); } catch (error) { res.status(409).json({ error: error.message }); } });
  return app;
}

if (require.main === module) {
  const port = process.env.PORT || 3000;
  createApp().listen(port, () => console.log(`Portfolio Sentinel running at http://localhost:${port}`));
}

module.exports = { createApp };

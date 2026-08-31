const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

// Insert new routes before the React Router fallback
const insertPos = code.indexOf('// React Router fallback');
const newRoutes = `
// Inventory APIs
app.get('/api/inventory', (req, res) => {
  const { userId } = req.query;
  try {
    const rows = db.prepare('SELECT * FROM inventory WHERE userId = ?').all(userId);
    res.json(rows.map(r => ({ id: r.id, ...JSON.parse(r.data) })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/inventory', (req, res) => {
  const { id, userId, ...data } = req.body;
  try {
    db.prepare('INSERT OR REPLACE INTO inventory (id, userId, data) VALUES (?, ?, ?)').run(id, userId, JSON.stringify(data));
    res.json({ success: true, id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/inventory/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM inventory WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Parties APIs
app.get('/api/parties', (req, res) => {
  const { userId } = req.query;
  try {
    const rows = db.prepare('SELECT * FROM parties WHERE userId = ?').all(userId);
    res.json(rows.map(r => ({ id: r.id, ...JSON.parse(r.data) })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/parties', (req, res) => {
  const { id, userId, ...data } = req.body;
  try {
    db.prepare('INSERT OR REPLACE INTO parties (id, userId, data) VALUES (?, ?, ?)').run(id, userId, JSON.stringify(data));
    res.json({ success: true, id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/parties/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM parties WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Settings API
app.get('/api/settings', (req, res) => {
  const { userId } = req.query;
  try {
    const row = db.prepare('SELECT * FROM settings WHERE userId = ?').get(userId);
    res.json(row ? JSON.parse(row.data) : {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/settings', (req, res) => {
  const { userId, ...data } = req.body;
  try {
    db.prepare('INSERT OR REPLACE INTO settings (userId, data) VALUES (?, ?)').run(userId, JSON.stringify(data));
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
`;
fs.writeFileSync('backend/server.js', code.slice(0, insertPos) + newRoutes + code.slice(insertPos));

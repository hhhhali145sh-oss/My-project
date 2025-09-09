const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const DBFILE = path.join(__dirname, 'mvp.db');
const db = new sqlite3.Database(DBFILE);

// initialize tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    balance REAL DEFAULT 0
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    start_time TEXT,
    status TEXT DEFAULT 'open'
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS bets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    event_id INTEGER,
    outcome TEXT,
    stake REAL,
    potential_win REAL,
    status TEXT DEFAULT 'open',
    placed_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
});

// simple helper to run DB queries with Promise
function run(db, sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}
function all(db, sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}
function get(db, sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Seed a demo event if none exist
(async () => {
  const ev = await all(db, "SELECT * FROM events");
  if (ev.length === 0) {
    await run(db, "INSERT INTO events (title, start_time) VALUES (?,?)", ["Team A vs Team B", new Date().toISOString()]);
    await run(db, "INSERT INTO events (title, start_time) VALUES (?,?)", ["Player X vs Player Y", new Date().toISOString()]);
    console.log('Seeded events');
  }
})();

// endpoints

app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    await run(db, "INSERT INTO users (email, password) VALUES (?, ?)", [email, password]);
    const user = await get(db, "SELECT id, email, balance FROM users WHERE email=?", [email]);
    res.json({ user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await get(db, "SELECT id, email, balance FROM users WHERE email=? AND password=?", [email, password]);
  if (!user) return res.status(401).json({ error: 'invalid credentials' });
  res.json({ user });
});

app.get('/api/events', async (req, res) => {
  const ev = await all(db, "SELECT * FROM events WHERE status='open'");
  // For demo, attach fixed odds for outcomes
  const events = ev.map(e => ({
    id: e.id, title: e.title, start_time: e.start_time,
    markets: [
      { outcome: 'A', price: 1.8 },
      { outcome: 'B', price: 2.0 },
      { outcome: 'Draw', price: 3.5 }
    ]
  }));
  res.json({ events });
});

app.get('/api/wallet/:userId', async (req, res) => {
  const uid = req.params.userId;
  const user = await get(db, "SELECT id, email, balance FROM users WHERE id=?", [uid]);
  if (!user) return res.status(404).json({ error: 'user not found' });
  res.json({ wallet: { balance: user.balance } });
});

app.post('/api/deposit', async (req, res) => {
  const { userId, amount } = req.body;
  if (!userId || !amount) return res.status(400).json({ error: 'userId and amount required' });
  try {
    await run(db, "UPDATE users SET balance = balance + ? WHERE id = ?", [amount, userId]);
    const user = await get(db, "SELECT id, email, balance FROM users WHERE id=?", [userId]);
    res.json({ wallet: { balance: user.balance } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/place-bet', async (req, res) => {
  const { userId, eventId, outcome, stake } = req.body;
  if (!userId || !eventId || !outcome || !stake) return res.status(400).json({ error: 'missing fields' });

  try {
    // check balance
    const user = await get(db, "SELECT id, balance FROM users WHERE id=?", [userId]);
    if (!user) return res.status(404).json({ error: 'user not found' });
    if (user.balance < stake) return res.status(400).json({ error: 'insufficient funds' });

    // fetch price (demo fixed)
    const price = outcome === 'A' ? 1.8 : (outcome === 'B' ? 2.0 : 3.5);
    const potentialWin = stake * price;

    // transaction: deduct balance & insert bet
    await run(db, "UPDATE users SET balance = balance - ? WHERE id=?", [stake, userId]);
    const r = await run(db, "INSERT INTO bets (user_id, event_id, outcome, stake, potential_win) VALUES (?,?,?,?,?)", [userId, eventId, outcome, stake, potentialWin]);
    res.json({ betId: r.lastID, potentialWin });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// basic settle endpoint for demo: settle an event by id and choose winning outcome
app.post('/api/settle', async (req, res) => {
  const { eventId, winningOutcome } = req.body;
  if (!eventId || !winningOutcome) return res.status(400).json({ error: 'missing fields' });

  try {
    // mark event closed
    await run(db, "UPDATE events SET status='closed' WHERE id=?", [eventId]);
    // find bets on event
    const bets = await all(db, "SELECT * FROM bets WHERE event_id=?", [eventId]);
    for (const b of bets) {
      if (b.outcome === winningOutcome) {
        // win: credit user
        await run(db, "UPDATE users SET balance = balance + ? WHERE id=?", [b.potential_win, b.user_id]);
        await run(db, "UPDATE bets SET status='won' WHERE id=?", [b.id]);
      } else {
        await run(db, "UPDATE bets SET status='lost' WHERE id=?", [b.id]);
      }
    }
    res.json({ settled: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server listening on port', PORT));

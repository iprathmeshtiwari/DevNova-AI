require('dotenv').config();
const express = require('express'), path = require('path');
const { connectDB, loadData, saveData } = require('./db');
const bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken'), crypto = require('crypto');

const helmet = require('helmet'), rateLimit = require('express-rate-limit');

const app = express();
app.use(helmet({ contentSecurityPolicy: { useDefaults: true, directives: { 'upgrade-insecure-requests': null } } }));
app.use(express.json({ limit: '1mb' }));
const limiter = (windowMs, limit) => rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down and try again shortly.' } });
const chatLimiter = limiter(60_000, 15);          // 15 chat requests per minute per IP
app.use('/api', limiter(60_000, 200));            // general API limit
app.use('/api/auth', limiter(15 * 60_000, 30));   // sign-in / sign-up attempts
app.use(express.static(path.join(__dirname, 'public')));

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('JWT_SECRET is missing from .env');

const DAILY_LIMIT = parseInt(process.env.DAILY_LIMIT) || 50;

let db = { users: [], conversations: [] };

const save = () => saveData(db);
const uid = () => crypto.randomUUID();
const today = () => new Date().toISOString().slice(0, 10);
const left = u => DAILY_LIMIT - (u.daily?.date === today() ? u.daily.count : 0);
const pub = ({ hash, daily, ...u }) => ({ ...u, remaining: left({ daily }) });
const token = u => jwt.sign({ id: u.id }, SECRET, { expiresIn: '7d' });


function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';

    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Please sign in again.' });
    }

    const token = header.slice(7).trim();
    if (!token) {
      return res.status(401).json({ error: 'Please sign in again.' });
    }

    const payload = jwt.verify(token, SECRET);
    const user = db.users.find(u => u.id === payload.id);

    if (!user) {
      return res.status(401).json({ error: 'Please sign in again.' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Please sign in again.' });
  }
}

// ---------- Auth ----------
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 8) return res.status(400).json({ error: 'Enter your name, email and a password of at least 8 characters.' });
  if (db.users.some(u => u.email === email.toLowerCase())) return res.status(409).json({ error: 'An account with this email already exists.' });
  const u = { id: uid(), name, email: email.toLowerCase(), hash: bcrypt.hashSync(password, 10), twofa: false,
    createdAt: Date.now(), lastLogin: Date.now(), loginCount: 1 };
  db.users.push(u);
try {
  await save();
} catch (err) {
  db.users.pop();
  return res.status(500).json({ error: 'Could not save account.' });
}
  res.json({ token: token(u), user: pub(u) });
});
app.post('/api/auth/login', limiter(15 * 60 * 1000, 5), async (req, res) => {
  const id = (req.body.email || '').toLowerCase();
  const u = db.users.find(u => u.email === id || u.name.toLowerCase() === id);
  if (!u || !bcrypt.compareSync(req.body.password || '', u.hash)) return res.status(401).json({ error: 'Email or password is incorrect.' });
  u.lastLogin = Date.now();
u.loginCount = (u.loginCount || 0) + 1;
await save();
  res.json({ token: token(u), user: pub(u) });
});
app.get('/api/me', auth, (req, res) => res.json(pub(req.user)));
app.patch('/api/me', auth, async (req, res) => {
  const { name, email, twofa } = req.body, u = req.user;
  if (name) u.name = name;
  if (email) u.email = email.toLowerCase();
  if (typeof twofa === 'boolean') u.twofa = twofa;
  await save();
res.json(pub(u));
});

// ---------- Chat (streaming) ----------
app.post('/api/chat', auth, chatLimiter, async (req, res) => {
  const u = req.user, { message, conversationId, regenerate } = req.body;
  const { AI_API_KEY, AI_BASE_URL, AI_MODEL } = process.env;
  if (!AI_API_KEY || !AI_BASE_URL || !AI_MODEL) return res.status(500).json({ error: 'The server needs AI_API_KEY, AI_BASE_URL and AI_MODEL in .env.' });
  if (left(u) <= 0) return res.status(429).json({ error: `You have used all ${DAILY_LIMIT} messages for today. Try again tomorrow.` });

  let c = db.conversations.find(c => c.id === conversationId && c.userId === u.id), history;
  if (regenerate) {
    if (!c) return res.status(404).json({ error: 'Conversation not found.' });
    history = [...c.messages];
    while (history.at(-1)?.role === 'assistant') history.pop();
    if (history.at(-1)?.role !== 'user') return res.status(400).json({ error: 'Nothing to regenerate.' });
  } else {
    if (!message?.trim()) return res.status(400).json({ error: 'Type a message first.' });
    if (message.length > 8000) return res.status(400).json({ error: 'That message is too long (8,000 characters max).' });
    history = [...(c?.messages || []), { role: 'user', content: message, t: Date.now() }];
  }
  const convId = c?.id || uid();

  const ctrl = new AbortController();               // lets the Stop button cancel the AI request
  res.on('close', () => { if (!res.writableEnded) ctrl.abort(); });
  const send = o => { if (!res.writableEnded && !res.destroyed) res.write(`data: ${JSON.stringify(o)}\n\n`); };
  let reply = '';
  try {
    const r = await fetch(`${AI_BASE_URL.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${AI_API_KEY}` },
      body: JSON.stringify({
        model: AI_MODEL, max_tokens: 1500, stream: true,
        messages: [
          { role: 'system', content: 'You are DevNova AI, a helpful assistant for work and life. Put code in markdown code fences with a language tag.' },
          ...history.slice(-20).map(({ role, content }) => ({ role, content }))
        ]
      })
    });
    if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error?.message || d.detail || 'The AI request failed.'); }

    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    send({ conversationId: convId });
    const dec = new TextDecoder(); let buf = '';
    for await (const chunk of r.body) {
      buf += dec.decode(chunk, { stream: true });
      const lines = buf.split('\n'); buf = lines.pop();
      for (const l of lines) {
        if (!l.startsWith('data:')) continue;
        const p = l.slice(5).trim(); if (p === '[DONE]') continue;
        try { const t = JSON.parse(p).choices?.[0]?.delta?.content; if (t) { reply += t; send({ delta: t }); } } catch {}
      }
    }
  } catch (e) {
    if (e.name !== 'AbortError') {
      if (!res.headersSent) return res.status(502).json({ error: e.message });
      send({ error: e.message });
    }
  }
  if (reply) {                                       // save full or partial (stopped) replies
    if (!c) { c = { id: convId, userId: u.id, title: history[0].content.slice(0, 60), messages: [], updated: 0 }; db.conversations.unshift(c); }
    c.messages = [...history, { role: 'assistant', content: reply, t: Date.now() }]; c.updated = Date.now();
    if (u.daily?.date !== today()) u.daily = { date: today(), count: 0 };
    u.daily.count++;
await save();
  }
  send({ done: true, remaining: left(u) });
  res.end();
});

// ---------- History ----------
app.get('/api/conversations', auth, (req, res) =>
  res.json(db.conversations.filter(c => c.userId === req.user.id).map(c => ({
    id: c.id, title: c.title, updated: c.updated, preview: c.messages.at(-1)?.content.slice(0, 90) || ''
  }))));
app.get('/api/conversations/:id', auth, (req, res) => {
  const c = db.conversations.find(c => c.id === req.params.id && c.userId === req.user.id);
  c ? res.json(c) : res.status(404).json({ error: 'Conversation not found.' });
});
app.patch('/api/conversations/:id', auth, async (req, res) => {
  const c = db.conversations.find(c => c.id === req.params.id && c.userId === req.user.id);
  const title = (req.body.title || '').trim().slice(0, 80);
  if (!c) return res.status(404).json({ error: 'Conversation not found.' });
  if (!title) return res.status(400).json({ error: 'Enter a name.' });
  c.title = title;
await save();
res.json({ title });
});
app.delete('/api/conversations/:id', auth, async (req, res) => {
  db.conversations = db.conversations.filter(c => !(c.id === req.params.id && c.userId === req.user.id));
  await save();
res.json({ ok: true });
});


async function startServer() {
  try {
    await connectDB();

    db = await loadData();

    db.users ??= [];
    db.conversations ??= [];

    db.users.forEach(u => {
      u.createdAt ??= Date.now();
      u.lastLogin ??= u.createdAt;
      u.loginCount ??= 1;
    });

    await save();

   const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`DevNova AI running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Server startup failed:', err.message);
    process.exit(1);
  }
}

startServer();


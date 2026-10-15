const $ = s => document.querySelector(s);
const P = {
  home:'M3 11l9-8 9 8M5 10v10h14V10', chat:'M21 12a8 8 0 0 1-11.5 7L4 20l1.2-4.5A8 8 0 1 1 21 12z',
  history:'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2', explore:'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z',
  wallet:'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l2-3h12M16 14h2', payments:'M4 3h16v18l-3-2-2.5 2-2.5-2-2.5 2L7 19l-3 2zM8 8h8M8 12h8',
  plans:'M9 4h6l1 2h3v15H5V6h3zM9 12h6M9 16h6', arrow:'M5 12h14M13 6l6 6-6 6', code:'M8 8l-5 4 5 4M16 8l5 4-5 4',
  write:'M4 20h4L19 9l-4-4L4 16z', analyze:'M4 20V10M10 20V4M16 20v-7M22 20H2', mail:'M3 6h18v12H3zM3 7l9 7 9-7',
  doc:'M6 3h8l4 4v14H6zM14 3v4h4', image:'M3 4h18v16H3zM3 16l5-5 4 4 3-3 6 6', more:'M12 5h.01M12 12h.01M12 19h.01', stop:'M7 7h10v10H7z', menu:'M4 6h16M4 12h16M4 18h16', settings:'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4', logout:'M9 21H5V3h4M16 17l5-5-5-5M21 12H9'
};
const ic = n => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${P[n]}"/></svg>`;
const logo = `<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M4 20 11 4h4L8 20zM12 20l7-16h2l-7 16z"/></svg>`;
const NAV = [['home','Home'],['chat','Chat'],['history','History'],['explore','Explore'],['settings','Settings']];
const TOOLS = [
  ['write','AI Writing','Create emails, blog posts, social media content and more.','Start Writing','Help me write a professional email to '],
  ['code','Code Assistant','Generate, explain, debug and refactor your code.','Start Coding','Write a Python function that '],
  ['image','Image Prompts','Describe a scene and get a detailed prompt to use with any image tool.','Start Creating','Write a detailed image prompt for '],
  ['doc','Document Analysis','Paste text from a document and get key insights.','Start Analyzing','Summarize the key points of this text:\n\n']
];
const go = h => location.hash === h ? render() : (location.hash = h);
const leftText = () => `${S.user.remaining} messages left today`;
const S = { title: '', busy: false, token: localStorage.dn_token, user: null, conv: null, msgs: [], prefill: '', auto: false, q: '' };

const esc = s => String(s).replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));
const md = t => esc(t).split('```').map((p, i) => i % 2
  ? `<div class="code"><div class="ch"><span>${p.match(/^(\w*)\n/)?.[1] || 'code'}</span><button data-copy>Copy</button></div><pre>${p.replace(/^\w*\n/, '')}</pre></div>`
  : p.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>')).join('');
const fmtDate = t => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtTime = t => new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const initials = n => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(t.h); t.h = setTimeout(() => t.classList.remove('show'), 3200); }
async function api(path, o = {}) {
  const r = await fetch('/api' + path, { ...o, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + S.token }, body: o.body && JSON.stringify(o.body) });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && S.token && !path.startsWith('/auth')) { logout(); }
  if (!r.ok) throw new Error(d.error || 'Something went wrong. Try again.');
  return d;
}
function logout() { localStorage.removeItem('dn_token'); S.token = null; S.user = null; S.conv = null; S.msgs = []; render(); }
function setSession(d) { S.token = d.token; S.user = d.user; localStorage.dn_token = d.token; location.hash = '#/home'; render(); }

// ---------- Views ----------
const V = {};
V.home = () => `
  <div class="hero"><small>Welcome back, ${esc(S.user.name.split(' ')[0])}!</small>
    <h1>Your AI Companion for<br>Smarter Work &amp; Life</h1>
    <p>Write, code, analyze, and create with the power of AI. All in one place.</p>
    <form class="ask" data-ask><input name="q" placeholder="Ask anything…" aria-label="Ask anything"><button class="go" aria-label="Send">${ic('arrow')}</button></form></div>
  <div class="grid4">${[['chat','Chat','Get answers',''],['code','Code','Write & debug',TOOLS[1][4]],['write','Write','Create content',TOOLS[0][4]],['analyze','Analyze','Upload files',TOOLS[3][4]]]
    .map(([i,t,s,p]) => `<button class="tile" data-prompt="${esc(p)}"><span class="ibox">${ic(i)}</span><span><b>${t}</b><small>${s}</small></span></button>`).join('')}</div>
  <h3>Quick Actions</h3>
  <div class="grid4">${[['code','Generate Code','Build something new','Write code for '],['doc','Summarize Document','Get key insights',TOOLS[3][4]],['mail','Write an Email','Be more productive',TOOLS[0][4]],['explore','Explore Tools','Discover features','#/explore']]
    .map(([i,t,s,p]) => `<button class="tile" ${p[0]==='#'?`data-go="${p}"`:`data-prompt="${esc(p)}"`}><span class="ibox">${ic(i)}</span><span><b>${t}</b><small>${s}</small></span></button>`).join('')}</div>`;

V.chat = () => `<div class="chat"><div class="chead"><b id="ct"></b><span class="sp"></span><button class="btn" data-newchat>New chat</button><button class="btn" data-rename>Rename</button><button class="btn" data-delchat>Delete</button></div>
  <div class="msgs" id="msgs"></div>
  <form class="compose" data-send><input name="m" placeholder="Type your message…" autocomplete="off" aria-label="Message"><button class="go" id="sb" aria-label="Send">${ic('arrow')}</button></form></div>`;
function paintMsgs() {
  const el = $('#msgs'); if (!el) return;
  const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80, last = S.msgs.length - 1;
  el.innerHTML = (S.msgs.length ? '' : `<div class="welcome"><small>Welcome</small><h1>Hello, ${esc(S.user.name.split(' ')[0])}!</h1><p>Your Intelligence. Beyond Limits.</p><small>Ask anything below to get started.</small></div>`) +
    S.msgs.map((m, i) => m.role === 'user' ? `<div class="m user">${esc(m.content)}</div>`
      : `<div class="m bot"><small>DevNova AI · ${fmtTime(m.t || Date.now())}</small>${m.content ? md(m.content) : '<span class="dots"><i></i><i></i><i></i></span>'}${!S.busy && m.content ? `<div class="acts"><button data-copymsg="${i}">Copy</button>${i === last ? '<button data-regen>Regenerate</button>' : ''}</div>` : ''}</div>`).join('');
  if (near) el.scrollTop = el.scrollHeight;
  $('#ct').textContent = S.title || 'New chat';
  const b = $('#sb'); b.innerHTML = ic(S.busy ? 'stop' : 'arrow'); b.setAttribute('aria-label', S.busy ? 'Stop' : 'Send');
  if (S.busy) b.dataset.stop = '1'; else delete b.dataset.stop;
}
async function send(text, regen) {
  if (S.busy) return;
  if (regen) { while (S.msgs.at(-1)?.role === 'assistant') S.msgs.pop(); }
  else { S.msgs.push({ role: 'user', content: text, t: Date.now() }); if (!S.conv && !S.title) S.title = text.slice(0, 60); }
  const bot = { role: 'assistant', content: '', t: Date.now() };
  S.msgs.push(bot); S.busy = true; S.ctrl = new AbortController(); paintMsgs();
  try {
    const r = await fetch('/api/chat', { method: 'POST', signal: S.ctrl.signal, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + S.token },
      body: JSON.stringify({ message: text, conversationId: S.conv, regenerate: !!regen }) });
    if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || 'Something went wrong. Try again.'); }
    const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '';
    for (;;) {
      const { done, value } = await rd.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split('\n\n'); buf = parts.pop();
      for (const p of parts) {
        if (!p.startsWith('data:')) continue;
        const o = JSON.parse(p.slice(5));
        if (o.conversationId) S.conv = o.conversationId;
        if (o.delta) { bot.content += o.delta; paintMsgs(); }
        if (o.error) throw new Error(o.error);
        if (o.remaining !== undefined) { S.user.remaining = o.remaining; const l = $('#left'); if (l) l.textContent = leftText(); }
      }
    }
  } catch (e) { if (e.name !== 'AbortError') toast(e.message); }
  if (!bot.content) {   // nothing was saved: restore the chat to what the server has
    try { S.msgs = (await api('/conversations/' + S.conv)).messages; }
    catch { S.msgs = S.msgs.filter(m => m !== bot); if (!regen) S.msgs.pop(); if (!S.msgs.length) { S.conv = null; S.title = ''; } }
    const i = document.querySelector('[name=m]'); if (i && !regen && !i.value) i.value = text;
  }
  S.busy = false; paintMsgs();
}
V.chat.after = () => {
  paintMsgs();
  if (S.prefill) { const t = S.prefill; S.prefill = ''; if (S.auto) { S.auto = false; send(t); } else { const i = document.querySelector('[name=m]'); i.value = t; i.focus(); } }
};

V.history = async () => {
  const all = await api('/conversations'); S.all = all; return `<h1>Conversation History</h1><small>Your past conversations, always available.</small>
  <div class="bar"><input id="hq" placeholder="Search conversations…" value="${esc(S.q)}" aria-label="Search conversations"><select id="hs" aria-label="Sort"><option value="n">Newest</option><option value="o">Oldest</option></select></div>
  <div class="list" id="hl"></div>`;
};
function paintHistory() {
  const q = ($('#hq').value || '').toLowerCase(), o = $('#hs').value === 'o';
  const rows = S.all.filter(c => (c.title + c.preview).toLowerCase().includes(q)).sort((a, b) => o ? a.updated - b.updated : b.updated - a.updated);
  $('#hl').innerHTML = rows.map(c => `<div class="row" data-open="${c.id}"><span class="ibox">${ic('doc')}</span><span class="t"><b>${esc(c.title)}</b><small>${esc(c.preview)}</small></span><small>${fmtDate(c.updated)}</small><button class="btn" data-del="${c.id}" aria-label="Delete conversation">Delete</button></div>`).join('')
    || `<div class="card mu">No conversations yet. Start one from Chat.</div>`;
}
V.history.after = () => { paintHistory(); $('#hq').oninput = $('#hs').onchange = paintHistory; };

V.explore = () => `<h1>AI Tools &amp; Features</h1><small>Powerful tools to boost your productivity.</small>
  <div class="grid2" style="margin-top:18px">${TOOLS.map(([i,t,d,b,p]) => `<div class="card"><span class="ibox">${ic(i)}</span><h3 style="margin:14px 0 4px">${t}</h3><small>${d}</small><p><button class="btn" data-prompt="${esc(p)}">${b}</button></p></div>`).join('')}</div>`;

V.settings = () => { const u = S.user; return `<h1>Settings &amp; Profile</h1><small>Manage your account, preferences and security.</small>
  <div class="grid2" style="margin-top:18px"><form class="card" data-save><div class="feat" style="margin-bottom:18px"><span class="av" style="width:60px;height:60px;font-size:18px">${initials(u.name)}</span><div><b>${esc(u.name)}</b><br><small>${esc(u.email)}</small><br><small>Member since ${fmtDate(u.createdAt)} · Last login ${fmtDate(u.lastLogin)}, ${fmtTime(u.lastLogin)}</small></div></div>
    <div class="fld"><label for="n">Full name</label><input id="n" name="name" value="${esc(u.name)}" required></div>
    <div class="fld"><label for="e">Email address</label><input id="e" name="email" type="email" value="${esc(u.email)}" required></div>
    <label class="feat"><input type="checkbox" name="twofa" ${u.twofa?'checked':''}> Two-factor authentication (preference only; add an authenticator flow before launch)</label>
    <p><button class="btn p">Save changes</button></p></form>
  <div class="card"><b>Theme</b><div class="seg" style="margin:12px 0 20px"><button class="btn ${document.body.classList.contains('light')?'on':''}" data-theme="light">Light</button><button class="btn ${document.body.classList.contains('light')?'':'on'}" data-theme="dark">Dark</button></div>
    <button class="btn" data-logout>Sign out</button></div></div>`; };

function authView() {
  const reg = S.reg;
  return `<div class="auth"><div class="l"><div class="brand" style="font-size:24px">${logo}<b>DevNova AI</b></div><small>Your Intelligence. Beyond Limits.</small>
    ${[['chat','Smarter Conversations','Get better answers, faster.'],['analyze','Better Productivity','Work smarter, not harder.'],['explore','Limitless Possibilities','Build, create, achieve.']].map(([i,t,d]) => `<div class="feat"><span class="ibox">${ic(i)}</span><span><b>${t}</b><br><small>${d}</small></span></div>`).join('')}</div>
  <div class="r"><form data-auth><div class="tabs"><button type="button" data-tab="in" class="${reg?'':'on'}">Sign In</button><button type="button" data-tab="up" class="${reg?'on':''}">Create Account</button></div>
    <h2 style="margin:0 0 4px">${reg?'Create your account':'Welcome Back'}</h2><small>${reg?'Create an account to save your chats.':'Sign in to your account to continue.'}</small><div style="height:16px"></div>
    ${reg?`<div class="fld"><label for="an">Full name</label><input id="an" name="name" required autocomplete="name"></div>`:''}
    <div class="fld"><label for="ae">${reg?'Email':'Email or username'}</label><input id="ae" name="email" required autocomplete="username"></div>
    <div class="fld"><label for="ap">Password</label><input id="ap" name="password" type="password" required minlength="8" autocomplete="${reg?'new-password':'current-password'}"></div>
    <div class="err" id="err"></div><button class="btn p w">${reg?'Create Account':'Sign In'}</button>
    <p class="mu" style="text-align:center">or</p>
    <button type="button" class="btn w" data-social style="margin-bottom:8px">Continue with Google</button><button type="button" class="btn w" data-social>Continue with GitHub</button></form></div></div>`;
}

// ---------- Shell + router ----------
async function render() {
  const app = $('#app');
  if (!S.token) { app.innerHTML = authView(); return; }
  if (!S.user) { try { S.user = await api('/me'); } catch { return; } }
  const r = (location.hash.slice(2) || 'home'), view = V[r] || V.home, key = V[r] ? r : 'home';
  const u = S.user;
  app.innerHTML = `<div class="shell"><aside class="side"><div class="brand">${logo}<b>DevNova AI</b></div>
    <div class="sec">Menu</div><nav aria-label="Main">${NAV.map(([k,l]) => `<a href="#/${k}" class="${key===k?'on':''}" aria-label="${l}" title="${l}">${ic(k)}<span class="lbl">${l}</span></a>`).join('')}</nav>
    <div class="bottom"><a class="me" href="#/settings" aria-label="Profile and settings" title="Profile and settings"><span class="av">${initials(u.name)}</span><span><b>${esc(u.name)}</b><small>${esc(u.email)}</small></span></a><button class="out" data-logout aria-label="Sign out" title="Sign out">${ic('logout')}<span class="lbl">Sign out</span></button></div></aside>
    <main><header class="top"><button class="menu" data-menu aria-label="Toggle menu" aria-expanded="true">${ic('menu')}</button><input id="gs" placeholder="Search anything…" aria-label="Search"><span class="sp"></span><small id="left">${leftText()}</small><a class="av" href="#/settings" aria-label="Profile">${initials(u.name)}</a></header>
    <section class="view" id="view"><small>Loading…</small></section></main><div class="scrim"></div></div>`;
  applyLayout();
  try { $('#view').innerHTML = await view(); view.after?.(); } catch (e) { $('#view').innerHTML = `<div class="card">${esc(e.message)}</div>`; }
}
function applyLayout() {
  const w = innerWidth, pref = localStorage.dn_nav, b = document.body.classList;
  b.toggle('nav-collapsed', w > 820 && pref === 'collapsed');   // full vertical menu by default; the menu button collapses it
  if (w > 820) b.remove('nav-open');
  $('[data-menu]')?.setAttribute('aria-expanded', String(w <= 820 ? b.contains('nav-open') : !b.contains('nav-collapsed')));
}
addEventListener('resize', applyLayout);
addEventListener('hashchange', () => { document.body.classList.remove('nav-open'); render(); });
document.addEventListener('click', e => { if (e.target.closest('.scrim, .side a')) { document.body.classList.remove('nav-open'); applyLayout(); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { document.body.classList.remove('nav-open'); applyLayout(); } });

// ---------- Events (delegated) ----------
document.addEventListener('click', async e => {
  const t = e.target.closest('button,[data-open]'); if (!t) return;
  const d = t.dataset;
  try {
    if (d.go) location.hash = d.go;
    else if (d.prompt !== undefined) { S.prefill = d.prompt; S.conv = null; S.msgs = []; S.title = ''; go('#/chat'); }
    else if (d.copy !== undefined) { navigator.clipboard.writeText(t.closest('.code').querySelector('pre').textContent); toast('Copied to clipboard'); }
    else if (d.open) { const c = await api('/conversations/' + d.open); S.conv = c.id; S.msgs = c.messages; S.title = c.title; go('#/chat'); }
    else if (d.del) { e.stopPropagation(); if (confirm('Delete this conversation? This cannot be undone.')) { await api('/conversations/' + d.del, { method: 'DELETE' }); S.all = S.all.filter(c => c.id !== d.del); if (S.conv === d.del) { S.conv = null; S.msgs = []; S.title = ''; } paintHistory(); toast('Conversation deleted'); } }
    else if (d.menu !== undefined) { if (innerWidth <= 820) document.body.classList.toggle('nav-open'); else localStorage.dn_nav = document.body.classList.contains('nav-collapsed') ? 'expanded' : 'collapsed'; applyLayout(); }
    else if (d.stop) { e.preventDefault(); S.ctrl?.abort(); }
    else if (d.regen !== undefined) send('', true);
    else if (d.copymsg !== undefined) { navigator.clipboard.writeText(S.msgs[d.copymsg].content); toast('Copied to clipboard'); }
    else if (d.newchat !== undefined) { if (S.busy) S.ctrl?.abort(); S.conv = null; S.msgs = []; S.title = ''; S.busy = false; go('#/chat'); }
    else if (d.rename !== undefined) { if (!S.conv) return toast('Send a message first, then you can rename the chat.'); const n = prompt('Rename chat', S.title); if (n && n.trim()) { const r = await api('/conversations/' + S.conv, { method: 'PATCH', body: { title: n } }); S.title = r.title; paintMsgs(); } }
    else if (d.delchat !== undefined) { if (!S.conv) { S.msgs = []; S.title = ''; paintMsgs(); return; } if (confirm('Delete this conversation? This cannot be undone.')) { await api('/conversations/' + S.conv, { method: 'DELETE' }); S.conv = null; S.msgs = []; S.title = ''; toast('Conversation deleted'); go('#/history'); } }
    else if (d.tab) { S.reg = d.tab === 'up'; render(); }
    else if (d.social) toast('Google and GitHub sign-in need OAuth keys. See the README.');
    else if (d.theme) { document.body.classList.toggle('light', d.theme === 'light'); localStorage.dn_theme = d.theme; render(); }
    else if (d.logout !== undefined) logout();
  } catch (err) { toast(err.message); }
});
document.addEventListener('submit', async e => {
  e.preventDefault(); const f = e.target, v = Object.fromEntries(new FormData(f));
  try {
    if (f.dataset.auth !== undefined) { try { setSession(await api(S.reg ? '/auth/register' : '/auth/login', { method: 'POST', body: v })); } catch (er) { $('#err').textContent = er.message; } }
    else if (f.dataset.ask !== undefined) { if (!v.q.trim()) return; S.prefill = v.q; S.auto = true; S.conv = null; S.msgs = []; S.title = ''; go('#/chat'); }
    else if (f.dataset.send !== undefined) { f.reset(); send(v.m); }
    else if (f.dataset.save !== undefined) { S.user = await api('/me', { method: 'PATCH', body: { name: v.name, email: v.email, twofa: !!v.twofa } }); toast('Changes saved'); render(); }
  } catch (er) { toast(er.message); }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'gs') { S.q = e.target.value; go('#/history'); } });

if (localStorage.dn_theme === 'light') document.body.classList.add('light');
render();

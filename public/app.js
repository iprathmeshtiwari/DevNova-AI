const $ = s => document.querySelector(s);
const P = {
  home:'M3 11l9-8 9 8M5 10v10h14V10', chat:'M21 12a8 8 0 0 1-11.5 7L4 20l1.2-4.5A8 8 0 1 1 21 12z',
  history:'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2', explore:'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z',
  wallet:'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l2-3h12M16 14h2', payments:'M4 3h16v18l-3-2-2.5 2-2.5-2-2.5 2L7 19l-3 2zM8 8h8M8 12h8',
  plans:'M9 4h6l1 2h3v15H5V6h3zM9 12h6M9 16h6', arrow:'M5 12h14M13 6l6 6-6 6', code:'M8 8l-5 4 5 4M16 8l5 4-5 4',
  write:'M4 20h4L19 9l-4-4L4 16z', analyze:'M4 20V10M10 20V4M16 20v-7M22 20H2', mail:'M3 6h18v12H3zM3 7l9 7 9-7',
  doc:'M6 3h8l4 4v14H6zM14 3v4h4', image:'M3 4h18v16H3zM3 16l5-5 4 4 3-3 6 6', more:'M12 5h.01M12 12h.01M12 19h.01', stop:'M7 7h10v10H7z', menu:'M4 6h16M4 12h16M4 18h16', settings:'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4', logout:'M9 21H5V3h4M16 17l5-5-5-5M21 12H9',
  mic:'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8', attach:'M21 11.5 12 20a6 6 0 0 1-8.5-8.5l9-9a4 4 0 0 1 5.7 5.7l-9 9a2 2 0 0 1-2.8-2.8l8.5-8.5', volume:'M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14', x:'M18 6 6 18M6 6l12 12'
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
const S = { title: '', busy: false, token: localStorage.dn_token, user: null, conv: null, msgs: [], prefill: '', auto: false, q: '',
  attachments: [], attachmentKinds: [], uploadLimits: null, recognition: null, voiceFinal: '', speaking: false, speechPaused: false, speakingIndex: null, chatRequest: 0,
  speakResponses: localStorage.dn_speak === 'true', voiceLanguage: ['en-US', 'hi-IN'].includes(localStorage.dn_voice_language) ? localStorage.dn_voice_language : 'en-US', previewUrls: [] };

const esc = s => String(s).replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[c]));
const highlightCode = (source, lang = '') => {
  const keywords = /\b(const|let|var|function|return|if|else|for|while|async|await|new|class|import|from|export|default|try|catch|throw|true|false|null|undefined|def|print|in|and|or|not|None|True|False|public|private|static|void|int|string|bool|SELECT|FROM|WHERE|INSERT|UPDATE|DELETE)\b/;

  const tokenRe = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:const|let|var|function|return|if|else|for|while|async|await|new|class|import|from|export|default|try|catch|throw|true|false|null|undefined|def|print|in|and|or|not|None|True|False|public|private|static|void|int|string|bool|SELECT|FROM|WHERE|INSERT|UPDATE|DELETE)\b|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*(?=\s*\()|===?|!==?|&&|\|\||=>|[{}()[\];,.])/g;

  return String(source).split(tokenRe).map(part => {
    if (!part) return '';

    let type = '';
    if (/^(\/\/|\/\*|#)/.test(part)) type = 'comment';
    else if (/^["'`]/.test(part)) type = 'string';
    else if (keywords.test(part)) type = 'keyword';
    else if (/^\d/.test(part)) type = 'number';
    else if (/^[A-Za-z_$]/.test(part)) type = 'function';
    else if (/^(===?|!==?|&&|\|\||=>)$/.test(part)) type = 'operator';
    else type = 'punct';

    return `<span class="tok-${type}">${esc(part)}</span>`;
  }).join('');
};


const md = t => {
  const blocks = [];

  let text = String(t).replace(
    /```([\w+-]*)[ \t]*\n?([\s\S]*?)```/g,
    (_, lang, code) => {
      const i = blocks.length;
      const language = lang || 'code';
      const cleanCode = code.replace(/\n$/, '');

      blocks.push(
        `<div class="code">
          <div class="ch">
            <span>${esc(language)}</span>
            <button type="button" data-copy>Copy</button>
          </div>
          <pre><code class="language-${esc(language)}">${highlightCode(cleanCode, language)}</code></pre>
        </div>`
      );

      return `\u0000${i}\u0000`;
    }
  );

  text = esc(text)
    // Inline code
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    // Markdown links: [Hindustan](https://example.com)
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      (_, label, url) => {
        const safeUrl = url.replace(/&amp;/g, '&');
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${label}</a>`;
      }
    )
    // Bare URLs: https://example.com
    .replace(
      /(^|[\s>])(https?:\/\/[^\s<]+)/g,
      (match, prefix, url) => {
        const cleanUrl = url.replace(/[.,!?;:]+$/, '');
        const trailing = url.slice(cleanUrl.length);
        return `${prefix}<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanUrl}</a>${trailing}`;
      }
    )
    .replace(/\n/g, '<br>');

  return text.replace(/\u0000(\d+)\u0000/g, (_, i) => blocks[Number(i)]);
};

const fmtDate = t => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtTime = t => new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const initials = n => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(t.h); t.h = setTimeout(() => t.classList.remove('show'), 3200); }
const humanSize = n => n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
function fileCategory(file, preferredKind = '') {
  const ext = file.name.split('.').pop().toLowerCase();
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return 'image';
  if (preferredKind === 'code' && ['txt', 'md', 'json'].includes(ext)) return 'code';
  if (['pdf', 'txt', 'docx', 'csv', 'md', 'json'].includes(ext)) return 'document';
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'php', 'html', 'css', 'scss', 'sql', 'sh', 'yaml', 'yml', 'xml'].includes(ext)) return 'code';
  return null;
}
function renderAttachments() {
  S.previewUrls.forEach(url => URL.revokeObjectURL(url)); S.previewUrls = [];
  const el = $('#attachPreview'); if (!el) return;
  el.innerHTML = S.attachments.map((file, index) => {
    const category = fileCategory(file, S.attachmentKinds[index]), image = category === 'image', preview = image ? URL.createObjectURL(file) : '';
    if (preview) S.previewUrls.push(preview);
    return `<div class="attachment-chip">${image ? `<img src="${preview}" alt="">` : `<span class="file-kind">${ic(category === 'code' ? 'code' : 'doc')}</span>`}
      <span class="attachment-name"><b>${esc(file.name)}</b><small>${humanSize(file.size)}${S.busy ? ' · Processing' : ''}</small></span>
      <button type="button" data-remove-file="${index}" aria-label="Remove attachment" ${S.busy ? 'disabled' : ''}>${ic('x')}</button></div>`;
  }).join('');
}
function clearAttachments() {
  S.attachments = []; S.attachmentKinds = [];
  renderAttachments();
}
function addFiles(fileList, preferredKind = '') {
  const limits = S.uploadLimits || { imageSizeMb: 5, documentSizeMb: 10, codeSizeMb: 2 };
  const selected = Array.from(fileList || []);
  for (const file of selected) {
    const category = fileCategory(file, preferredKind);
    if (!category) { toast(`${file.name}: this file type is not supported.`); continue; }
    const sizeLimit = (category === 'image' ? limits.imageSizeMb : category === 'code' ? limits.codeSizeMb : limits.documentSizeMb) * 1024 * 1024;
    if (file.size > sizeLimit) { toast(`${file.name}: ${category} files must be ${limits[`${category}SizeMb`]} MB or smaller.`); continue; }
    if (S.attachments.length >= 5) { toast('Attach no more than 5 files per message.'); break; }
    if (S.attachments.reduce((total, existing) => total + existing.size, 0) + file.size > 20 * 1024 * 1024) {
      toast('Attachments must total 20 MB or less per message.'); continue;
    }
    if (!S.attachments.some((existing, index) => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified && S.attachmentKinds[index] === category)) {
      S.attachments.push(file); S.attachmentKinds.push(category);
    }
  }
  renderAttachments();
}
function voiceStatus(text, listening = false) {
  const el = $('#voiceStatus'); if (el) { el.textContent = text; el.classList.toggle('listening', listening); }
  const button = $('[data-voice]');
  const cancel = $('[data-voice-cancel]');
  if (button) {
    button.classList.toggle('active', listening);
    button.setAttribute('aria-pressed', String(listening));
    button.setAttribute('aria-label', listening ? 'Stop voice input' : 'Start voice input');
  }
  if (cancel) cancel.hidden = !listening;
}
function stopSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  S.speaking = false; S.speechPaused = false; S.speakingIndex = null;
}
function stopAudio() {
  abortRecognition(false);
  stopSpeech();
}
function abortRecognition(restoreInput) {
  if (!S.recognition) return;
  const recognition = S.recognition;
  recognition.devnovaCancelled = true;
  recognition.devnovaRestore = restoreInput;
  S.recognition = null;
  recognition.abort();
}
function cancelChatRequest() {
  if (!S.busy) return;
  S.chatRequest++;
  S.ctrl?.abort();
  S.busy = false;
}
function startVoiceInput() {
  if (S.recognition) { S.recognition.stop(); return; }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    voiceStatus('Voice input is not supported by this browser. Try a supported browser or type your message.');
    toast('This browser does not support speech recognition.');
    return;
  }
  const input = $('[name=m]'), recognition = new SpeechRecognition();
  S.voiceError = '';
  S.voiceFinal = input?.value || '';
  recognition.lang = $('#voiceLanguage')?.value || S.voiceLanguage;
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.onstart = () => voiceStatus('Listening… speak now. Your recording is not sent to DevNova.', true);
  recognition.onresult = event => {
    const transcript = Array.from(event.results).map(result => result[0].transcript).join('');
    if (input) input.value = `${S.voiceFinal}${S.voiceFinal && transcript ? ' ' : ''}${transcript}`;
  };
  recognition.onerror = event => {
    const messages = {
      'not-allowed': 'Microphone permission was denied. Allow microphone access in your browser settings.',
      'service-not-allowed': 'The browser speech recognition service is not permitted.',
      'no-speech': 'No speech was detected. Try speaking closer to the microphone.',
      network: 'The browser speech recognition service could not connect.',
      'audio-capture': 'No microphone is available.'
    };
    S.voiceError = messages[event.error] || (event.error === 'aborted' ? 'Voice input stopped.' : 'Speech recognition was interrupted.');
    voiceStatus(S.voiceError);
  };
  recognition.onend = () => {
    if (S.recognition === recognition) S.recognition = null;
    if (recognition.devnovaCancelled) {
      if (recognition.devnovaRestore && input) input.value = S.voiceFinal;
      voiceStatus(recognition.devnovaRestore ? 'Voice input canceled.' : 'Voice input stopped.');
      return;
    }
    if (S.voiceError) { const message = S.voiceError; S.voiceError = ''; voiceStatus(message); return; }
    const text = input?.value !== S.voiceFinal ? 'Speech added to your message. Review or edit it before sending.' : 'Voice input stopped. You can try again or type your message.';
    voiceStatus(text);
  };
  S.recognition = recognition;
  try { recognition.start(); }
  catch (error) { S.recognition = null; voiceStatus('Could not start the microphone. Check browser permissions and try again.'); }
}
function speakText(text, index) {
  if (!('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) {
    toast('Spoken responses are not supported by this browser.');
    return;
  }
  stopSpeech();
  const utterance = new SpeechSynthesisUtterance(text.replace(/```[^\n]*\n([\s\S]*?)```/g, '$1').replace(/[*_`#]/g, ''));
  utterance.lang = S.voiceLanguage;
  const finish = () => {
    S.speaking = false; S.speechPaused = false; S.speakingIndex = null; paintMsgs();
  };
  utterance.onend = finish;
  utterance.onerror = () => { if (S.speakingIndex === index) toast('Spoken response playback failed.'); finish(); };
  S.speaking = true; S.speechPaused = false; S.speakingIndex = index;
  window.speechSynthesis.speak(utterance);
  paintMsgs();
}
async function api(path, o = {}) {
  const r = await fetch('/api' + path, { ...o, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + S.token }, body: o.body && JSON.stringify(o.body) });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && S.token && !path.startsWith('/auth')) { logout(); }
  if (!r.ok) throw new Error(d.error || 'Something went wrong. Try again.');
  return d;
}
function logout() { cancelChatRequest(); stopAudio(); clearAttachments(); localStorage.removeItem('dn_token'); S.token = null; S.user = null; S.conv = null; S.msgs = []; render(); }
function setSession(d) { S.token = d.token; S.user = d.user; localStorage.dn_token = d.token; location.hash = '#/home'; render(); }

async function completeGoogleSignIn() {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const ticket = params.get('google_ticket');

  if (params.has('google_error')) {
    history.replaceState(null, '', location.pathname + location.search + '#/login');
    toast('Google sign-in failed. Please try again.');
    return;
  }

  if (params.has('google_link_required')) {
    history.replaceState(null, '', location.pathname + location.search + '#/login');
    toast('This email already has an account. Sign in with your password first.');
    return;
  }

  if (!ticket) return;

  // Remove the one-time ticket from the address bar immediately.
  location.hash = '#/home';

  try {
    const response = await fetch('/api/auth/google/exchange', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ticket })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || 'Google sign-in failed.');
    }

    setSession(data);
  } catch (error) {
    toast(error.message);
  }
}

completeGoogleSignIn();


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

V.chat = () => `<div class="chat"><div class="chead"><b id="ct"></b><span class="sp"></span><button type="button" class="btn" data-newchat>New chat</button><button type="button" class="btn" data-rename>Rename</button><button type="button" class="btn" data-delchat>Delete</button></div>
  <div class="msgs" id="msgs"></div>
  <form class="compose" data-send>
    <div class="attach-preview" id="attachPreview" aria-live="polite"></div>
    <div class="compose-tools">
      <label class="btn file-button" title="Attach documents">${ic('attach')}<span>Documents</span><input id="filePicker" class="hidden-file" type="file" multiple accept=".pdf,.txt,.docx,.csv,.md,.json" aria-label="Attach PDF, DOCX, TXT, CSV, Markdown, or JSON documents"></label>
      <label class="btn file-button" title="Attach source code">${ic('code')}<span>Code</span><input id="codePicker" class="hidden-file" type="file" multiple accept=".txt,.md,.json,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.h,.cs,.go,.rs,.php,.html,.css,.scss,.sql,.sh,.yaml,.yml,.xml" aria-label="Attach source code files"></label>
      <label class="btn file-button" title="Attach images">${ic('image')}<span>Images</span><input id="imagePicker" class="hidden-file" type="file" multiple accept="image/png,image/jpeg,image/webp" aria-label="Attach PNG, JPEG, or WebP images"></label>
      <button type="button" class="btn voice-button" data-voice aria-label="Start voice input" aria-pressed="false">${ic('mic')}<span>Voice</span></button>
      <select id="voiceLanguage" aria-label="Voice input language"><option value="en-US">English</option><option value="hi-IN">Hindi</option></select>
      <label class="speech-toggle"><input id="speakToggle" type="checkbox" ${S.speakResponses ? 'checked' : ''}> Speak replies</label>
    </div>
    <div class="voice-status-row"><div class="voice-status" id="voiceStatus" role="status" aria-live="polite">Voice input uses supported browser speech recognition; audio is not uploaded to DevNova.</div><button type="button" class="btn voice-cancel" data-voice-cancel hidden>Cancel listening</button></div>
    <div class="compose-row"><input name="m" placeholder="Type your message…" autocomplete="off" aria-label="Message"><button class="go" id="sb" aria-label="Send">${ic('arrow')}</button></div>
  </form></div>`;
  function animateWelcomeName() {
  const el = document.getElementById('welcomeName');
  if (!el || !S.user) return;

  const name = String(S.user.name || 'there').trim().split(/\s+/)[0] || 'there';
  el.textContent = '';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = name;
    return;
  }

  let i = 0;
  const typeNext = () => {
    if (!el.isConnected) return;
    el.textContent = name.slice(0, i);
    if (i < name.length) {
      i++;
      setTimeout(typeNext, 95);
    }
  };
  typeNext();
}

function paintMsgs() {
  const el = $('#msgs');
  if (!el) return;

  const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  const last = S.msgs.length - 1;
  const attachmentsUnavailable = S.msgs.some(
    message => message.role === 'user' &&
      /\[Attached (image|document|code):/.test(message.content)
  );

  const welcome = S.msgs.length === 0
    ? `<div class="welcome"><small>WELCOME TO DEVNOVA</small><h1>Hello, <span id="welcomeName"></span><span class="typing-cursor">|</span>!</h1><p>Your Intelligence. Beyond Limits.</p><small>Ask anything below to get started.</small></div>`
    : '';

  el.innerHTML = welcome + S.msgs.map((m, i) =>
    m.role === 'user'
      ? `<div class="m user">${esc(m.content)}</div>`
      : `<div class="m bot"><small>DevNova AI · ${fmtTime(m.t || Date.now())}</small>${m.content ? md(m.content) : '<span class="dots"><i></i><i></i><i></i></span>'}${!S.busy && m.content ? `<div class="acts"><button data-copymsg="${i}">Copy</button><button data-speak="${i}">${S.speakingIndex === i && S.speaking ? (S.speechPaused ? 'Resume' : 'Pause') : 'Read aloud'}</button>${S.speakingIndex === i && S.speaking ? '<button data-speech-stop>Stop audio</button>' : ''}${i === last && !attachmentsUnavailable ? '<button data-regen>Regenerate</button>' : ''}</div>` : ''}</div>`
  ).join('');

  if (near) el.scrollTop = el.scrollHeight;
  $('#ct').textContent = S.title || 'New chat';

  const b = $('#sb');
  b.innerHTML = ic(S.busy ? 'stop' : 'arrow');
  b.setAttribute('aria-label', S.busy ? 'Stop' : 'Send');
  if (S.busy) b.dataset.stop = '1';
  else delete b.dataset.stop;
}

async function send(text, regen, selectedFiles = S.attachments.slice(), selectedKinds = S.attachmentKinds.slice()) {
  if (S.busy) return;
  const requestId = ++S.chatRequest;
  if (regen) { while (S.msgs.at(-1)?.role === 'assistant') S.msgs.pop(); }
  else {
    const shown = [text.trim(), ...selectedFiles.map((file, index) => `[Attached ${fileCategory(file, selectedKinds[index])}: ${file.name}]`)].filter(Boolean).join('\n\n') || 'Please analyze the attached file(s).';
    S.msgs.push({ role: 'user', content: shown, t: Date.now() });
    if (!S.conv && !S.title) S.title = (text.trim() || selectedFiles[0]?.name || shown).slice(0, 60);
  }
  const bot = { role: 'assistant', content: '', t: Date.now() };
  S.msgs.push(bot); S.busy = true; S.ctrl = new AbortController(); paintMsgs(); renderAttachments();
  let completed = false;
  try {
    const headers = { authorization: 'Bearer ' + S.token };
    let body;
    if (selectedFiles.length) {
      body = new FormData();
      body.append('message', text);
      if (S.conv) body.append('conversationId', S.conv);
      if (regen) body.append('regenerate', 'true');
      body.append('attachmentKinds', JSON.stringify(selectedKinds));
      selectedFiles.forEach(file => body.append('attachments', file, file.name));
    } else {
      headers['content-type'] = 'application/json';
      body = JSON.stringify({ message: text, conversationId: S.conv, regenerate: !!regen });
    }
    const r = await fetch('/api/chat', { method: 'POST', signal: S.ctrl.signal, headers, body });
    if (requestId !== S.chatRequest) return;
    if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || 'Something went wrong. Try again.'); }
    const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '';
    for (;;) {
      if (requestId !== S.chatRequest) return;
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
        if (o.done) completed = true;
      }
    }
  } catch (e) { if (e.name !== 'AbortError') toast(e.message); }
  if (requestId !== S.chatRequest) return;
  if (!completed && !bot.content) {   // nothing was saved: restore the chat to what the server has
    try { S.msgs = (await api('/conversations/' + S.conv)).messages; }
    catch { S.msgs = S.msgs.filter(m => m !== bot); if (!regen) S.msgs.pop(); if (!S.msgs.length) { S.conv = null; S.title = ''; } }
    const i = document.querySelector('[name=m]'); if (i && !regen && !i.value) i.value = text;
  }
  if (completed && selectedFiles.length) clearAttachments();
  S.busy = false; paintMsgs(); renderAttachments();
  if (completed && S.speakResponses && bot.content && location.hash === '#/chat') speakText(bot.content, S.msgs.indexOf(bot));
}
V.chat.after = () => {
  paintMsgs();
  animateWelcomeName();
  renderAttachments();
  const language = $('#voiceLanguage');
  if (language) language.value = S.voiceLanguage;
  const toggle = $('#speakToggle');
  if (toggle) toggle.checked = S.speakResponses;
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
    <button type="button" class="btn w" data-google style="margin-bottom:8px">Continue with Google</button>
  </form></div></div>`;
}


// ---------- Shell + router ----------
async function render() {
  const app = $('#app');
  if (!S.token) { app.innerHTML = authView(); return; }
  if (!S.user) { try { S.user = await api('/me'); } catch { return; } }
  if (!S.uploadLimits) {
    try { S.uploadLimits = await api('/config'); }
    catch (error) {
      if (!S.token) return;
      app.innerHTML = `<div class="card" role="alert">${esc(error.message)}</div>`;
      return;
    }
  }
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
addEventListener('hashchange', () => {
  document.body.classList.remove('nav-open');
  if (location.hash !== '#/chat') { cancelChatRequest(); stopAudio(); clearAttachments(); }
  render();
});
document.addEventListener('click', e => { if (e.target.closest('.scrim, .side a')) { document.body.classList.remove('nav-open'); applyLayout(); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { document.body.classList.remove('nav-open'); applyLayout(); } });

// ---------- Events (delegated) ----------
document.addEventListener('click', async e => {
  const t = e.target.closest('button,[data-open]'); if (!t) return;
  const d = t.dataset;
  try {
    if (d.voice !== undefined) startVoiceInput();
    else if (d.voiceCancel !== undefined) {
      abortRecognition(true);
    }
    else if (d.speak !== undefined) {
      const index = Number(d.speak);
      if (S.speakingIndex === index && S.speaking && 'speechSynthesis' in window) {
        if (S.speechPaused) window.speechSynthesis.resume(); else window.speechSynthesis.pause();
        S.speechPaused = !S.speechPaused; paintMsgs();
      } else if (S.msgs[index]?.content) speakText(S.msgs[index].content, index);
    }
    else if (d.speechStop !== undefined) { stopSpeech(); paintMsgs(); }
    else if (d.removeFile !== undefined) { if (!S.busy) { const index = Number(d.removeFile); S.attachments.splice(index, 1); S.attachmentKinds.splice(index, 1); renderAttachments(); } }
    else if (d.go) location.hash = d.go;
    else if (d.prompt !== undefined) { stopAudio(); clearAttachments(); S.prefill = d.prompt; S.conv = null; S.msgs = []; S.title = ''; go('#/chat'); }
    else if (d.copy !== undefined) { navigator.clipboard.writeText(t.closest('.code').querySelector('pre').textContent); toast('Copied to clipboard'); }
    else if (d.open) { const c = await api('/conversations/' + d.open); clearAttachments(); S.conv = c.id; S.msgs = c.messages; S.title = c.title; go('#/chat'); }
    else if (d.del) { e.stopPropagation(); if (confirm('Delete this conversation? This cannot be undone.')) { await api('/conversations/' + d.del, { method: 'DELETE' }); S.all = S.all.filter(c => c.id !== d.del); if (S.conv === d.del) { S.conv = null; S.msgs = []; S.title = ''; } paintHistory(); toast('Conversation deleted'); } }
    else if (d.menu !== undefined) { if (innerWidth <= 820) document.body.classList.toggle('nav-open'); else localStorage.dn_nav = document.body.classList.contains('nav-collapsed') ? 'expanded' : 'collapsed'; applyLayout(); }
    else if (d.stop) { e.preventDefault(); S.ctrl?.abort(); }
    else if (d.regen !== undefined) send('', true, []);
    else if (d.copymsg !== undefined) { navigator.clipboard.writeText(S.msgs[d.copymsg].content); toast('Copied to clipboard'); }
    else if (d.newchat !== undefined) { stopAudio(); clearAttachments(); cancelChatRequest(); S.conv = null; S.msgs = []; S.title = ''; go('#/chat'); }
    else if (d.rename !== undefined) { if (!S.conv) return toast('Send a message first, then you can rename the chat.'); const n = prompt('Rename chat', S.title); if (n && n.trim()) { const r = await api('/conversations/' + S.conv, { method: 'PATCH', body: { title: n } }); S.title = r.title; paintMsgs(); } }
    else if (d.delchat !== undefined) { if (!S.conv) { S.msgs = []; S.title = ''; paintMsgs(); return; } if (confirm('Delete this conversation? This cannot be undone.')) { await api('/conversations/' + S.conv, { method: 'DELETE' }); S.conv = null; S.msgs = []; S.title = ''; toast('Conversation deleted'); go('#/history'); } }
    else if (d.tab) { S.reg = d.tab === 'up'; render(); }
    else if (d.google !== undefined) location.href = '/api/auth/google';
    else if (d.social) toast('GitHub sign-in is not configured yet.');
    else if (d.theme) { document.body.classList.toggle('light', d.theme === 'light'); localStorage.dn_theme = d.theme; render(); }
    else if (d.logout !== undefined) logout();
  } catch (err) { toast(err.message); }
});
document.addEventListener('change', e => {
  const target = e.target;
  if (target.id === 'filePicker' || target.id === 'codePicker' || target.id === 'imagePicker') {
  if (!S.busy) addFiles(target.files, target.id === 'codePicker' ? 'code' : '');
    target.value = '';
  } else if (target.id === 'voiceLanguage') {
    S.voiceLanguage = target.value; localStorage.dn_voice_language = target.value;
  } else if (target.id === 'speakToggle') {
    S.speakResponses = target.checked; localStorage.dn_speak = String(target.checked);
    if (!target.checked) { stopSpeech(); paintMsgs(); }
  }
});
document.addEventListener('submit', async e => {
  e.preventDefault(); const f = e.target, v = Object.fromEntries(new FormData(f));
  try {
    if (f.dataset.auth !== undefined) { try { setSession(await api(S.reg ? '/auth/register' : '/auth/login', { method: 'POST', body: v })); } catch (er) { $('#err').textContent = er.message; } }
    else if (f.dataset.ask !== undefined) { if (!v.q.trim()) return; S.prefill = v.q; S.auto = true; S.conv = null; S.msgs = []; S.title = ''; go('#/chat'); }
    else if (f.dataset.send !== undefined) {
      if (S.busy) return;
      if (!String(v.m || '').trim() && !S.attachments.length) return;
      abortRecognition(false);
      const input = f.elements.m, files = S.attachments.slice(), kinds = S.attachmentKinds.slice(), text = String(v.m || '');
      input.value = '';
      send(text, false, files, kinds);
    }
    else if (f.dataset.save !== undefined) { S.user = await api('/me', { method: 'PATCH', body: { name: v.name, email: v.email, twofa: !!v.twofa } }); toast('Changes saved'); render(); }
  } catch (er) { toast(er.message); }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'gs') { S.q = e.target.value; go('#/history'); } });

if (localStorage.dn_theme === 'light') document.body.classList.add('light');
render();

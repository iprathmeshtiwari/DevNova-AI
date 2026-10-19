// Exa web search. Reads EXA_API_KEY from the environment (never sent to the browser or the AI).
async function searchWeb(query) {
  const key = process.env.EXA_API_KEY;
  if (!key) throw new Error('EXA_API_KEY is not set');
  const q = String(query || '').trim().slice(0, 500);
  if (!q) return [];

  const r = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    signal: AbortSignal.timeout(8000),                         // never let a slow search hang the chat
    headers: { 'content-type': 'application/json', 'x-api-key': key },
    body: JSON.stringify({ query: q, numResults: 5, contents: { text: { maxCharacters: 1500 } } })
  });
  if (!r.ok) throw new Error(`Exa request failed with status ${r.status}`);   // status only: no key, no response body

  const data = await r.json();
  return (data.results || [])
    .filter(x => x && typeof x.url === 'string' && /^https?:\/\//i.test(x.url))
    .map(x => ({ title: x.title || x.url, url: x.url, text: (x.text || '').slice(0, 1500) }));
}

module.exports = { searchWeb };

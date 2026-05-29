function apiBase(key) {
  return key.endsWith(':fx')
    ? 'https://api-free.deepl.com'
    : 'https://api.deepl.com';
}

async function rephrase(text, opts = {}) {
  const key = process.env.DEEPL_API_KEY || '';
  if (!key) throw new Error('DEEPL_API_KEY not configured');

  const { targetLang, style, tone } = opts;
  if (style && tone) throw new Error('style and tone are mutually exclusive — specify one or neither');

  const texts = Array.isArray(text) ? text : [text];
  const body = { text: texts };
  if (targetLang) body.target_lang = targetLang.toUpperCase();
  if (style) body.writing_style = `prefer_${style}`;
  if (tone) body.tone = `prefer_${tone}`;

  const res = await fetch(`${apiBase(key)}/v2/write/rephrase`, {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepL rephrase ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.improvements ?? [];
}

module.exports = { rephrase };

/**
 * Vision-assisted barcode read for mobile when on-device decode struggles (e.g. difficult labels).
 * POST JSON: { imageBase64, mimeType?, regexHint?, secret? }
 * Env: OPENAI_API_KEY (required). AI_SCANNER_SECRET (optional; if set, must match body.secret).
 * Response: { ok: true, barcode: string } | { ok: false, error: string }
 */

const corsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

function parseModelJson(text) {
  if (!text || typeof text !== 'string') return null;
  let s = text.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }
  const obj = JSON.parse(s);
  if (obj && Object.prototype.hasOwnProperty.call(obj, 'barcode')) {
    const b = obj.barcode;
    if (b === null || b === undefined) return null;
    return String(b).trim();
  }
  return null;
}

exports.handler = async (event) => {
  const headers = corsHeaders();

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        error:
          'OPENAI_API_KEY is not configured. In Netlify: Site → Environment variables → add OPENAI_API_KEY (your OpenAI secret key) for this site, save, then trigger a new deploy so functions pick it up.',
      }),
    };
  }

  const serverSecret = process.env.AI_SCANNER_SECRET;
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return {
      statusCode: 400,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Invalid JSON body' }),
    };
  }

  if (serverSecret && body.secret !== serverSecret) {
    return {
      statusCode: 401,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Unauthorized' }),
    };
  }

  const imageBase64 = body.imageBase64;
  const mimeType = typeof body.mimeType === 'string' && body.mimeType.startsWith('image/') ? body.mimeType : 'image/jpeg';
  const regexHint = typeof body.regexHint === 'string' ? body.regexHint : '';

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return {
      statusCode: 400,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'imageBase64 is required' }),
    };
  }

  if (imageBase64.length > 10_000_000) {
    return {
      statusCode: 413,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Image too large' }),
    };
  }

  const system = `You read photos of industrial asset labels and barcodes. Reply with ONE JSON object only, no markdown, no explanation.
Keys: "barcode" (string of the single best primary identifier — barcode content or serial as printed, no spaces) OR null if unreadable.
Prefer the main 1D barcode value if present. If regex hint is provided, prefer candidates that could match it.`;

  const userText = `Extract the primary tracking code from this image.
Regex hint for valid app format (may be approximate): ${regexHint || '(none)'}`;

  const payload = {
    model: process.env.AI_BARCODE_MODEL || 'gpt-4o-mini',
    max_tokens: 120,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: [
          { type: 'text', text: userText },
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'high' },
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const raw = await res.text();
    if (!res.ok) {
      return {
        statusCode: 502,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: `OpenAI error: ${res.status}` }),
      };
    }

    let completion;
    try {
      completion = JSON.parse(raw);
    } catch {
      return {
        statusCode: 502,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Bad response from model' }),
      };
    }

    const text = completion?.choices?.[0]?.message?.content;
    let barcode = null;
    try {
      barcode = parseModelJson(text);
    } catch {
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'Could not parse model output' }),
      };
    }

    if (!barcode || barcode.length === 0) {
      return {
        statusCode: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'No barcode detected in image' }),
      };
    }

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, barcode }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err?.message || 'Request failed' }),
    };
  }
};

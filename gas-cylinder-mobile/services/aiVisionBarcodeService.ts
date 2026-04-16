import Constants from 'expo-constants';

const DEFAULT_AI_FN =
  'https://www.scanified.com/.netlify/functions/decode-barcode-ai';

export function getAiBarcodeScannerConfig(): { url: string; secret: string } {
  const extra = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined;
  const raw = (extra?.EXPO_PUBLIC_AI_BARCODE_FUNCTION_URL || '').trim();
  return {
    url: raw || DEFAULT_AI_FN,
    secret: (extra?.EXPO_PUBLIC_AI_SCANNER_SECRET || '').trim(),
  };
}

async function imageUriToBase64(uri: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const mimeType = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') {
        reject(new Error('Could not read image'));
        return;
      }
      const parts = dataUrl.split(',');
      resolve(parts.length > 1 ? parts[1] : parts[0]);
    };
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });

  return { base64, mimeType };
}

/**
 * Sends a still frame to the Netlify decode-barcode-ai function (OpenAI vision).
 * Caller must re-validate the returned string (e.g. with the same RegExp as live scan).
 */
export async function decodeBarcodeFromPhoto(params: {
  /** Prefer with `imageBase64` on iOS to avoid blob/FileReader issues with `file://` URIs. */
  imageUri?: string;
  imageBase64?: string;
  mimeType?: string;
  validationPattern: RegExp;
  secret?: string;
}): Promise<{ barcode: string } | { error: string }> {
  const { url, secret: configSecret } = getAiBarcodeScannerConfig();
  if (!url) {
    return { error: 'AI scanner is not configured (EXPO_PUBLIC_AI_BARCODE_FUNCTION_URL).' };
  }

  let base64: string;
  let mimeType = params.mimeType || 'image/jpeg';
  if (params.imageBase64) {
    base64 = String(params.imageBase64).replace(/^data:image\/\w+;base64,/, '').trim();
  } else if (params.imageUri) {
    const r = await imageUriToBase64(params.imageUri);
    base64 = r.base64;
    mimeType = r.mimeType;
  } else {
    return { error: 'No image data for AI scan.' };
  }

  const secret = params.secret ?? configSecret;
  const regexHint = params.validationPattern?.toString?.() || '';

  const res = await fetch(url.replace(/\/$/, ''), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: base64,
      mimeType,
      regexHint,
      ...(secret ? { secret } : {}),
    }),
  });

  const raw = await res.text();
  let data: { ok?: boolean; barcode?: string; error?: string };
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    const looksLikeNetlify404Page =
      raw.includes('Page not found') || raw.trimStart().toLowerCase().startsWith('<!doctype');
    if (res.status === 404 || looksLikeNetlify404Page) {
      return {
        error:
          `decode-barcode-ai is not deployed at ${url} (Netlify returned HTML/404). ` +
          `Deploy this repo to production so netlify/functions/decode-barcode-ai.js is live, ` +
          `then set OPENAI_API_KEY on the Netlify site and redeploy.`,
      };
    }
    return {
      error: `AI scan failed (HTTP ${res.status}). Server did not return JSON.`,
    };
  }

  if (!data?.ok || !data.barcode) {
    const hint =
      res.status === 401
        ? ' If Netlify has AI_SCANNER_SECRET, set EXPO_PUBLIC_AI_SCANNER_SECRET in EAS env to match.'
        : res.status === 503 && String(data?.error || '').includes('OPENAI_API_KEY')
          ? ' Add OPENAI_API_KEY in Netlify (Site → Environment variables), save, redeploy production.'
          : '';
    return { error: (data?.error || `AI scan failed (${res.status})`) + hint };
  }

  let cleaned = String(data.barcode).trim().replace(/\s+/g, '');
  // Code39 wrappers: try inner value if outer fails (matches ScanArea-style cleanup)
  if (!params.validationPattern.test(cleaned)) {
    const noStars = cleaned.replace(/^\*+|\*+$/g, '');
    if (noStars !== cleaned && params.validationPattern.test(noStars)) {
      cleaned = noStars;
    }
  }
  if (!params.validationPattern.test(cleaned)) {
    return { error: 'AI result did not match required barcode format. Try again or scan manually.' };
  }

  return { barcode: cleaned };
}

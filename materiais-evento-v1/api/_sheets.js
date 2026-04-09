import crypto from 'crypto';

const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function getEnv() {
  const spreadsheetId = (process.env.GSHEETS_SPREADSHEET_ID || '').trim();
  const clientEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  const privateKeyRaw = (process.env.GOOGLE_PRIVATE_KEY || '').trim();

  if (!spreadsheetId || !clientEmail || !privateKeyRaw) {
    throw new Error('missing_required_env');
  }

  return {
    spreadsheetId,
    clientEmail,
    privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
  };
}

async function getAccessToken() {
  const { clientEmail, privateKey } = getEnv();
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope: SHEETS_SCOPE,
    aud: OAUTH_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsigned);
  sign.end();
  const signature = sign
    .sign(privateKey, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  const assertion = `${unsigned}.${signature}`;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error('oauth_token_error');
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error('oauth_token_missing');
  }

  return data.access_token;
}

async function sheetsRequest(path, init = {}) {
  const { spreadsheetId } = getEnv();
  const token = await getAccessToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    throw new Error(`sheets_request_error:${res.status}`);
  }

  return res.json();
}

export function parseBoolean(value, fallback = true) {
  if (typeof value === 'boolean') return value;
  if (value == null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'sim' || normalized === 'yes';
}

export function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function nowIso() {
  return new Date().toISOString();
}

export function normalizePago(value) {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'sim' || v === 'pago') return 'Sim';
  return 'Não';
}

export function normalizeDateToBr(value) {
  if (!value) return '';
  const raw = String(value).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, d] = raw.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  return raw;
}

export async function readRange(range) {
  const encoded = encodeURIComponent(range);
  const data = await sheetsRequest(`/values/${encoded}`);
  return data.values || [];
}

export async function clearRanges(ranges) {
  await sheetsRequest('/values:batchClear', {
    method: 'POST',
    body: JSON.stringify({ ranges }),
  });
}

export async function writeRange(range, values) {
  const encoded = encodeURIComponent(range);
  await sheetsRequest(`/values/${encoded}?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values,
    }),
  });
}

export async function appendRows(range, values) {
  if (!values || !values.length) return;
  const encoded = encodeURIComponent(range);
  await sheetsRequest(`/values/${encoded}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: 'POST',
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values,
    }),
  });
}

export function parseBody(req) {
  if (!req || !req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

export function nextNumericId(rows, index = 0) {
  let next = 1;
  for (const row of rows || []) {
    next = Math.max(next, toNumber(row[index], 0) + 1);
  }
  return next;
}

export function sanitizeError(err) {
  const code = String(err && err.message ? err.message : '');
  if (code.includes('missing_required_env')) return 'Configuracao de ambiente incompleta';
  if (code.includes('oauth_token_error')) return 'Falha ao autenticar no Google OAuth';
  if (code.includes('oauth_token_missing')) return 'Token OAuth ausente na resposta';
  if (code.includes('sheets_request_error:')) {
    const status = code.split(':')[1] || 'desconhecido';
    return 'Falha Google Sheets (HTTP ' + status + ')';
  }
  return 'Falha ao processar requisicao';
}


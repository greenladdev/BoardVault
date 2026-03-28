/**
 * BGG Authentication Service
 *
 * BGG XML API2 requires a JWT Bearer token ("bggcookie") obtained by logging
 * in with BGG credentials. This module manages the token lifecycle.
 *
 * Set BGG_USERNAME and BGG_PASSWORD in backend/.env to enable auto-login.
 * Token is held in memory; the app re-authenticates if it expires.
 */

const BGG_LOGIN_URL = 'https://boardgamegeek.com/login/api/v1';

// BGG uses session cookies (bggusername, bggpassword, SessionID) — no JWTs.
let sessionCookies = '';  // full Cookie header string to replay
let authenticated = false;

export function isAuthenticated() { return authenticated; }

export function getToken() { return authenticated ? 'session' : null; }

export function getCookieJar() { return sessionCookies; }

export function clearToken() {
  sessionCookies = '';
  authenticated = false;
}

/**
 * Parse raw Set-Cookie strings into a name→value map.
 */
function parseCookies(rawList) {
  const map = {};
  for (const raw of rawList) {
    const semi = raw.indexOf(';');
    const pair = semi === -1 ? raw : raw.slice(0, semi);
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    map[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  return map;
}

export async function loginBGG(username, password) {
  // Step 1: hit the login page to get an initial SessionID (CSRF seed)
  const initRes = await fetch(BGG_LOGIN_URL, {
    method: 'GET',
    headers: { 'Origin': 'https://boardgamegeek.com' },
  }).catch(() => null);

  const initCookies = initRes?.headers?.getSetCookie?.() ?? [];
  const initCookieHeader = initCookies.map((c) => c.split(';')[0]).join('; ');

  // Step 2: POST credentials, forwarding the initial SessionID
  const res = await fetch(BGG_LOGIN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://boardgamegeek.com',
      'Referer': 'https://boardgamegeek.com/login',
      ...(initCookieHeader ? { Cookie: initCookieHeader } : {}),
    },
    body: JSON.stringify({ credentials: { username, password } }),
  });

  const rawCookies = res.headers?.getSetCookie?.() ?? [];
  const cookieMap = parseCookies(rawCookies);
  const bodyText = await res.text().catch(() => '');
  let bodyJson = null;
  try { bodyJson = JSON.parse(bodyText); } catch {}

  const debug = {
    status: res.status,
    cookieNames: Object.keys(cookieMap),
    cookieValues: Object.fromEntries(Object.entries(cookieMap).map(([k, v]) => [k, v.slice(0, 20) + '…'])),
    body: bodyText.slice(0, 300),
  };

  console.log('[BGG auth] status:', res.status);
  console.log('[BGG auth] cookies:', debug.cookieValues);
  console.log('[BGG auth] body:', debug.body);

  if (!res.ok) {
    const msg = bodyJson?.errors?.message ?? `HTTP ${res.status}`;
    const err = new Error(`BGG login failed: ${msg}`);
    err.debug = debug;
    throw err;
  }

  // 1. Try bggcookie in Set-Cookie (the JWT used as Bearer token for XML API)
  let jwt = cookieMap['bggcookie'];

  // 2. Try common body token field names
  if (!jwt && bodyJson) {
    jwt = bodyJson.bggcookie ?? bodyJson.access_token ?? bodyJson.jwt ??
          bodyJson.token ?? bodyJson.accessToken ?? bodyJson.id_token;
  }

  // 3. Try any cookie whose value looks like a JWT (three base64url segments)
  if (!jwt) {
    for (const [name, val] of Object.entries(cookieMap)) {
      if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(val)) {
        console.log(`[BGG auth] Found JWT-shaped cookie: ${name}`);
        jwt = val;
        break;
      }
    }
  }

  // BGG uses session cookies — no JWT needed. As long as we have SessionID we're good.
  const hasSession = 'SessionID' in cookieMap;
  if (hasSession) {
    const jar = [...initCookies, ...rawCookies].map((c) => c.split(';')[0]).join('; ');
    sessionCookies = jar;
    authenticated = true;
    console.log('[BGG auth] ✓ authenticated via session cookies:', Object.keys(cookieMap).join(', '));
    return { token: 'session', debug };
  }

  const err = new Error(
    `BGG login returned HTTP 200 but no session cookies were found.\n` +
    `Cookies received: ${JSON.stringify(debug.cookieValues)}`
  );
  err.debug = debug;
  throw err;
}

/**
 * Try to auto-login from environment variables on startup.
 * Non-fatal — the app works, but BGG search will fail until credentials are provided.
 */
export async function tryAutoLogin() {
  const { BGG_USERNAME, BGG_PASSWORD } = process.env;
  if (!BGG_USERNAME || !BGG_PASSWORD) return;
  try {
    await loginBGG(BGG_USERNAME, BGG_PASSWORD);
    console.log(`✓ Authenticated with BoardGameGeek as "${BGG_USERNAME}"`);
  } catch (err) {
    console.warn(`⚠ BGG auto-login failed: ${err.message}`);
  }
}

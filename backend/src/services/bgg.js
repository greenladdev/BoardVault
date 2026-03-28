import { XMLParser } from 'fast-xml-parser';
import { isAuthenticated, getCookieJar } from './bggAuth.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => ['item', 'link', 'name', 'poll'].includes(name),
});

const BGG_XML_BASE = 'https://boardgamegeek.com/xmlapi2';
const GEEKDO_BASE = 'https://api.geekdo.com';
const RETRY_DELAY_MS = 2000;
const MAX_RETRIES = 4;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripHtml(str) {
  if (!str) return '';
  return str
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#10;/g, '\n')
    .replace(/&ndash;/g, '-')
    .replace(/&mdash;/g, '—')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .trim();
}

function toInt(val) {
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

function toFloat(val) {
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function authHeaders() {
  const jar = getCookieJar();
  const headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; BoardVault/1.0)',
    'Origin': 'https://boardgamegeek.com',
    'Referer': 'https://boardgamegeek.com/',
  };
  if (jar) headers['Cookie'] = jar;
  return headers;
}

async function fetchXml(url) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, { headers: authHeaders() });
    if (res.status === 202) {
      if (attempt < MAX_RETRIES) { await sleep(RETRY_DELAY_MS * (attempt + 1)); continue; }
      throw new Error('BGG API still processing — try again in a moment');
    }
    if (res.status === 401) throw new Error('BGG requires authentication — please connect your BGG account');
    if (!res.ok) throw new Error(`BGG API error: ${res.status}`);
    return res.text();
  }
}

// ─── Search via BGG XML API v2 (requires auth) ───────────────────────────────

export async function searchBGG(query) {
  if (!isAuthenticated()) throw new Error('BGG requires authentication — please connect your BGG account');

  const url = `${BGG_XML_BASE}/search?query=${encodeURIComponent(query)}&type=boardgame`;
  const xml = await fetchXml(url);
  const data = parser.parse(xml);

  const total = parseInt(data.items?.['@_total'] ?? '0', 10);
  if (!total) return [];

  const rawItems = data.items?.item ?? [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];

  return items.slice(0, 10).map((item) => {
    const names = Array.isArray(item.name) ? item.name : [item.name];
    const primaryName = names.find((n) => n['@_type'] === 'primary') ?? names[0];
    return {
      bggId: item['@_id'],
      title: primaryName?.['@_value'] ?? 'Unknown',
      yearPublished: toInt(item.yearpublished?.['@_value']),
    };
  });
}

// ─── Details via geekdo.com geekitems API (no auth required) ─────────────────

export async function getBGGDetails(bggId) {
  const url = `${GEEKDO_BASE}/api/geekitems?objecttype=thing&subtype=boardgame&nosession=1&objectid=${bggId}`;
  const res = await fetch(url, {
    headers: {
      'Origin': 'https://boardgamegeek.com',
      'User-Agent': 'BoardVault/1.0 (personal collection app)',
    },
  });
  if (!res.ok) throw new Error(`geekdo API error: ${res.status}`);

  const data = await res.json();
  const item = data?.item;
  if (!item) throw new Error('Game not found on BoardGameGeek');

  const categories = (item.links?.boardgamecategory ?? []).map((l) => l.name).filter(Boolean);
  const mechanics = (item.links?.boardgamemechanic ?? []).map((l) => l.name).filter(Boolean);

  // Stats (avgrating, avgweight) require auth — fetched separately if logged in
  let bggRating = null;
  let complexity = null;
  if (isAuthenticated()) {
    try {
      const statsData = await fetchStatsFromXml(bggId);
      bggRating = statsData.bggRating;
      complexity = statsData.complexity;
    } catch {}
  }

  return {
    bggId: String(item.objectid),
    title: item.primaryname?.name ?? 'Unknown',
    yearPublished: toInt(item.yearpublished),
    minPlayers: toInt(item.minplayers),
    maxPlayers: toInt(item.maxplayers),
    minPlaytime: toInt(item.minplaytime),
    maxPlaytime: toInt(item.maxplaytime),
    complexity,
    bggRating,
    categories,
    mechanics,
    description: stripHtml(item.description),
    thumbnail: item.imageurl ?? null,
    image: item.imageurl?.replace('_itemrep', '') ?? null,
  };
}

async function fetchStatsFromXml(bggId) {
  const url = `${BGG_XML_BASE}/thing?id=${bggId}&stats=1`;
  const xml = await fetchXml(url);
  const data = parser.parse(xml);
  const item = Array.isArray(data.items?.item) ? data.items.item[0] : data.items?.item;
  const ratings = item?.statistics?.ratings;
  return {
    bggRating: toFloat(ratings?.average?.['@_value']),
    complexity: toFloat(ratings?.averageweight?.['@_value']),
  };
}

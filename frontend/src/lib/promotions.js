// Bannières publicitaires (backend/routers/ads.py). Chemins « /promotions » :
// les bloqueurs de publicité filtrent les adresses contenant « ads ».

export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

// Rapport largeur / hauteur de l'image, par emplacement (comme le serveur)
export const PLACEMENT_RATIOS = {
  home_middle: { desktop: [1200, 300], mobile: [800, 400] },
  category_top: { desktop: [1200, 200], mobile: [800, 300] },
  app_home: { desktop: null, mobile: [800, 400] },
  feed: { desktop: [1200, 300], mobile: [800, 400] },
};

// Bannières entre les produits : une tous les FEED_EVERY produits (multiple de
// 2, 3 et 4 colonnes : jamais de rangée à moitié vide), FEED_PER_PAGE au plus
export const FEED_EVERY = 12;
export const FEED_PER_PAGE = 4;

const CACHE_MS = 60 * 1000;
const cache = new Map();

/** Bannières en cours pour un emplacement (mémorisées une minute). */
export const fetchPromotions = async (placement, categories = []) => {
  const category = categories.filter(Boolean).join(',');
  const key = `${placement}|${category}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.promise;
  const params = new URLSearchParams({ placement });
  if (category) params.set('category', category);
  const promise = fetch(`${API_BASE_URL}/promotions?${params}`)
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => []);
  cache.set(key, { promise, expires: Date.now() + CACHE_MS });
  return promise;
};

/** Tirage pondéré : une campagne de poids 3 sort trois fois plus souvent. */
export const pickWeighted = (items, random = Math.random) => {
  if (!items.length) return null;
  const total = items.reduce((sum, item) => sum + Math.max(1, item.weight || 1), 0);
  let roll = random() * total;
  for (const item of items) {
    roll -= Math.max(1, item.weight || 1);
    if (roll < 0) return item;
  }
  return items[items.length - 1];
};

/**
 * Ordre d'affichage tiré au sort, pondéré et sans répétition : la campagne de
 * poids 3 a trois fois plus de chances de passer en premier.
 */
export const orderWeighted = (items, random = Math.random) => {
  const pool = [...items];
  const ordered = [];
  while (pool.length) {
    const picked = pickWeighted(pool, random);
    ordered.push(picked);
    pool.splice(pool.indexOf(picked), 1);
  }
  return ordered;
};

/**
 * Produits et bannières mêlés : une bannière après chaque groupe de `every`
 * produits, `perPage` au plus, chaque campagne une seule fois. Pas de
 * bannière après le dernier produit.
 */
export const interleavePromotions = (products, promotions, every = FEED_EVERY, perPage = FEED_PER_PAGE) => {
  const slots = promotions.slice(0, perPage);
  const out = [];
  products.forEach((product, i) => {
    out.push({ type: 'product', product });
    const position = i + 1;
    const slot = position / every - 1;
    if (position % every === 0 && position < products.length && slot < slots.length) {
      out.push({ type: 'promotion', promotion: slots[slot] });
    }
  });
  return out;
};

const beacon = (path) => {
  const url = `${API_BASE_URL}${path}`;
  try {
    if (navigator.sendBeacon && navigator.sendBeacon(url)) return;
  } catch {
    // on tente fetch
  }
  fetch(url, { method: 'POST', keepalive: true }).catch(() => {});
};

// Une vue par campagne et par page affichée (pas à chaque re-rendu)
const seen = new Set();

export const trackView = (promotion, pageKey) => {
  const key = `${promotion.id}|${pageKey}`;
  if (seen.has(key)) return;
  seen.add(key);
  beacon(`/promotions/${encodeURIComponent(promotion.id)}/view`);
};

export const trackOpen = (promotion) => beacon(`/promotions/${encodeURIComponent(promotion.id)}/open`);

/** Lien interne (navigation dans le site) ou externe (nouvel onglet). */
export const internalPath = (link) => {
  if (!link) return null;
  if (link.startsWith('/') && !link.startsWith('//')) return link;
  const match = link.match(/^https?:\/\/(www\.)?nengoo\.com(\/.*)?$/i);
  return match ? match[2] || '/' : null;
};

/** Effacer le cache (tests). */
export const resetPromotions = () => {
  cache.clear();
  seen.clear();
};

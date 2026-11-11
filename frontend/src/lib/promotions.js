// Bannières publicitaires (backend/routers/ads.py). Chemins « /promotions » :
// les bloqueurs de publicité filtrent les adresses contenant « ads ».

export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

// Rapport largeur / hauteur de l'image, par emplacement (comme le serveur)
export const PLACEMENT_RATIOS = {
  home_middle: { desktop: [1200, 300], mobile: [800, 400] },
  category_top: { desktop: [1200, 200], mobile: [800, 300] },
  app_home: { desktop: null, mobile: [800, 400] },
};

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

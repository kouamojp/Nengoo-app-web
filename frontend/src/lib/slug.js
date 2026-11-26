// Adresses lisibles, sans accents ni ponctuation : « Électronique » →
// « electronique ». Même règle que generate_slug (backend/server.py), qui
// produit les adresses du sitemap et des pages servies par page.php.

export const slugify = (text) =>
  (text || '')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'Oe')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'Ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Page d'une catégorie : /catalog/<slug du nom>. */
export const categoryUrl = (category) =>
  category?.name ? `/catalog/${slugify(category.name)}` : '/catalog';

/**
 * Page d'une boutique : /seller/<slug> (tiré du nom de la boutique). Sans
 * slug connu, l'id : la page redirige alors vers l'adresse lisible.
 */
export const sellerUrl = (seller) => `/seller/${seller?.slug || seller?.id || ''}`;

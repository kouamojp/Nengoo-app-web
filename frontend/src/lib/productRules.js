// Règles d'une fiche produit, identiques à celles du serveur
// (backend/catalog_rules.py) : on prévient avant l'envoi plutôt qu'après.

export const MIN_DESCRIPTION_LENGTH = 20;

export const PRODUCT_CONDITIONS = [
  { value: 'new', label: 'Neuf' },
  { value: 'used', label: 'Occasion' },
  { value: 'refurbished', label: 'Reconditionné' },
];

// Produit (vendu en ligne, ajouté au panier), service (prestation : le
// client contacte le vendeur sur WhatsApp, pas de panier ni de stock) ou plat
// (restaurants seulement, commandé en ligne ou sur WhatsApp : MEAL_ORDERS)
export const PRODUCT_KINDS = [
  { value: 'product', label: 'Produit', hint: 'Article vendu en ligne : ajouté au panier, avec un stock.' },
  { value: 'service', label: 'Service', hint: 'Prestation (réparation, coiffure, transport…) : le client vous contacte sur WhatsApp.' },
  { value: 'meal', label: 'Plat', hint: 'Plat de votre restaurant : commandé en ligne ou sur WhatsApp, au choix.', restaurantOnly: true },
];

export const MEAL_ORDERS = [
  { value: 'online', label: 'Commande en ligne', hint: 'Ajouté au panier, avec le nombre de portions disponibles.' },
  { value: 'whatsapp', label: 'Sur WhatsApp', hint: 'Le client vous écrit pour commander : pas de panier.' },
];

export const isService = (product) => product?.kind === 'service';
export const isMeal = (product) => product?.kind === 'meal';
/** Article classique : seul à avoir un état (neuf, occasion) et des couleurs. */
export const isArticle = (product) => !isService(product) && !isMeal(product);
/** Se commande sur WhatsApp, pas au panier : service, ou plat « whatsapp ». */
export const isWhatsappOnly = (product) =>
  isService(product) || (isMeal(product) && product?.mealOrder === 'whatsapp');
/** Visible des clients : en stock, ou commandé sur WhatsApp (sans stock). */
export const isAvailable = (product) => isWhatsappOnly(product) || product?.stock > 0;
export const stockLabel = (product) => (isMeal(product) ? 'Portions disponibles' : 'Stock');
// Caractéristiques proposées pour un plat (laissées vides, elles ne sont pas envoyées)
export const MEAL_SPEC_KEYS = ['Portion', 'Accompagnement', 'Temps de préparation', 'Piment'];

/**
 * Change le type d'annonce. Un plat reçoit un mode de commande et, si aucune
 * caractéristique n'est saisie, les caractéristiques d'un plat à remplir.
 */
export const withKind = (product, kind) => {
  const filled = (product.specList || []).some(([, v]) => String(v).trim());
  if (kind !== 'meal') {
    // Caractéristiques proposées restées vides : retirées
    const specList = filled ? product.specList : [];
    return { ...product, kind, mealOrder: null, specList };
  }
  return {
    ...product,
    kind,
    mealOrder: product.mealOrder || 'online',
    brand: '',
    specList: filled ? product.specList : MEAL_SPEC_KEYS.map((key) => [key, '']),
  };
};

/** Libellés du formulaire selon le type d'annonce. */
export const listingText = (product) => (isMeal(product)
  ? {
    name: 'Nom du plat',
    namePlaceholder: 'Ex. : Ndolé aux crevettes et miondo',
    photos: 'Photos du plat',
    descriptionHint: 'Au moins 20 caractères : ingrédients, accompagnement, taille de la portion, piment… Une description précise donne envie de commander.',
    descriptionPlaceholder: 'Ex. : Ndolé aux crevettes, viande de bœuf, servi avec 2 bâtons de miondo. Portion pour 1 personne.',
    submit: 'Ajouter le plat',
  }
  : {
    name: 'Nom du produit',
    namePlaceholder: '',
    photos: 'Photos du produit',
    descriptionHint: 'Au moins 20 caractères : matière, taille, usage… Une description précise aide les clients à trouver le produit.',
    descriptionPlaceholder: '',
    submit: 'Ajouter le produit',
  });

/** Badge du type d'annonce : « Service », « Plat », ou rien pour un article. */
export const kindLabel = (product) => (isService(product) ? 'Service' : isMeal(product) ? 'Plat' : '');

export const conditionLabel = (value) =>
  PRODUCT_CONDITIONS.find((c) => c.value === value)?.label || '';

/**
 * Premier problème de la fiche, ou null. En modification (previous), une
 * description inchangée ne bloque pas, comme côté serveur.
 */
export const productFormError = (product, _imageCount, previous = null) => {
  const price = Number(product.price) || 0;
  const promo = Number(product.promoPrice) || 0;
  if (price <= 0) return 'Le prix doit être supérieur à 0.';
  if (promo > 0 && promo >= price) return 'Le prix promo doit être inférieur au prix normal.';
  const descriptionChanged = !previous || product.description !== previous.description;
  if (descriptionChanged && (product.description || '').trim().length < MIN_DESCRIPTION_LENGTH) {
    return `La description doit faire au moins ${MIN_DESCRIPTION_LENGTH} caractères.`;
  }
  // Photo facultative : sans photo, le logo de la boutique s'affiche
  return null;
};

/** Produit prêt pour le formulaire : caractéristiques en liste éditable. */
export const withSpecList = (product) => ({
  ...product,
  specList: Object.entries(product.specs || {}),
});

/** Marque, état et caractéristiques au format attendu par le serveur. */
export const productDetailsPayload = (product) => ({
  kind: isService(product) ? 'service' : isMeal(product) ? 'meal' : 'product',
  mealOrder: isMeal(product) ? (product.mealOrder === 'whatsapp' ? 'whatsapp' : 'online') : null,
  brand: (product.brand || '').trim() || null,
  // L'état (neuf, occasion) ne concerne que les articles
  condition: (isArticle(product) && product.condition) || null,
  specs: Object.fromEntries(
    (product.specList || [])
      .map(([k, v]) => [k.trim(), String(v).trim()])
      .filter(([k, v]) => k && v)
  ),
});

/** Corps de requête : champs de saisie retirés, détails normalisés. */
export const productPayload = (product) => {
  const { specList, image, ...rest } = product;
  return { ...rest, ...productDetailsPayload(product), promoPrice: Number(product.promoPrice) || null };
};

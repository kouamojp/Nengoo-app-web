// Règles d'une fiche produit, identiques à celles du serveur
// (backend/catalog_rules.py) : on prévient avant l'envoi plutôt qu'après.

export const MIN_DESCRIPTION_LENGTH = 20;

export const PRODUCT_CONDITIONS = [
  { value: 'new', label: 'Neuf' },
  { value: 'used', label: 'Occasion' },
  { value: 'refurbished', label: 'Reconditionné' },
];

export const conditionLabel = (value) =>
  PRODUCT_CONDITIONS.find((c) => c.value === value)?.label || '';

/**
 * Premier problème de la fiche, ou null. En modification (previous), une
 * description ou des photos inchangées ne bloquent pas, comme côté serveur.
 */
export const productFormError = (product, imageCount, previous = null) => {
  const price = Number(product.price) || 0;
  const promo = Number(product.promoPrice) || 0;
  if (price <= 0) return 'Le prix doit être supérieur à 0.';
  if (promo > 0 && promo >= price) return 'Le prix promo doit être inférieur au prix normal.';
  const descriptionChanged = !previous || product.description !== previous.description;
  if (descriptionChanged && (product.description || '').trim().length < MIN_DESCRIPTION_LENGTH) {
    return `La description doit faire au moins ${MIN_DESCRIPTION_LENGTH} caractères.`;
  }
  const hadImages = previous && (previous.images || []).some(Boolean);
  if (!imageCount && (!previous || hadImages)) return 'Ajoutez au moins une photo.';
  return null;
};

/** Produit prêt pour le formulaire : caractéristiques en liste éditable. */
export const withSpecList = (product) => ({
  ...product,
  specList: Object.entries(product.specs || {}),
});

/** Marque, état et caractéristiques au format attendu par le serveur. */
export const productDetailsPayload = (product) => ({
  brand: (product.brand || '').trim() || null,
  condition: product.condition || null,
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

// Versions réduites des photos produit (WebP), créées par le serveur :
// thumbnails (400 px) pour les listes, previews (1000 px) pour la fiche.
// Une case vide veut dire « pas encore créée » : on prend l'originale.

const variant = (product, field, index) =>
  (product?.[field] || [])[index] || (product?.images || [])[index] || '';

/** Photo d'une carte produit (liste, accueil, recherche). */
export const listImage = (product, index = 0) => variant(product, 'thumbnails', index);

/** Photo affichée en grand sur la fiche produit. */
export const previewImage = (product, index = 0) => variant(product, 'previews', index);

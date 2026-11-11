// Versions réduites des photos produit (WebP), créées par le serveur :
// thumbnails (400 px) pour les listes, previews (1000 px) pour la fiche.
// Une case vide veut dire « pas encore créée » : on prend l'originale.
//
// Sans photo (ou photo introuvable), on montre le logo de la boutique
// (sellerLogo, ajouté par le serveur), puis celui de Nengoo.

const variant = (product, field, index) =>
  (product?.[field] || [])[index] || (product?.images || [])[index] || '';

/** Photo d'une carte produit (liste, accueil, recherche). */
export const listImage = (product, index = 0) => variant(product, 'thumbnails', index);

/** Photo affichée en grand sur la fiche produit. */
export const previewImage = (product, index = 0) => variant(product, 'previews', index);

export const NENGOO_IMAGE = `${process.env.PUBLIC_URL || ''}/images/logo-nengoo.png`;

/** Image d'une carte : photo, sinon logo de la boutique, sinon logo Nengoo. */
export const cardImage = (product) => listImage(product) || product?.sellerLogo || NENGOO_IMAGE;

/** Vrai si l'image affichée est un logo (affiché en entier, sans recadrage). */
export const isLogoImage = (product, src) =>
  !!src && (src === product?.sellerLogo || /\/images\/logo-nengoo[\w-]*\.png$/.test(src));

/**
 * Gestionnaire onError d'une photo produit : logo de la boutique, puis logo
 * Nengoo. La classe img-logo affiche le logo en entier (index.css).
 */
export const imageFallback = (product, nengoo = NENGOO_IMAGE) => (event) => {
  const img = event.currentTarget;
  const logo = product?.sellerLogo;
  img.classList.add('img-logo');
  if (logo && img.dataset.fallback !== 'logo' && img.getAttribute('src') !== logo) {
    img.dataset.fallback = 'logo';
    img.src = logo;
  } else {
    img.onerror = null;
    img.dataset.fallback = 'nengoo';
    img.src = nengoo;
  }
};

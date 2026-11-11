
export const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

/**
 * Numéro au format attendu par wa.me : indicatif pays compris, chiffres seuls,
 * sans « + » ni « 00 ». Les vendeurs ont enregistré leur numéro dans des
 * formats variés ; un numéro camerounais local (9 chiffres commençant par 6
 * ou 2) reçoit l'indicatif 237. null s'il n'y a pas de numéro exploitable
 * (ancien compte identifié par un e-mail, par exemple). Même règle que l'app
 * mobile (PhoneFormatter.whatsappDigits).
 */
export const whatsappDigits = (phone) => {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 9 && /^[62]/.test(digits)) digits = `237${digits}`;
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
};

/** Lien https://wa.me/…, ou null si le numéro est inutilisable. */
export const whatsappUrl = (phone, message = '') => {
  const digits = whatsappDigits(phone);
  if (!digits) return null;
  return message
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${digits}`;
};

/** Ouvre la conversation ; prévient l'utilisateur si le numéro est inutilisable. */
export const openWhatsApp = (phoneNumber, message = '') => {
  const url = whatsappUrl(phoneNumber, message);
  if (!url) {
    window.alert("Ce vendeur n'a pas encore de numéro WhatsApp valide.");
    return false;
  }
  window.open(url, '_blank', 'noopener');
  return true;
};

export const formatPhoneForWhatsApp = (phone) => whatsappDigits(phone) || '';

const SITE_URL = process.env.REACT_APP_SITE_URL || 'https://www.nengoo.com';

export const generateProductWhatsAppMessage = (product, language) => {
  const productName = typeof product.name === 'object' ? product.name[language] : product.name;
  const slug = product.slug || product.id;
  const productUrl = `${SITE_URL}/product/${slug}`;
  if (product.kind === 'service') {
    return `Bonjour ! Je suis intéressé(e) par votre service "${productName}" sur Nengoo : ${productUrl}. Pourriez-vous me donner vos disponibilités et vos conditions ? Merci !`;
  }
  return `Bonjour! Je suis intéressé(e) par votre produit "${productName}" sur Nengoo: ${productUrl}. Pourriez-vous me donner plus d'informations? Merci!`;
};

/**
 * Contact du vendeur sur WhatsApp à propos d'une annonce : le clic est
 * enregistré (statistiques « Contacts WhatsApp » de l'admin) sans retarder
 * l'ouverture de WhatsApp.
 */
export const contactSellerOnWhatsApp = ({ product, whatsapp, sellerId, sellerName, language }) => {
  const productName = typeof product.name === 'object' ? product.name[language] : product.name;
  fetch(`${API_URL}/analytics/whatsapp-click`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId: product.id,
      productName,
      sellerId: sellerId || product.sellerId,
      sellerName: sellerName || product.sellerName,
    }),
  }).catch(() => {});
  return openWhatsApp(whatsapp, generateProductWhatsAppMessage(product, language));
};

export const createSlug = (text) => {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD") // Remove accents
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w-]+/g, "") // Remove all non-word chars
    .replace(/--+/g, "-"); // Replace multiple - with single -
};


export const API_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

export const openWhatsApp = (phoneNumber, message = '') => {
  const encodedMessage = encodeURIComponent(message);
  const url = `https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${encodedMessage}`;
  window.open(url, '_blank');
};

export const formatPhoneForWhatsApp = (phone) => {
  return phone.replace(/\D/g, '');
};

export const generateProductWhatsAppMessage = (product, language) => {
  const productName = typeof product.name === 'object' ? product.name[language] : product.name;
  const productUrl = `${window.location.origin}/product/${product.id}`;
  return `Bonjour! Je suis intéressé(e) par votre produit "${productName}" sur Nengoo: ${productUrl}. Pourriez-vous me donner plus d'informations? Merci!`;
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


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
  return `Bonjour! Je suis intéressé(e) par votre produit "${product.name[language]}" sur Nengoo. Pourriez-vous me donner plus d'informations? Merci!`;
};

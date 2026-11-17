// Événements e-commerce envoyés au tag Google (GA4, et Google Ads une fois
// relié) : format « ecommerce » recommandé par Google, montants en XAF.
// Sans tag chargé (bloqueur, tests), les appels ne font rien.

const CURRENCY = 'XAF';

const send = (event, params) => {
  try {
    if (typeof window.gtag === 'function') window.gtag('event', event, params);
  } catch {
    // Le suivi ne doit jamais casser la boutique
  }
};

const textOf = (value) => (value && typeof value === 'object' ? value.fr || value.en || '' : value || '');

// Prix réellement payé : le prix promo quand il existe
export const paidPrice = (product) => (
  product.promoPrice && product.promoPrice > 0 ? product.promoPrice : product.price
) || 0;

// Produit du site → « item » Google
export const toItem = (product, quantity = 1) => {
  const price = paidPrice(product);
  const item = {
    item_id: String(product.id),
    item_name: textOf(product.name),
    price,
    quantity,
  };
  if (product.promoPrice > 0 && product.price > product.promoPrice) {
    item.discount = product.price - product.promoPrice;
  }
  if (product.brand) item.item_brand = product.brand;
  if (product.sellerName) item.affiliation = product.sellerName;
  const category = textOf(product.categoryName);
  if (category) item.item_category = category;
  return item;
};

const total = (items) => items.reduce((sum, item) => sum + item.price * item.quantity, 0);

export const trackViewItem = (product) => {
  const item = toItem(product);
  send('view_item', { currency: CURRENCY, value: item.price, items: [item] });
};

export const trackAddToCart = (product, quantity = 1) => {
  const item = toItem(product, quantity);
  send('add_to_cart', { currency: CURRENCY, value: item.price * quantity, items: [item] });
};

export const trackBeginCheckout = (cartItems) => {
  const items = cartItems.map(product => toItem(product, product.quantity));
  send('begin_checkout', { currency: CURRENCY, value: total(items), items });
};

// Une commande par vendeur : un achat Google par commande, son numéro évitant
// tout double comptage (rechargement de la page de confirmation)
export const trackPurchase = (orders, couponCode) => {
  orders.forEach(order => {
    const items = (order.products || []).map(p => ({
      item_id: String(p.productId),
      item_name: p.name,
      price: p.price,
      quantity: p.quantity,
      ...(order.sellerName && { affiliation: order.sellerName }),
    }));
    const shipping = order.shippingCost || 0;
    send('purchase', {
      transaction_id: order.id,
      currency: order.currency || CURRENCY,
      // Comme le recommande Google : valeur des produits (remise déduite), hors livraison
      value: Math.max(0, (order.totalAmount || 0) - shipping),
      shipping,
      ...(couponCode && { coupon: couponCode }),
      items,
    });
  });
};

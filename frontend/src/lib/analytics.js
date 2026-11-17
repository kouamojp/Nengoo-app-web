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

// Noms nettoyés : « Robe » et « Robe  » ne doivent pas faire deux lignes dans les rapports
const textOf = (value) => String(
  (value && typeof value === 'object' ? value.fr || value.en : value) || '',
).replace(/\s+/g, ' ').trim();

// Le titre est mis à jour par Helmet après le changement d'adresse, et
// seulement une fois les données chargées (fiche produit) : on attend qu'il
// change, puis qu'il ne bouge plus (300 ms) ; 3 s au plus (page au même titre)
const waitForNewTitle = (previous) => new Promise((resolve) => {
  let quiet;
  const done = () => { observer.disconnect(); clearTimeout(quiet); clearTimeout(limit); resolve(document.title); };
  const observer = new MutationObserver(() => {
    if (document.title === previous) return;
    clearTimeout(quiet);
    quiet = setTimeout(done, 300);
  });
  observer.observe(document.head, { subtree: true, childList: true, characterData: true });
  const limit = setTimeout(done, 3000);
});

// Une vue de page par changement d'adresse, avec le bon titre. Le tag Google
// n'envoie plus la sienne (send_page_view: false dans public/index.html).
let lastPage = null;
let lastTitle = null;
export const trackPageView = async () => {
  const page = window.location.pathname + window.location.search;
  if (page === lastPage) return;
  lastPage = page;
  // Titre de la page précédente (au 1er chargement : celui de index.html)
  const title = await waitForNewTitle(lastTitle ?? document.title);
  lastTitle = title;
  if (lastPage !== page) return; // le visiteur est déjà ailleurs
  send('page_view', { page_title: title, page_location: window.location.href, page_path: page });
};

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
      item_name: textOf(p.name),
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

import { toItem, trackAddToCart, trackPurchase, trackViewItem } from './analytics';

beforeEach(() => { window.gtag = jest.fn(); });
afterEach(() => { delete window.gtag; });

test('toItem uses the promo price and keeps the discount', () => {
  const item = toItem({ id: 7, name: { fr: 'Robe', en: 'Dress' }, price: 10000, promoPrice: 8000, brand: 'Kaba', sellerName: 'Marie' }, 2);
  expect(item).toEqual({
    item_id: '7', item_name: 'Robe', price: 8000, quantity: 2, discount: 2000, item_brand: 'Kaba', affiliation: 'Marie',
  });
});

test('view_item and add_to_cart send XAF values', () => {
  trackViewItem({ id: 'p1', name: 'Sac', price: 5000 });
  trackAddToCart({ id: 'p1', name: 'Sac', price: 5000 }, 3);
  expect(window.gtag).toHaveBeenNthCalledWith(1, 'event', 'view_item', expect.objectContaining({ currency: 'XAF', value: 5000 }));
  expect(window.gtag).toHaveBeenNthCalledWith(2, 'event', 'add_to_cart', expect.objectContaining({ value: 15000 }));
});

test('purchase is sent once per order, shipping excluded from value', () => {
  trackPurchase([
    { id: 'ord_1', totalAmount: 12000, shippingCost: 2000, sellerName: 'A', products: [{ productId: 'p1', name: 'Sac', price: 5000, quantity: 2 }] },
    { id: 'ord_2', totalAmount: 3000, shippingCost: 0, products: [] },
  ], 'NOEL');
  expect(window.gtag).toHaveBeenCalledTimes(2);
  expect(window.gtag).toHaveBeenCalledWith('event', 'purchase', expect.objectContaining({
    transaction_id: 'ord_1', value: 10000, shipping: 2000, coupon: 'NOEL',
  }));
});

test('product names are trimmed', () => {
  expect(toItem({ id: 1, name: { fr: '  Tablette   iPhone ' }, price: 1 }).item_name).toBe('Tablette iPhone');
});

test('page_view waits for the new page title', async () => {
  document.head.innerHTML = '<title>Ancienne page</title>';
  window.history.pushState({}, '', '/product/robe');
  const { trackPageView } = jest.requireActual('./analytics');
  const sent = trackPageView();
  // Fiche produit : le titre n'arrive qu'après le chargement des données
  setTimeout(() => { document.title = 'Robe — Nengoo'; }, 900);
  await sent;
  expect(window.gtag).toHaveBeenCalledWith('event', 'page_view', expect.objectContaining({
    page_title: 'Robe — Nengoo', page_path: '/product/robe',
  }));
  // Même adresse : pas de seconde vue
  await trackPageView();
  expect(window.gtag).toHaveBeenCalledTimes(1);
});

test('does nothing without the Google tag', () => {
  delete window.gtag;
  expect(() => trackViewItem({ id: 1, name: 'x', price: 1 })).not.toThrow();
});

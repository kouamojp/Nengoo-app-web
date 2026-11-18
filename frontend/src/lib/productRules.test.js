import { MEAL_SPEC_KEYS, isArticle, isAvailable, isWhatsappOnly, kindLabel, listingText, productDetailsPayload, stockLabel, withKind } from './productRules';

test('plat en ligne : panier et portions, sans état', () => {
  const meal = { kind: 'meal', mealOrder: 'online', stock: 0, condition: 'new' };
  expect(isWhatsappOnly(meal)).toBe(false);
  expect(isAvailable(meal)).toBe(false);
  expect(isAvailable({ ...meal, stock: 4 })).toBe(true);
  expect(isArticle(meal)).toBe(false);
  expect(stockLabel(meal)).toBe('Portions disponibles');
  expect(kindLabel(meal)).toBe('Plat');
  expect(productDetailsPayload(meal)).toMatchObject({ kind: 'meal', mealOrder: 'online', condition: null });
});

test('plat sur WhatsApp : comme un service, visible sans stock', () => {
  const meal = { kind: 'meal', mealOrder: 'whatsapp', stock: 0 };
  expect(isWhatsappOnly(meal)).toBe(true);
  expect(isAvailable(meal)).toBe(true);
  expect(productDetailsPayload(meal).mealOrder).toBe('whatsapp');
});

test('produit et service : pas de mode de commande', () => {
  expect(productDetailsPayload({ kind: 'product', mealOrder: 'whatsapp', condition: 'used' }))
    .toMatchObject({ kind: 'product', mealOrder: null, condition: 'used' });
  expect(productDetailsPayload({ kind: 'service' })).toMatchObject({ kind: 'service', mealOrder: null });
  expect(isWhatsappOnly({ kind: 'service' })).toBe(true);
  expect(kindLabel({ kind: 'product' })).toBe('');
});

test('passage en plat : caractéristiques proposées, sans marque ; retour : retirées si vides', () => {
  const meal = withKind({ kind: 'product', brand: 'Zara', specList: [] }, 'meal');
  expect(meal).toMatchObject({ kind: 'meal', mealOrder: 'online', brand: '' });
  expect(meal.specList.map(([k]) => k)).toEqual(MEAL_SPEC_KEYS);
  expect(withKind(meal, 'product').specList).toEqual([]);
  // Caractéristiques déjà saisies : gardées
  const filled = withKind({ kind: 'product', specList: [['Taille', 'M']] }, 'meal');
  expect(filled.specList).toEqual([['Taille', 'M']]);
  expect(listingText(meal).submit).toBe('Ajouter le plat');
});

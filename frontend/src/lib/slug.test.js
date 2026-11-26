import { categoryUrl, sellerUrl, slugify } from './slug';
import { findCategoryByName } from './categories';

// Mêmes cas que backend/tests/test_seo_urls.py (generate_slug)
test('slugs sans accents ni ponctuation, comme le serveur', () => {
  expect(slugify('Électronique')).toBe('electronique');
  expect(slugify('Produits laitiers et œufs')).toBe('produits-laitiers-et-oeufs');
  expect(slugify('Billets d’avion & voyages')).toBe('billets-d-avion-voyages');
  expect(categoryUrl({ name: 'Pièces auto' })).toBe('/catalog/pieces-auto');
  expect(categoryUrl(undefined)).toBe('/catalog');
});

test('boutique : adresse lisible, sinon id', () => {
  expect(sellerUrl({ id: 'seller_d2208233', slug: 'auto-business-237' })).toBe('/seller/auto-business-237');
  expect(sellerUrl({ id: 'seller_d2208233' })).toBe('/seller/seller_d2208233');
});

test('catégorie trouvée par slug, par ancien nom accentué ou par ancien nom', () => {
  const categories = [
    { id: 'c1', name: 'Produits laitiers et œufs' },
    { id: 'c2', name: 'Électronique', formerNames: ['High-tech'] },
  ];
  expect(findCategoryByName(categories, 'produits-laitiers-et-oeufs')?.id).toBe('c1');
  expect(findCategoryByName(categories, 'electronique')?.id).toBe('c2');
  expect(findCategoryByName(categories, 'Électronique')?.id).toBe('c2');
  expect(findCategoryByName(categories, 'High-tech')?.id).toBe('c2');
});

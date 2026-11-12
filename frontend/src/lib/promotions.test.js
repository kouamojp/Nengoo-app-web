import { FEED_EVERY, FEED_PER_PAGE, interleavePromotions, orderWeighted } from './promotions';

const products = (n) => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}` }));
const promos = (n) => Array.from({ length: n }, (_, i) => ({ id: `ad${i + 1}`, weight: 1 }));
const layout = (items) => items.map((item) => (item.type === 'product' ? 'P' : item.promotion.id));

describe('bannières entre les produits', () => {
  test('une tous les 12 produits, 4 au plus, jamais après le dernier produit', () => {
    expect(FEED_EVERY).toBe(12);
    expect(FEED_PER_PAGE).toBe(4);
    const out = interleavePromotions(products(100), promos(6));
    const ads = out.filter((item) => item.type === 'promotion');
    expect(ads.map((item) => item.promotion.id)).toEqual(['ad1', 'ad2', 'ad3', 'ad4']);
    // Bannière juste après le 12e, le 24e… produit
    const positions = out.reduce((acc, item, i) => (item.type === 'promotion' ? [...acc, i] : acc), []);
    expect(positions).toEqual([12, 25, 38, 51]);
    // Liste courte : pas de bannière pendante à la fin
    expect(layout(interleavePromotions(products(12), promos(2)))).not.toContain('ad1');
    expect(layout(interleavePromotions(products(13), promos(2)))[12]).toBe('ad1');
  });

  test('sans campagne : la grille est inchangée', () => {
    expect(layout(interleavePromotions(products(30), []))).toEqual(Array(30).fill('P'));
  });

  test('ordre pondéré, chaque campagne une seule fois', () => {
    const items = [{ id: 'a', weight: 1 }, { id: 'b', weight: 10 }, { id: 'c', weight: 1 }];
    const ordered = orderWeighted(items);
    expect(ordered.map((i) => i.id).sort()).toEqual(['a', 'b', 'c']);
    // Tirage nul : on prend dans l'ordre
    expect(orderWeighted(items, () => 0).map((i) => i.id)).toEqual(['a', 'b', 'c']);
    let firstB = 0;
    for (let i = 0; i < 400; i += 1) if (orderWeighted(items)[0].id === 'b') firstB += 1;
    expect(firstB).toBeGreaterThan(250); // ~10/12 des tirages
  });
});

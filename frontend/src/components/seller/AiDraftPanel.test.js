import { applyDraft } from './AiDraftPanel';

const product = {
  name: '', description: '', category: 'robes', price: 15000, colors: ['#000000'],
  brand: 'Ancienne', condition: '', specList: [['Taille', 'M']], kind: 'product',
};
const draft = {
  name: 'Robe longue fleurie', description: 'Robe longue à motif fleuri, col en V.',
  specs: { Col: 'En V' }, brand: null, condition: 'new', colors: ['#1e3a8a'], categoryMatches: true,
};

test('le brouillon remplit la fiche sans toucher au prix ni à la catégorie', () => {
  const result = applyDraft(product, draft);
  expect(result.name).toBe('Robe longue fleurie');
  expect(result.specList).toEqual([['Col', 'En V']]);
  expect(result.brand).toBe('');
  expect(result.condition).toBe('new');
  expect(result.colors).toEqual(['#1e3a8a']);
  expect(result.price).toBe(15000);
  expect(result.category).toBe('robes');
});

test('un service ne reçoit ni état ni couleurs', () => {
  const result = applyDraft({ ...product, kind: 'service' }, draft);
  expect(result.condition).toBe('');
  expect(result.colors).toEqual([]);
});

test('sans couleur proposée, celles du vendeur restent', () => {
  expect(applyDraft(product, { ...draft, colors: [] }).colors).toEqual(['#000000']);
});

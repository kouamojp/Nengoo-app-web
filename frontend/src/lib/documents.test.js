import { api, errorMessage, formatSize, loginLink, safeNext } from './documents';
import { prettyNumber } from '../components/documents/PaymentModal';

test('retour après connexion : seulement une page de Nengoo', () => {
  expect(safeNext('/documents/bac-c-2024-maths-1a2b3c')).toBe('/documents/bac-c-2024-maths-1a2b3c');
  expect(safeNext('//evil.example/x')).toBeNull();
  expect(safeNext('https://evil.example')).toBeNull();
  expect(safeNext('/\\evil.example')).toBeNull();
  expect(safeNext(null)).toBeNull();
  expect(loginLink('/documents/x')).toBe('/login/buyer?next=%2Fdocuments%2Fx');
});

test('messages d\'erreur du serveur lisibles', () => {
  expect(errorMessage({ detail: 'Référence invalide.' }, 'x')).toBe('Référence invalide.');
  expect(errorMessage({ detail: { code: 'payment_required', message: 'Payez.' } }, 'x')).toBe('Payez.');
  expect(errorMessage({ detail: [{ msg: 'Value error, Catégorie inconnue.' }] }, 'x')).toBe('Catégorie inconnue.');
  expect(errorMessage(null, 'Par défaut')).toBe('Par défaut');
});

test('tailles et numéros affichés', () => {
  expect(formatSize(2.5 * 1024 * 1024)).toBe('2,5 Mo');
  expect(formatSize(300 * 1024)).toBe('300 Ko');
  expect(formatSize(0)).toBe('');
  expect(prettyNumber('237699112233')).toBe('+237 699 11 22 33');
  expect(prettyNumber('699112233')).toBe('699 11 22 33');
});

test('une erreur 402 garde son code (quota épuisé)', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 402,
    json: async () => ({ detail: { code: 'payment_required', message: 'Vos 10 téléchargements gratuits sont utilisés.' } }),
  });
  await expect(api('/documents/doc_1/unlock', { method: 'POST' })).rejects.toMatchObject({
    status: 402, code: 'payment_required', message: 'Vos 10 téléchargements gratuits sont utilisés.',
  });
  expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/\/documents\/doc_1\/unlock$/), expect.objectContaining({ method: 'POST' }));

  global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
  await expect(api('/documents')).rejects.toMatchObject({ status: 0 });
});

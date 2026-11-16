import { byDistance, distanceKm, formatDistance, hasCoordinates } from './pickupDistance';

const AKWA = { id: 'akwa', latitude: 4.0525, longitude: 9.6963 };
const BONAPRISO = { id: 'bonapriso', latitude: '4.0333', longitude: '9.6967' };
const BASTOS = { id: 'bastos', latitude: 3.8924, longitude: 11.5115 };
const UNKNOWN = { id: 'unknown', latitude: null, longitude: '' };

test('distance Douala → Yaoundé à vol d’oiseau', () => {
  const km = distanceKm(AKWA.latitude, AKWA.longitude, BASTOS.latitude, BASTOS.longitude);
  expect(km).toBeGreaterThan(195);
  expect(km).toBeLessThan(210);
});

test('le point le plus proche vient en premier ; les points sans GPS sont écartés', () => {
  const user = { latitude: 4.035, longitude: 9.697 }; // Bonapriso
  const sorted = byDistance([BASTOS, UNKNOWN, AKWA, BONAPRISO], user);
  expect(sorted.map(p => p.id)).toEqual(['bonapriso', 'akwa', 'bastos']);
  expect(sorted[0].distanceKm).toBeLessThan(1);
  expect(hasCoordinates(UNKNOWN)).toBe(false);
  expect(hasCoordinates({ latitude: 0, longitude: 0 })).toBe(true);
});

test('distances lisibles', () => {
  expect(formatDistance(0.012)).toBe('50 m');
  expect(formatDistance(0.84)).toBe('850 m');
  expect(formatDistance(2.43)).toBe('2,4 km');
  expect(formatDistance(2.43, 'en')).toBe('2.4 km');
  expect(formatDistance(37.6)).toBe('38 km');
});

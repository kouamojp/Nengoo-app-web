// Distances entre l'utilisateur et les points de retrait, calculées dans le
// navigateur : la position de l'utilisateur n'est envoyée à aucun serveur.

const isCoordinate = (v) => v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v));

export const hasCoordinates = (point) => isCoordinate(point?.latitude) && isCoordinate(point?.longitude);

/** Distance à vol d'oiseau en km (formule de haversine). */
export const distanceKm = (lat1, lng1, lat2, lng2) => {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
};

/** Points localisés avec leur distance, du plus proche au plus loin. */
export const byDistance = (points, user) => points
  .filter(hasCoordinates)
  .map(p => ({ ...p, distanceKm: distanceKm(user.latitude, user.longitude, Number(p.latitude), Number(p.longitude)) }))
  .sort((a, b) => a.distanceKm - b.distanceKm);

/** « 850 m », « 2,4 km », « 37 km ». */
export const formatDistance = (km, language = 'fr') => {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  const value = km < 10 ? km.toFixed(1) : String(Math.round(km));
  return `${language === 'fr' ? value.replace('.', ',') : value} km`;
};

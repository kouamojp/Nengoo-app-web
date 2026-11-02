// Villes proposées dans les formulaires : même liste que le serveur
// (backend/catalog_rules.py, GET /api/cities). Le serveur ramène « DOUALA » ou
// « douala  » à « Douala » ; une ville absente de la liste reste acceptée.
export const CITIES = [
  'Douala', 'Yaoundé', 'Bafoussam', 'Bamenda', 'Garoua', 'Maroua', 'Ngaoundéré',
  'Bertoua', 'Buea', 'Limbé', 'Kribi', 'Ebolowa', 'Kumba', 'Dschang', 'Nkongsamba',
  'Edéa', 'Foumban', 'Mbouda', 'Bafang', 'Bangangté', 'Loum', 'Mbalmayo', 'Sangmélima',
  'Kousséri', 'Tiko', 'Mbanga', 'Obala', 'Bafia', 'Batouri', 'Meiganga',
];

export const CITIES_DATALIST_ID = 'nengoo-cities';

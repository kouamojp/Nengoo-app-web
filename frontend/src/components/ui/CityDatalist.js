import React from 'react';
import { CITIES, CITIES_DATALIST_ID } from '../../lib/cities';

// Suggestions pour un champ ville libre : <input list={CITIES_DATALIST_ID} />
const CityDatalist = () => (
  <datalist id={CITIES_DATALIST_ID}>
    {CITIES.map((city) => <option key={city} value={city} />)}
  </datalist>
);

export default CityDatalist;

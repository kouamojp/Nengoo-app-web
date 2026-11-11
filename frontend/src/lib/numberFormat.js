// Montants et nombres en français : 12 500 FCFA.
//
// Intl sépare les milliers par une espace fine insécable (U+202F), presque
// invisible avec Archivo, surtout en largeur condensée (prix) : « 12500 ».
// On la remplace par l'espace insécable ordinaire (U+00A0), visible et qui
// garde le nombre sur une seule ligne. Même interface que Intl.NumberFormat.

const NARROW_SPACE = / /g;

export const numberFormat = (locale, options) => {
  const formatter = new Intl.NumberFormat(locale, options);
  return { format: (value) => formatter.format(value).replace(NARROW_SPACE, ' ') };
};

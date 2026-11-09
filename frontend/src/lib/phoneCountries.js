// Pays acceptés pour un numéro WhatsApp, mêmes règles que l'app mobile
// (nengoo-front/lib/helper/phone_formatter.dart, classe PhoneCountry).
export const PHONE_COUNTRIES = [
  { iso: 'CM', dialCode: '237', nationalLength: 9, hint: '6XX XX XX XX' },
  { iso: 'CA', dialCode: '1', nationalLength: 10, hint: '514 555 0123' },
  // En Russie, le 8 initial est le préfixe national, à retirer
  { iso: 'RU', dialCode: '7', nationalLength: 10, hint: '912 345 67 89', trunkPrefix: '8' },
];

export const phoneCountry = (iso) => PHONE_COUNTRIES.find(c => c.iso === iso) || PHONE_COUNTRIES[0];

// Chiffres du numéro national, sans l'indicatif ni le préfixe national éventuellement tapés en plus
export const nationalDigits = (country, input) => {
  let digits = (input || '').replace(/\D/g, '');
  const { dialCode, nationalLength, trunkPrefix } = country;
  if (digits.length === dialCode.length + nationalLength && digits.startsWith(dialCode)) {
    digits = digits.slice(dialCode.length);
  } else if (trunkPrefix && digits.length === trunkPrefix.length + nationalLength && digits.startsWith(trunkPrefix)) {
    digits = digits.slice(trunkPrefix.length);
  }
  return digits;
};

export const isValidPhone = (country, input) => nationalDigits(country, input).length === country.nationalLength;

// Format international (+237690703689), identifiant du compte. Une saisie déjà
// internationale qui ne correspond pas au pays choisi (« +33… ») part telle quelle.
export const toInternational = (country, input) => {
  const normalized = (input || '').replace(/[\s\-().]/g, '');
  if (!isValidPhone(country, input) && normalized.startsWith('+')) return normalized;
  return `+${country.dialCode}${nationalDigits(country, input)}`;
};

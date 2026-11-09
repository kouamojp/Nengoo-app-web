import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { EyeIcon, EyeOffIcon } from '../ui/Icons';
import { PHONE_COUNTRIES, phoneCountry } from '../../lib/phoneCountries';

// Cadre commun des écrans de compte : colonne violette, formulaire sur blanc.

export const ACCOUNT_TYPES = ['buyer', 'seller'];
const REMEMBERED_TYPE = 'nengoo-login-type';

// Un vendeur revient surtout gérer sa boutique : on rouvre son dernier choix
export const rememberedType = () => {
  try {
    const saved = localStorage.getItem(REMEMBERED_TYPE);
    return ACCOUNT_TYPES.includes(saved) ? saved : 'buyer';
  } catch {
    return 'buyer';
  }
};

export const rememberType = (type) => {
  try {
    localStorage.setItem(REMEMBERED_TYPE, type);
  } catch {
    // Sans stockage, on repart simplement sur « acheteur »
  }
};

/** Type demandé par l'URL s'il est valable, sinon le dernier choix. */
export const accountTypeFrom = (value) => (ACCOUNT_TYPES.includes(value) ? value : rememberedType());

/** Message d'une réponse d'erreur FastAPI : texte, ou liste pour une erreur 422. */
export const apiError = (data, fallback) => {
  if (typeof data?.detail === 'string') return data.detail;
  if (Array.isArray(data?.detail) && data.detail[0]?.msg) return data.detail[0].msg;
  return fallback;
};

export const fieldClass = 'w-full h-12 px-4 text-base text-gray-900 placeholder:text-gray-500 bg-white border border-gray-400 !rounded-xl focus:outline-none focus:border-purple-700 focus:ring-2 focus:ring-purple-200';

// Orbite du logo, tracée autour du type de compte choisi
const Orbit = () => (
  <svg className="absolute -left-[10%] -top-[28%] w-[120%] h-[156%] max-w-none pointer-events-none" viewBox="0 0 600 240" fill="none" preserveAspectRatio="none" aria-hidden="true">
    <g transform="rotate(-5 300 120)">
      <path className="orbit-draw" style={{ animationDuration: '600ms', animationDelay: '0ms' }} pathLength="1" d="M12 120 A288 100 0 1 1 588 120" stroke="rgba(255,255,255,0.4)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
      <path className="orbit-draw" style={{ animationDuration: '600ms', animationDelay: '0ms' }} pathLength="1" d="M12 120 A288 100 0 0 0 588 120" stroke="#FDE047" strokeWidth="4" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </g>
  </svg>
);

const wordClass = 'relative block w-fit whitespace-nowrap font-display text-[clamp(2.4rem,12vw,3.75rem)] lg:text-[clamp(5rem,9vw,8.5rem)]';

/** Acheteur ou vendeur : le titre de la page sert de sélecteur. */
export const AccountTypeChoice = ({ value, onChange, legend, labels }) => (
  <fieldset className="mt-5 lg:mt-10">
    <legend className="sr-only">{legend}</legend>
    <div className="flex gap-7 lg:flex-col lg:items-start lg:gap-8">
      {ACCOUNT_TYPES.map(option => (
        <label key={option} className="cursor-pointer">
          <input
            type="radio"
            name="accountType"
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
            className="peer sr-only"
          />
          <span className={`${wordClass} transition-colors rounded-sm peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-8 peer-focus-visible:outline-yellow-300 ${
            value === option ? 'text-white' : 'text-purple-300 hover:text-white'
          }`}>
            {value === option && <Orbit key={option} />}
            <span className="relative">{labels[option]}</span>
          </span>
        </label>
      ))}
    </div>
  </fieldset>
);

/**
 * `title` : titre de la page. Avec `choice` (sélecteur de compte), il reste
 * discret ; sinon il occupe toute la colonne violette.
 */
export const AuthShell = ({ title, intro, choice, homeLabel, wide = false, children }) => (
  <main className="min-h-[100dvh] bg-white text-left lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(28rem,1fr)]">
    <section className="on-dark safe-top bg-purple-800 text-white px-5 pb-6 lg:px-16 lg:pb-14 lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-[100dvh]">
      <div className="pt-4 lg:pt-10">
        <Link to="/" className="inline-block rounded-md" aria-label={homeLabel}>
          <img src="/images/logo-nengoo-white.png" alt="Nengoo" className="h-8 lg:h-11 w-auto" />
        </Link>
      </div>
      <div className="lg:my-auto">
        {choice ? (
          <>
            <h1 className="mt-5 text-lg font-semibold text-white lg:mt-0" style={{ fontStretch: '100%' }}>{title}</h1>
            {choice}
          </>
        ) : (
          <h1 className="mt-5 lg:mt-0 max-w-[12ch] font-display text-white text-[clamp(2.4rem,12vw,3.75rem)] lg:text-[clamp(4.5rem,8vw,7.5rem)]">{title}</h1>
        )}
        {intro && <p className="mt-6 text-base text-purple-100 max-w-md lg:mt-12 lg:text-lg">{intro}</p>}
      </div>
    </section>
    <section className="px-5 py-8 safe-bottom lg:px-16 lg:py-12 lg:flex lg:items-center">
      <div className={`w-full mx-auto ${wide ? 'max-w-lg' : 'max-w-sm'}`}>{children}</div>
    </section>
  </main>
);

export const Field = ({ id, label, aside, hint, className = '', children }) => (
  <div className={className}>
    <div className="mb-1.5 flex items-baseline justify-between gap-4">
      <label htmlFor={id} className="text-sm font-semibold text-gray-900">{label}</label>
      {aside}
    </div>
    {children}
    {hint && <p id={`${id}-hint`} className="mt-1.5 text-sm text-gray-600">{hint}</p>}
  </div>
);

// Numéro WhatsApp précédé du choix de l'indicatif : fermé, le select montre
// l'indicatif seul ; ouvert, le pays en clair (comme l'app mobile).
export const PhoneInput = ({ country, onCountryChange, countryLabel, countryNames, ...input }) => (
  <div className="flex gap-2">
    <div className="relative shrink-0">
      <select
        value={country.iso}
        onChange={(event) => onCountryChange(phoneCountry(event.target.value))}
        aria-label={countryLabel}
        className={`${fieldClass} w-[6.5rem] appearance-none pl-3 pr-8 font-semibold text-transparent`}
      >
        {PHONE_COUNTRIES.map(c => (
          <option key={c.iso} value={c.iso} className="text-gray-900">
            {countryNames[c.iso]}  +{c.dialCode}
          </option>
        ))}
      </select>
      {/* Libellé visible du select fermé, posé par-dessus le texte masqué */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-base font-semibold text-gray-900">
        +{country.dialCode}
      </span>
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600">
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
      </svg>
    </div>
    <input {...input} type="tel" inputMode="tel" placeholder={country.hint} className={`${fieldClass} min-w-0 flex-1`} />
  </div>
);

export const PasswordInput =({ showLabel, hideLabel, ...input }) => {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input {...input} type={shown ? 'text' : 'password'} className={`${fieldClass} pr-12`} />
      <button
        type="button"
        onClick={() => setShown(value => !value)}
        aria-label={shown ? hideLabel : showLabel}
        aria-pressed={shown}
        className="absolute right-0.5 top-0.5 !min-h-0 !min-w-0 w-11 h-11 rounded-xl text-gray-600 hover:text-purple-800 flex items-center justify-center"
      >
        {shown ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
      </button>
    </div>
  );
};

export const FormError = ({ children }) => (
  children ? (
    <p role="alert" className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">{children}</p>
  ) : null
);

export const SubmitButton = ({ sending, sendingLabel, children }) => (
  <button
    type="submit"
    disabled={sending}
    className="w-full h-12 rounded-xl bg-purple-800 hover:bg-purple-900 disabled:bg-purple-400 text-white font-semibold transition-colors flex items-center justify-center gap-2"
  >
    {sending && <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />}
    {sending ? sendingLabel : children}
  </button>
);

export const AuthLink = ({ to, children, strong = false }) => (
  <Link to={to} className={`underline underline-offset-2 ${strong ? 'font-semibold text-purple-800' : 'text-gray-700'}`}>
    {children}
  </Link>
);

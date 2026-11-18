import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { translations } from '../../lib/translations';
import { CITIES } from '../../lib/cities';
import {
  AccountTypeChoice, accountTypeFrom, apiError, AuthLink, AuthShell, Field, fieldClass, FormError,
  PasswordInput, PhoneInput, rememberType, SubmitButton,
} from './AuthLayout';
import { isValidPhone, PHONE_COUNTRIES, toInternational } from '../../lib/phoneCountries';
import { safeNext } from '../../lib/documents';
import { RichTextEditor } from '../ui/RichText';
import { isBlank } from '../../lib/richText';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';
const MIN_PASSWORD_LENGTH = 6; // comme le serveur (password_reset.py)

const EMPTY_FORM = {
  name: '', whatsapp: '', email: '', password: '',
  businessName: '', city: '', region: '', address: '', description: '', restaurant: false,
};

const groupClass = 'grid gap-5 sm:grid-cols-2';
const legendClass = 'mb-4 text-base font-bold text-gray-900';

const Signup = ({ language, setUser }) => {
  const navigate = useNavigate();
  const { accountType } = useParams();
  const t = translations[language].signupPage;
  const common = translations[language].loginPage;
  const type = accountTypeFrom(accountType);
  const seller = type === 'seller';
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const [form, setForm] = useState(EMPTY_FORM);
  const [country, setCountry] = useState(PHONE_COUNTRIES[0]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const chooseType = (nextType) => {
    rememberType(nextType);
    setError('');
    navigate(`/signup/${nextType}${next ? `?next=${encodeURIComponent(next)}` : ''}`, { replace: true });
  };

  // Texte saisi conservé d'un type de compte à l'autre
  const bind = (name) => ({
    id: `signup-${name}`,
    name,
    value: form[name],
    required: true,
    onChange: (event) => setForm(current => ({ ...current, [name]: event.target.value })),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    // Le numéro devient l'identifiant du compte : il doit être complet pour le pays choisi
    if (!isValidPhone(country, form.whatsapp)) {
      setError(t.invalidPhone);
      return;
    }
    if (seller && isBlank(form.description)) {
      setError(t.descriptionRequired);
      document.getElementById('signup-description')?.focus();
      return;
    }
    setSending(true);
    setError('');
    const { name, whatsapp, email, password, ...shop } = form;
    const account = { name, whatsapp: toInternational(country, whatsapp), email, password };
    try {
      const response = await fetch(`${API_BASE_URL}/${seller ? 'sellers' : 'buyers/signup'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seller ? { ...account, ...shop } : account),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(apiError(data, t.failed));
        setSending(false);
        return;
      }
      rememberType(type);
      if (seller) {
        navigate('/pending-approval');
      } else {
        setUser(data);
        navigate(next || '/');
      }
    } catch {
      setError(common.offline);
      setSending(false);
    }
  };

  const accountFields = (
    <div className={groupClass}>
      <Field id="signup-name" label={t.name} className="sm:col-span-2">
        <input {...bind('name')} type="text" autoComplete="name" className={fieldClass} />
      </Field>
      <Field id="signup-whatsapp" label={common.whatsapp}>
        <PhoneInput
          {...bind('whatsapp')}
          autoComplete="tel-national"
          country={country}
          onCountryChange={setCountry}
          countryLabel={common.countryCode}
          countryNames={common.countries}
        />
      </Field>
      <Field id="signup-email" label={t.email}>
        <input {...bind('email')} type="email" autoComplete="email" className={fieldClass} />
      </Field>
      <Field id="signup-password" label={t.password} hint={t.passwordHint} className="sm:col-span-2">
        <PasswordInput
          {...bind('password')}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          aria-describedby="signup-password-hint"
          showLabel={common.showPassword}
          hideLabel={common.hidePassword}
        />
      </Field>
    </div>
  );

  return (
    <AuthShell
      title={t.title}
      homeLabel={common.home}
      intro={t[`${type}Intro`]}
      wide
      choice={<AccountTypeChoice value={type} onChange={chooseType} legend={common.accountType} labels={common} />}
    >
      <form onSubmit={handleSubmit} className="space-y-6" aria-busy={sending}>
        {seller ? (
          <>
            <fieldset>
              <legend className={legendClass}>{t.yourAccount}</legend>
              {accountFields}
            </fieldset>
            <fieldset>
              <legend className={legendClass}>{t.yourShop}</legend>
              <div className={groupClass}>
                <Field id="signup-businessName" label={t.businessName} className="sm:col-span-2">
                  <input {...bind('businessName')} type="text" autoComplete="organization" className={fieldClass} />
                </Field>
                <Field id="signup-city" label={t.city}>
                  <select {...bind('city')} className={fieldClass}>
                    <option value="">{t.selectCity}</option>
                    {CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                  </select>
                </Field>
                <Field id="signup-region" label={t.region}>
                  <input {...bind('region')} type="text" autoComplete="address-level1" className={fieldClass} />
                </Field>
                <Field id="signup-address" label={t.address} className="sm:col-span-2">
                  <input {...bind('address')} type="text" autoComplete="street-address" className={fieldClass} />
                </Field>
                <div className="sm:col-span-2">
                  <p id="signup-description-label" className="mb-1.5 text-sm font-semibold text-gray-900">{t.description}</p>
                  <RichTextEditor
                    id="signup-description"
                    ariaLabelledBy="signup-description-label"
                    value={form.description}
                    onChange={(html) => setForm(current => ({ ...current, description: html }))}
                    placeholder={t.descriptionPlaceholder}
                    minHeight="7rem"
                  />
                </div>
                <label className="sm:col-span-2 flex items-start gap-3 rounded-xl border border-gray-300 p-4 cursor-pointer has-[:checked]:border-purple-600 has-[:checked]:bg-purple-50">
                  <input
                    id="signup-restaurant"
                    type="checkbox"
                    checked={form.restaurant}
                    onChange={(event) => setForm(current => ({ ...current, restaurant: event.target.checked }))}
                    aria-describedby="signup-restaurant-hint"
                    className="mt-0.5 h-5 w-5 shrink-0 accent-purple-700"
                  />
                  <span>
                    <span className="block font-semibold text-gray-900">{t.restaurant}</span>
                    <span id="signup-restaurant-hint" className="block text-sm text-gray-600">{t.restaurantHint}</span>
                  </span>
                </label>
              </div>
            </fieldset>
          </>
        ) : accountFields}

        <FormError>{error}</FormError>
        <SubmitButton sending={sending} sendingLabel={t.sending}>{t[`${type}Submit`]}</SubmitButton>

        <p className="text-sm text-gray-700">
          {t.haveAccount} <AuthLink to={`/login/${type}${next ? `?next=${encodeURIComponent(next)}` : ''}`} strong>{common.submit}</AuthLink>
        </p>
        <p className="text-sm"><AuthLink to="/">{common.home}</AuthLink></p>
      </form>
    </AuthShell>
  );
};

export default Signup;

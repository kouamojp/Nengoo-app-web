import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { translations } from '../../lib/translations';
import { CITIES } from '../../lib/cities';
import {
  AccountTypeChoice, accountTypeFrom, apiError, AuthLink, AuthShell, Field, fieldClass, FormError,
  PasswordInput, rememberType, SubmitButton,
} from './AuthLayout';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';
const MIN_PASSWORD_LENGTH = 6; // comme le serveur (password_reset.py)

const EMPTY_FORM = {
  name: '', whatsapp: '', email: '', password: '',
  businessName: '', city: '', region: '', address: '', description: '',
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
  const [form, setForm] = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const chooseType = (next) => {
    rememberType(next);
    setError('');
    navigate(`/signup/${next}`, { replace: true });
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
    setSending(true);
    setError('');
    const { name, whatsapp, email, password, ...shop } = form;
    const account = { name, whatsapp, email, password };
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
        navigate('/');
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
        <input {...bind('whatsapp')} type="tel" inputMode="tel" autoComplete="tel" placeholder="+237 6XX XXX XXX" className={fieldClass} />
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
                <Field id="signup-description" label={t.description} className="sm:col-span-2">
                  <textarea {...bind('description')} rows={3} placeholder={t.descriptionPlaceholder} className={`${fieldClass} h-auto py-3`} />
                </Field>
              </div>
            </fieldset>
          </>
        ) : accountFields}

        <FormError>{error}</FormError>
        <SubmitButton sending={sending} sendingLabel={t.sending}>{t[`${type}Submit`]}</SubmitButton>

        <p className="text-sm text-gray-700">
          {t.haveAccount} <AuthLink to={`/login/${type}`} strong>{common.submit}</AuthLink>
        </p>
        <p className="text-sm"><AuthLink to="/">{common.home}</AuthLink></p>
      </form>
    </AuthShell>
  );
};

export default Signup;

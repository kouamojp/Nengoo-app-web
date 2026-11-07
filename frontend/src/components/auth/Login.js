import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { translations } from '../../lib/translations';
import {
  AccountTypeChoice, accountTypeFrom, apiError, AuthLink, AuthShell, Field, fieldClass, FormError,
  PasswordInput, rememberType, SubmitButton,
} from './AuthLayout';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const Login = ({ language, setUser }) => {
  const navigate = useNavigate();
  const { accountType } = useParams();
  const t = translations[language].loginPage;
  const type = accountTypeFrom(accountType);
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const chooseType = (next) => {
    rememberType(next);
    setError('');
    navigate(`/login/${next}`, { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/${type === 'seller' ? 'sellers' : 'buyers'}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp, password }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(apiError(data, t.failed));
        setSending(false);
        return;
      }
      rememberType(type);
      setUser(data);
      navigate(type === 'seller' ? '/seller' : '/');
    } catch {
      setError(t.offline);
      setSending(false);
    }
  };

  return (
    <AuthShell
      title={t.title}
      homeLabel={t.home}
      intro={t[`${type}Intro`]}
      choice={<AccountTypeChoice value={type} onChange={chooseType} legend={t.accountType} labels={t} />}
    >
      <form onSubmit={handleSubmit} className="space-y-5" aria-busy={sending}>
        <Field id="login-whatsapp" label={t.whatsapp}>
          <input
            id="login-whatsapp"
            type="tel"
            name="username"
            autoComplete="username"
            inputMode="tel"
            value={whatsapp}
            onChange={(event) => setWhatsapp(event.target.value)}
            placeholder="+237 6XX XXX XXX"
            required
            className={fieldClass}
          />
        </Field>

        <Field
          id="login-password"
          label={t.password}
          aside={(
            <Link to={`/forgot-password?type=${type}`} className="text-sm font-medium text-purple-800 underline underline-offset-2">
              {t.forgot}
            </Link>
          )}
        >
          <PasswordInput
            id="login-password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            showLabel={t.showPassword}
            hideLabel={t.hidePassword}
          />
        </Field>

        <FormError>{error}</FormError>
        <SubmitButton sending={sending} sendingLabel={t.signingIn}>{t.submit}</SubmitButton>

        <p className="text-sm text-gray-700">
          {t.noAccount} <AuthLink to={`/signup/${type}`} strong>{t[`${type}Signup`]}</AuthLink>
        </p>
        <p className="text-sm"><AuthLink to="/">{t.home}</AuthLink></p>
      </form>
    </AuthShell>
  );
};

export default Login;

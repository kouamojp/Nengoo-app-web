import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { translations } from '../../lib/translations';
import {
  AccountTypeChoice, accountTypeFrom, apiError, AuthLink, AuthShell, Field, fieldClass, FormError, SubmitButton,
} from './AuthLayout';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const ForgotPassword = ({ language }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const t = translations[language].forgotPage;
  const common = translations[language].loginPage;
  const type = accountTypeFrom(searchParams.get('type'));
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const chooseType = (next) => {
    setError('');
    setSearchParams({ type: next }, { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, user_type: type }),
      });
      // Même réponse qu'un compte existe ou non : on ne révèle pas lesquels existent
      if (response.ok) {
        setSent(true);
      } else {
        setError(apiError(await response.json().catch(() => null), t.failed));
      }
    } catch {
      setError(common.offline);
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthShell
      title={t.title}
      homeLabel={common.home}
      intro={t.intro}
      choice={<AccountTypeChoice value={type} onChange={chooseType} legend={common.accountType} labels={common} />}
    >
      {sent ? (
        <div role="status" className="space-y-5">
          <h2 className="text-2xl font-bold text-gray-900">{t.sentTitle}</h2>
          <p className="text-base text-gray-700">{t.sentText.replace('{email}', email)}</p>
          <p className="text-sm text-gray-700">{t.sentHint}</p>
          <p className="text-sm">
            <button type="button" onClick={() => setSent(false)} className="!min-h-0 font-semibold text-purple-800 underline underline-offset-2">
              {t.otherAddress}
            </button>
          </p>
          <p className="text-sm"><AuthLink to={`/login/${type}`}>{t.backToLogin}</AuthLink></p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" aria-busy={sending}>
          <Field id="forgot-email" label={t.email}>
            <input
              id="forgot-email"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className={fieldClass}
            />
          </Field>
          <FormError>{error}</FormError>
          <SubmitButton sending={sending} sendingLabel={t.sending}>{t.submit}</SubmitButton>
          <p className="text-sm"><AuthLink to={`/login/${type}`}>{t.backToLogin}</AuthLink></p>
        </form>
      )}
    </AuthShell>
  );
};

export default ForgotPassword;

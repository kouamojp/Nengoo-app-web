import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { translations } from '../../lib/translations';
import {
  accountTypeFrom, apiError, AuthLink, AuthShell, Field, FormError, PasswordInput, SubmitButton,
} from './AuthLayout';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';
const MIN_PASSWORD_LENGTH = 6; // comme le serveur (password_reset.py)

const ResetPassword = ({ language }) => {
  const [searchParams] = useSearchParams();
  const t = translations[language].resetPage;
  const common = translations[language].loginPage;
  const token = searchParams.get('token');
  const userType = searchParams.get('type');
  const type = accountTypeFrom(userType);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError(t.mismatch);
      return;
    }
    setSending(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password, user_type: userType }),
      });
      if (response.ok) {
        setDone(true);
      } else {
        setError(apiError(await response.json().catch(() => null), t.failed));
      }
    } catch {
      setError(common.offline);
    } finally {
      setSending(false);
    }
  };

  const passwordProps = {
    autoComplete: 'new-password',
    minLength: MIN_PASSWORD_LENGTH,
    required: true,
    showLabel: common.showPassword,
    hideLabel: common.hidePassword,
  };

  if (!token || !userType) {
    return (
      <AuthShell title={t.invalidTitle} homeLabel={common.home} intro={t.invalidText}>
        <p className="text-sm"><AuthLink to="/forgot-password" strong>{t.newLink}</AuthLink></p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t.title} homeLabel={common.home} intro={t.intro}>
      {done ? (
        <div role="status" className="space-y-5">
          <h2 className="text-2xl font-bold text-gray-900">{t.doneTitle}</h2>
          <p className="text-base text-gray-700">{t.doneText}</p>
          <p className="text-sm"><AuthLink to={`/login/${type}`} strong>{common.submit}</AuthLink></p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" aria-busy={sending}>
          <Field id="reset-password" label={t.password} hint={t.passwordHint}>
            <PasswordInput
              {...passwordProps}
              id="reset-password"
              name="new-password"
              aria-describedby="reset-password-hint"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          <Field id="reset-confirm" label={t.confirm}>
            <PasswordInput
              {...passwordProps}
              id="reset-confirm"
              name="confirm-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </Field>
          <FormError>{error}</FormError>
          <SubmitButton sending={sending} sendingLabel={t.sending}>{t.submit}</SubmitButton>
        </form>
      )}
    </AuthShell>
  );
};

export default ResetPassword;

import React, { useEffect, useId, useState } from 'react';
import { api, formatFCFA, OPERATOR_STYLE, TEXT } from '../../lib/documents';
import { BusyLabel } from '../ui/Spinner';

// Numéro affiché par groupes : 237 699 11 22 33
const prettyNumber = (digits = '') => {
  const local = digits.startsWith('237') ? digits.slice(3) : digits;
  const grouped = local.replace(/^(\d{3})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4');
  return digits.startsWith('237') ? `+237 ${grouped}` : grouped;
};

/**
 * Paiement manuel : l'acheteur envoie le montant au numéro Mobile Money de
 * Nengoo, puis saisit la référence de la transaction. L'équipe vérifie.
 */
const PaymentModal = ({ doc, user, language, onClose, onSent }) => {
  const t = TEXT[language];
  const titleId = useId();
  const [info, setInfo] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [operator, setOperator] = useState('');
  const [payerPhone, setPayerPhone] = useState(user?.whatsapp ? prettyNumber(user.whatsapp) : '');
  const [reference, setReference] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/documents/payment-info')
      .then(data => {
        setInfo(data);
        setOperator(data.operators[0]?.id || '');
      })
      .catch(e => setLoadError(e.message));
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !sending && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, sending]);

  const chosen = info?.operators.find(o => o.id === operator);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await api(`/documents/${doc.id}/payments`, {
        method: 'POST',
        body: { operator, payerPhone, reference },
      });
      onSent();
    } catch (err) {
      setError(err.message);
      setSending(false);
    }
  };

  const inputClass = 'w-full h-12 px-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500';

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => !sending && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-xl font-bold text-purple-950">{t.payTitle}</h2>
            <p className="mt-1 text-sm text-gray-700">{doc.title}</p>
          </div>
          <button type="button" onClick={onClose} disabled={sending} aria-label={t.cancel} className="!min-h-0 !min-w-0 w-9 h-9 rounded-full hover:bg-gray-100 text-gray-600">✕</button>
        </div>

        {loadError && <p className="mt-4 text-sm text-red-700" role="alert">{loadError}</p>}
        {!info && !loadError && <div className="mt-5 h-40 rounded-xl loading-shimmer" />}
        {info && info.operators.length === 0 && <p className="mt-4 text-gray-800">{t.payUnavailable}</p>}

        {info && info.operators.length > 0 && (
          <form onSubmit={submit} className="mt-5 space-y-5">
            <fieldset>
              <legend className="text-sm font-semibold text-gray-900 mb-2">{t.operator}</legend>
              <div className="grid grid-cols-2 gap-2">
                {info.operators.map(o => (
                  <label
                    key={o.id}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer ${operator === o.id ? 'border-purple-700 bg-purple-50' : 'border-gray-200'}`}
                  >
                    <input type="radio" name="operator" value={o.id} checked={operator === o.id} onChange={() => setOperator(o.id)} className="accent-purple-700" />
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${OPERATOR_STYLE[o.id]}`}>{o.id === 'mtn' ? 'MTN' : 'Orange'}</span>
                    <span className="text-sm font-semibold">{o.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {chosen && (
              <div className="p-4 rounded-xl bg-yellow-100 text-purple-950">
                <p className="text-sm">{t.payStep1(formatFCFA(doc.price))}</p>
                <p className="mt-1 price text-2xl tracking-wide select-all">{prettyNumber(chosen.number)}</p>
                {chosen.name && <p className="text-sm">{t.payHolder} : <strong>{chosen.name}</strong></p>}
                {info.instructions && <p className="mt-2 text-sm whitespace-pre-line">{info.instructions}</p>}
                <p className="mt-2 text-sm">{t.payStep2}</p>
              </div>
            )}

            <label className="block">
              <span className="block text-sm font-semibold text-gray-900 mb-1">{t.payerPhone}</span>
              <input type="tel" inputMode="tel" autoComplete="tel" value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} required className={inputClass} />
            </label>
            <label className="block">
              <span className="block text-sm font-semibold text-gray-900 mb-1">{t.reference}</span>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                required
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                className={`${inputClass} font-mono uppercase`}
              />
              <span className="block mt-1 text-xs text-gray-600">{t.referenceHint}</span>
            </label>

            {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
            <p className="text-xs text-gray-500">{t.noRefund}</p>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button type="button" onClick={onClose} disabled={sending} className="h-12 px-6 rounded-full border border-gray-300 font-semibold">{t.cancel}</button>
              <button type="submit" disabled={sending || !operator} aria-busy={sending} className="h-12 px-6 rounded-full bg-purple-800 text-white font-semibold hover:bg-purple-900 disabled:opacity-60">
                <BusyLabel busy={sending} busyText={t.sending}>{t.sendPayment}</BusyLabel>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export { prettyNumber };
export default PaymentModal;

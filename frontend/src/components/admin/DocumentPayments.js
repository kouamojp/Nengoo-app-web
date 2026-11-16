import React, { useCallback, useEffect, useState } from 'react';
import { EmptyRow, Field, formatXAF, LoadingRows, Modal, SectionHeader } from './AdminUI';
import { confirmAction, notify } from './adminFeedback';
import { api, OPERATOR_STYLE } from '../../lib/documents';
import { prettyNumber } from '../documents/PaymentModal';
import { BusyLabel } from '../ui/Spinner';

const TABS = [
  ['pending', 'À vérifier'],
  ['approved', 'Validés'],
  ['rejected', 'Refusés'],
  ['expired', 'Expirés'],
  ['all', 'Tous'],
];

const STATUS = {
  pending: { label: 'À vérifier', className: 'bg-yellow-100 text-yellow-900' },
  approved: { label: 'Validé', className: 'bg-green-100 text-green-800' },
  rejected: { label: 'Refusé', className: 'bg-red-100 text-red-800' },
  expired: { label: 'Expiré', className: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'Annulé par le client', className: 'bg-gray-100 text-gray-700' },
};

const REASONS = [
  'Paiement introuvable sur notre compte',
  'Montant reçu inférieur au prix du document',
  'Référence de transaction incorrecte',
];

const formatDateTime = (value) => {
  if (!value) return '';
  const text = String(value);
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(text) ? text : `${text}Z`)
    .toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

/** Numéros Mobile Money affichés aux clients sur l'écran de paiement. */
const PaymentSettings = () => {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    api('/admin/document-settings').then(setForm).catch(e => notify(e.message, 'error'));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      setForm(await api('/admin/document-settings', { method: 'PUT', body: form, fallback: "L'enregistrement a échoué." }));
      notify('Numéros de paiement enregistrés.');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <div className="adm-card p-5 h-40 loading-shimmer" />;
  const missing = !form.orangeNumber && !form.mtnNumber;

  return (
    <form onSubmit={save} className="adm-card p-5 space-y-4">
      <div>
        <h3 className="text-lg font-extrabold">Numéros Mobile Money de Nengoo</h3>
        <p className="text-sm text-gray-600">Les clients paient sur ces numéros. Un opérateur sans numéro n'est pas proposé.</p>
        {missing && <p className="mt-2 text-sm font-semibold text-red-700" role="alert">Aucun numéro : les clients ne peuvent pas encore payer.</p>}
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Numéro Orange Money"><input value={form.orangeNumber} onChange={set('orangeNumber')} inputMode="tel" className="adm-input" placeholder="699 00 00 00" /></Field>
        <Field label="Titulaire Orange Money" hint="Nom affiché par Orange au moment du paiement."><input value={form.orangeName} onChange={set('orangeName')} maxLength={80} className="adm-input" /></Field>
        <Field label="Numéro MTN MoMo"><input value={form.mtnNumber} onChange={set('mtnNumber')} inputMode="tel" className="adm-input" placeholder="677 00 00 00" /></Field>
        <Field label="Titulaire MTN MoMo"><input value={form.mtnName} onChange={set('mtnName')} maxLength={80} className="adm-input" /></Field>
      </div>
      <Field label="Instructions (facultatif)" hint="Affichées sous le numéro, par exemple le délai de vérification.">
        <textarea value={form.instructions} onChange={set('instructions')} maxLength={600} rows={2} className="adm-input" />
      </Field>
      <div className="flex justify-end">
        <button type="submit" disabled={saving} aria-busy={saving} className="adm-btn adm-btn-primary"><BusyLabel busy={saving} busyText="Enregistrement…">Enregistrer</BusyLabel></button>
      </div>
    </form>
  );
};

const RejectModal = ({ payment, onClose, onDone }) => {
  const [reason, setReason] = useState(REASONS[0]);
  const [other, setOther] = useState('');
  const [sending, setSending] = useState(false);
  const text = reason === 'other' ? other.trim() : reason;

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api(`/admin/document-payments/${payment.id}/reject`, { method: 'POST', body: { reason: text } });
      notify('Paiement refusé. Le client est prévenu.');
      onDone();
    } catch (err) {
      notify(err.message, 'error');
      setSending(false);
    }
  };

  return (
    <Modal title="Refuser le paiement" onClose={() => !sending && onClose()} size="max-w-lg">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-gray-700">
          {payment.buyerName} · {formatXAF(payment.amount)} · <span className="font-mono">{payment.reference}</span>.
          Le client verra ce motif. La référence ne pourra plus être utilisée.
        </p>
        <fieldset className="space-y-2">
          <legend className="adm-label">Motif</legend>
          {[...REASONS, 'other'].map(r => (
            <label key={r} className="flex items-center gap-2 text-sm">
              <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="accent-purple-700" />
              {r === 'other' ? 'Autre motif' : r}
            </label>
          ))}
        </fieldset>
        {reason === 'other' && (
          <textarea value={other} onChange={(e) => setOther(e.target.value)} required minLength={3} maxLength={300} rows={2} className="adm-input" aria-label="Autre motif" autoFocus />
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={sending} className="adm-btn adm-btn-secondary">Annuler</button>
          <button type="submit" disabled={sending || text.length < 3} aria-busy={sending} className="adm-btn adm-btn-danger"><BusyLabel busy={sending} busyText="Envoi…">Refuser</BusyLabel></button>
        </div>
      </form>
    </Modal>
  );
};

const DocumentPayments = ({ onCountChange }) => {
  const [tab, setTab] = useState('pending');
  const [data, setData] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    api(`/admin/document-payments?status=${tab}`)
      .then(d => {
        setData(d);
        onCountChange?.(d.counts.pending || 0);
      })
      .catch(e => { setData({ items: [], counts: {} }); notify(e.message, 'error'); });
  }, [tab, onCountChange]);

  useEffect(() => {
    setData(null);
    load();
  }, [load]);

  const approve = async (p) => {
    const ok = await confirmAction({
      title: 'Valider ce paiement ?',
      message: `Vérifiez sur le téléphone de Nengoo : ${formatXAF(p.amount)} reçus du ${prettyNumber(p.payerPhone)} par ${p.operatorLabel}, référence ${p.reference}. Le document sera débloqué pour ${p.buyerName}.`,
      confirmLabel: 'Valider',
      danger: false,
    });
    if (!ok) return;
    setBusy(p.id);
    try {
      await api(`/admin/document-payments/${p.id}/approve`, { method: 'POST' });
      notify(`Paiement validé : ${p.buyerName} peut télécharger le document.`);
      load();
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  const counts = data?.counts || {};

  return (
    <div className="space-y-8">
      <div>
        <SectionHeader
          title="Paiements des documents"
          count={counts.pending}
          description="Comparez chaque demande au SMS reçu sur le téléphone de Nengoo (montant, référence, numéro), puis validez ou refusez. Le client est prévenu."
        />
        <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="État des paiements">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`!min-h-0 h-9 px-4 rounded-full text-sm font-semibold border ${tab === id ? 'bg-purple-950 text-white border-purple-950' : 'bg-white border-gray-300 text-gray-800'}`}
            >
              {label}{id !== 'all' && counts[id] ? ` (${counts[id]})` : ''}
            </button>
          ))}
        </div>

        <div className="adm-card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="adm-th">Demande</th>
                <th className="adm-th">Client</th>
                <th className="adm-th">Paiement</th>
                <th className="adm-th text-right">Montant</th>
                <th className="adm-th">État</th>
                <th className="adm-th"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {!data && <LoadingRows colSpan={6} />}
              {data && data.items.length === 0 && (
                <EmptyRow colSpan={6}>{tab === 'pending' ? 'Aucun paiement à vérifier.' : 'Aucune demande.'}</EmptyRow>
              )}
              {data?.items.map(p => (
                <tr key={p.id}>
                  <td className="adm-td">
                    <span className="font-semibold">{p.documentTitle}</span>
                    <span className="block text-xs text-gray-500">{formatDateTime(p.createdAt)}</span>
                  </td>
                  <td className="adm-td text-sm">
                    {p.buyerName}
                    <span className="block text-xs text-gray-500">{prettyNumber(p.buyerPhone)}</span>
                  </td>
                  <td className="adm-td text-sm">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${OPERATOR_STYLE[p.operator]}`}>{p.operator === 'mtn' ? 'MTN' : 'Orange'}</span>
                    <span className="block mt-1 font-mono">{p.reference}</span>
                    <span className="block text-xs text-gray-500">depuis le {prettyNumber(p.payerPhone)}</span>
                  </td>
                  <td className="adm-td text-right price whitespace-nowrap">{formatXAF(p.amount)}</td>
                  <td className="adm-td">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS[p.status]?.className}`}>{STATUS[p.status]?.label || p.status}</span>
                    {p.rejectReason && <span className="block mt-1 text-xs text-gray-600 max-w-[14rem]">{p.rejectReason}</span>}
                  </td>
                  <td className="adm-td whitespace-nowrap text-right">
                    {['pending', 'expired'].includes(p.status) && (
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => approve(p)} disabled={Boolean(busy)} aria-busy={busy === p.id} className="adm-btn adm-btn-primary"><BusyLabel busy={busy === p.id} busyText="Validation…">Valider</BusyLabel></button>
                        <button type="button" onClick={() => setRejecting(p)} disabled={Boolean(busy)} className="adm-btn adm-btn-secondary">Refuser</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PaymentSettings />

      {rejecting && (
        <RejectModal payment={rejecting} onClose={() => setRejecting(null)} onDone={() => { setRejecting(null); load(); }} />
      )}
    </div>
  );
};

export default DocumentPayments;

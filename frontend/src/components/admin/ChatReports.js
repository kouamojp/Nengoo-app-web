import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { notify } from './adminFeedback';
import { SectionHeader, EmptyRow, LoadingRows, Modal } from './AdminUI';
import { errorText } from '../../lib/support';
import { numberFormat } from '../../lib/numberFormat';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const TABS = [
  { status: 'open', label: 'À traiter' },
  { status: 'resolved', label: 'Traités' },
  { status: 'dismissed', label: 'Écartés' },
];

const REASONS = {
  spam: 'Publicité ou messages en masse',
  fraud: 'Arnaque ou paiement suspect',
  abuse: 'Insultes ou harcèlement',
  other: 'Autre raison',
};

const PARTY = { buyer: 'Acheteur', seller: 'Vendeur' };

// Le serveur renvoie des dates UTC sans fuseau
const parseDate = (value) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
const formatDate = (value) => (value
  ? parseDate(value).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '');
const formatPrice = (price) =>
  numberFormat('fr-FR', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(price || 0);

const json = { 'Content-Type': 'application/json' };

/** Conversation signalée, lue par l'équipe pour décider. */
const ReportDetail = ({ reportId, onClose, onUpdated }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/chat/reports/${encodeURIComponent(reportId)}`);
        if (!response.ok) throw new Error(await errorText(response, 'Impossible de charger le signalement.'));
        setData(await response.json());
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [reportId]);

  const decide = async (status, closeThread, message) => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/chat/reports/${encodeURIComponent(reportId)}`, {
        method: 'PUT',
        headers: json,
        body: JSON.stringify({ status, closeThread }),
      });
      if (!response.ok) throw new Error(await errorText(response, "L'action n'a pas abouti. Réessayez."));
      notify(message, 'success');
      onUpdated();
      onClose();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const report = data?.report;
  const thread = data?.thread;
  const closed = (thread?.blockedBy || []).includes('admin');
  const nameOf = (type) => (type === 'buyer' ? thread?.buyerName : thread?.sellerName) || PARTY[type];
  const accountSection = report?.reportedType === 'seller' ? 'sellers' : 'buyers';

  return (
    <Modal title="Conversation signalée" onClose={onClose} size="max-w-3xl">
      {error ? (
        <p role="alert" className="text-red-700">{error}</p>
      ) : !data ? (
        <p className="text-gray-600">Chargement…</p>
      ) : (
        <div className="space-y-5">
          <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Motif</dt>
              <dd className="font-semibold">{REASONS[report.reason] || report.reason}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Signalé le</dt>
              <dd>{formatDate(report.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Signalé par</dt>
              <dd>{nameOf(report.reporterType)} <span className="text-gray-500">({PARTY[report.reporterType].toLowerCase()})</span></dd>
            </div>
            <div>
              <dt className="text-gray-500">Compte signalé</dt>
              <dd>
                {nameOf(report.reportedType)} <span className="text-gray-500">({PARTY[report.reportedType].toLowerCase()})</span>
                {' · '}
                <Link to={`/admin/dashboard?section=${accountSection}`} className="adm-link !min-h-0">Gérer les comptes</Link>
              </dd>
            </div>
            {report.details && (
              <div className="sm:col-span-2">
                <dt className="text-gray-500">Précisions</dt>
                <dd className="whitespace-pre-wrap">{report.details}</dd>
              </div>
            )}
          </dl>

          <section aria-label="Messages de la conversation">
            <h3 className="font-bold text-purple-950 mb-2">
              Messages ({data.messages.length}){closed && <span className="ml-2 text-sm font-semibold text-red-700">Conversation fermée</span>}
            </h3>
            <ol className="max-h-[45vh] overflow-y-auto space-y-2 rounded-xl bg-gray-50 p-3">
              {data.messages.map(m => {
                const fromReported = m.senderType === report.reportedType;
                return (
                  <li key={m.id} className={`rounded-xl px-3 py-2 bg-white border ${fromReported ? 'border-red-200' : 'border-gray-200'}`}>
                    <p className="text-xs text-gray-500">
                      <span className={`font-bold ${fromReported ? 'text-red-800' : 'text-purple-800'}`}>{nameOf(m.senderType)}</span>
                      {' · '}{formatDate(m.createdAt)}
                    </p>
                    {m.product && (
                      <p className="text-xs text-gray-600 mt-0.5">À propos de : {m.product.name}{m.product.price != null && ` (${formatPrice(m.product.price)})`}</p>
                    )}
                    <p className="whitespace-pre-wrap break-words mt-1">{m.body}</p>
                  </li>
                );
              })}
            </ol>
          </section>

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            {report.status !== 'dismissed' && (
              <button type="button" disabled={saving} className="adm-btn adm-btn-secondary"
                onClick={() => decide('dismissed', closed ? false : undefined, 'Signalement écarté.')}>
                Écarter le signalement
              </button>
            )}
            {closed ? (
              <button type="button" disabled={saving} className="adm-btn adm-btn-secondary"
                onClick={() => decide(report.status, false, 'Conversation rouverte.')}>
                Rouvrir la conversation
              </button>
            ) : (
              <button type="button" disabled={saving} className="adm-btn adm-btn-secondary"
                onClick={() => decide('resolved', undefined, 'Signalement marqué comme traité.')}>
                Marquer comme traité
              </button>
            )}
            {!closed && (
              <button type="button" disabled={saving} className="adm-btn adm-btn-primary"
                onClick={() => decide('resolved', true, 'Conversation fermée : plus personne ne peut y écrire.')}>
                Fermer la conversation
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

/**
 * Signalements de la messagerie acheteur ↔ vendeur (backend/routers/chat.py).
 * Seul cas où l'équipe lit une conversation entre un client et une boutique.
 */
const ChatReports = () => {
  const [status, setStatus] = useState('open');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/chat/reports?status=${status}`);
      if (!response.ok) throw new Error(await errorText(response, 'Chargement impossible. Réessayez.'));
      setReports(await response.json());
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const tabClass = (active) => `!min-h-0 h-9 px-4 rounded-full text-sm font-semibold border transition-colors ${
    active ? 'bg-purple-700 border-purple-700 text-white' : 'bg-white border-gray-300 text-gray-800 hover:border-purple-400'
  }`;

  return (
    <div>
      <SectionHeader
        title="Signalements"
        count={reports.length}
        description="Conversations entre clients et boutiques signalées par l'un des deux. Lisez les messages, puis fermez la conversation, marquez le signalement comme traité ou écartez-le."
      />

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="État des signalements">
        {TABS.map(tab => (
          <button key={tab.status} type="button" aria-pressed={status === tab.status}
            onClick={() => setStatus(tab.status)} className={tabClass(status === tab.status)}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="adm-card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="adm-th">Motif</th>
              <th className="adm-th">Signalé par</th>
              <th className="adm-th">Compte signalé</th>
              <th className="adm-th">Date</th>
              <th className="adm-th"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <LoadingRows colSpan={5} />
            ) : reports.length === 0 ? (
              <EmptyRow colSpan={5}>
                {status === 'open' ? 'Aucun signalement à traiter.' : 'Aucun signalement dans cette catégorie.'}
              </EmptyRow>
            ) : reports.map(r => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="adm-td">
                  <p className="font-semibold">{REASONS[r.reason] || r.reason}</p>
                  {r.details && <p className="text-xs text-gray-600 line-clamp-2 max-w-xs">{r.details}</p>}
                  {r.threadClosed && <p className="text-xs font-semibold text-red-700">Conversation fermée</p>}
                </td>
                <td className="adm-td">
                  {r.reporterName || '—'}
                  <p className="text-xs text-gray-500">{PARTY[r.reporterType]}</p>
                </td>
                <td className="adm-td">
                  {r.reportedName || '—'}
                  <p className="text-xs text-gray-500">{PARTY[r.reportedType]}</p>
                </td>
                <td className="adm-td whitespace-nowrap text-gray-600">{formatDate(r.createdAt)}</td>
                <td className="adm-td text-right">
                  <button type="button" onClick={() => setOpenId(r.id)} className="adm-link !min-h-0">Examiner</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openId && <ReportDetail reportId={openId} onClose={() => setOpenId(null)} onUpdated={load} />}
    </div>
  );
};

export default ChatReports;

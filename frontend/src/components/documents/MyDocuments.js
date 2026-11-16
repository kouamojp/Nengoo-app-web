import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatFCFA, startDownload, TEXT } from '../../lib/documents';
import { DocumentCover } from './DocumentCard';
import { QuotaBanner } from '../pages/DocumentStore';
import { BusyLabel, WaitingPanel } from '../ui/Spinner';

const PAYMENT_TONE = {
  pending: 'bg-yellow-100 text-yellow-900',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-gray-100 text-gray-700',
};

const formatDate = (value, language) => {
  if (!value) return '';
  const text = String(value);
  const date = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(text) ? text : `${text}Z`);
  return date.toLocaleDateString(language === 'en' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** Onglet « Mes documents » de l'espace client. */
const MyDocuments = ({ user, language = 'fr', active }) => {
  const t = TEXT[language];
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState(null);

  const load = useCallback(() => {
    setError('');
    api('/documents/me/library').then(setData).catch(e => setError(e.message));
  }, []);

  useEffect(() => {
    if (active && user?.type === 'buyer') load();
  }, [active, user, load]);

  const download = async (doc) => {
    setBusy(doc.id);
    setMessage(null);
    try {
      const left = await startDownload(doc.id);
      setMessage({ id: doc.id, text: `${t.personalCopy} ${t.downloadsLeft(left)}` });
      load();
    } catch (e) {
      setMessage({ id: doc.id, text: e.message, error: true });
    } finally {
      setBusy(null);
    }
  };

  if (user?.type !== 'buyer') return null;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
        <h2 className="text-2xl font-bold">{t.myDocuments}</h2>
        <Link to="/documents" className="text-sm font-semibold text-purple-800 underline underline-offset-4">{t.browse}</Link>
      </div>

      {error && (
        <p className="p-4 rounded-xl bg-white border border-gray-200 text-gray-800" role="alert">
          {error} <button type="button" onClick={load} className="font-semibold text-purple-800 underline">{t.retry}</button>
        </p>
      )}
      {!data && !error && <div className="h-40 rounded-xl loading-shimmer" />}

      {data && (
        <div className="space-y-8">
          <QuotaBanner user={user} quota={data.quota} language={language} />

          {data.documents.length === 0 ? (
            <div className="p-6 rounded-xl bg-white border border-gray-200">
              <p className="text-gray-700">{t.libraryEmpty}</p>
              <Link to="/documents" className="inline-block mt-3 font-semibold text-purple-800 underline underline-offset-4">{t.browse}</Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 rounded-xl bg-white border border-gray-200">
              {data.documents.map(({ document: doc, source, obtainedAt, downloadsLeft }) => (
                <li key={doc.id} className="flex flex-wrap sm:flex-nowrap items-center gap-4 p-4">
                  <Link to={`/documents/${doc.slug || doc.id}`} className="w-14 h-[4.5rem] shrink-0 rounded-lg overflow-hidden" aria-hidden="true" tabIndex={-1}>
                    <DocumentCover doc={doc} language={language} compact />
                  </Link>
                  <div className="flex-1 min-w-[10rem]">
                    <Link to={`/documents/${doc.slug || doc.id}`} className="font-semibold text-gray-900 hover:text-purple-800">{doc.title}</Link>
                    <p className="text-xs text-gray-600">{t.source[source] || source} · {formatDate(obtainedAt, language)}</p>
                    {busy === doc.id && <WaitingPanel steps={t.prepSteps} className="mt-2 !p-3" />}
                    {message?.id === doc.id && (
                      <p className={`mt-1 text-xs ${message.error ? 'text-red-700' : 'text-gray-700'}`} role={message.error ? 'alert' : 'status'}>{message.text}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => download(doc)}
                    disabled={Boolean(busy) || downloadsLeft === 0}
                    aria-busy={busy === doc.id}
                    className="h-11 px-5 rounded-full bg-purple-800 text-white text-sm font-semibold hover:bg-purple-900 disabled:opacity-60"
                  >
                    <BusyLabel busy={busy === doc.id} busyText={t.downloading}>{t.download}</BusyLabel>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {data.payments.length > 0 && (
            <section aria-labelledby="doc-payments">
              <h3 id="doc-payments" className="text-lg font-bold mb-3">{t.payments}</h3>
              <ul className="divide-y divide-gray-200 rounded-xl bg-white border border-gray-200">
                {data.payments.map(p => (
                  <li key={p.id} className="p-4 text-sm">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-semibold text-gray-900">{p.documentTitle}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${PAYMENT_TONE[p.status]}`}>{t.paymentStatus[p.status] || p.status}</span>
                    </div>
                    <p className="mt-1 text-gray-600">
                      {formatFCFA(p.amount)} · {p.operatorLabel} · <span className="font-mono">{p.reference}</span> · {formatDate(p.createdAt, language)}
                    </p>
                    {p.status === 'rejected' && p.rejectReason && (
                      <p className="mt-1 text-red-700">{t.rejectedBecause} : {p.rejectReason}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default MyDocuments;

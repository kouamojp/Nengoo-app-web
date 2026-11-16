import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useLocation, useParams } from 'react-router-dom';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import { DocumentCover } from '../documents/DocumentCard';
import PaymentModal from '../documents/PaymentModal';
import { BusyLabel, WaitingPanel } from '../ui/Spinner';
import { api, categoryLabel, formatFCFA, formatSize, loginLink, startDownload, TEXT } from '../../lib/documents';

const primary = 'inline-flex items-center justify-center h-12 px-6 rounded-full bg-purple-800 text-white font-semibold hover:bg-purple-900 disabled:opacity-60';
const secondary = 'inline-flex items-center justify-center h-12 px-6 rounded-full border border-purple-800 text-purple-800 font-semibold hover:bg-purple-50 disabled:opacity-60';

/** Bloc d'action selon la situation du visiteur (calculée par le serveur : doc.viewer). */
const ActionPanel = ({ doc, user, language, onChanged }) => {
  const t = TEXT[language];
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  // Préparer l'exemplaire filigrané prend quelques secondes
  const [preparing, setPreparing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState(null); // { text, tone }

  const run = async (fn, prepares = false) => {
    setBusy(true);
    setPreparing(prepares);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setMessage({ text: e.message, tone: 'error' });
      if (e.status === 402 || e.status === 409) onChanged();
    } finally {
      setBusy(false);
      setPreparing(false);
      setConfirming(false);
    }
  };

  const download = () => run(async () => {
    const left = await startDownload(doc.id);
    setMessage({ text: `${t.personalCopy} ${t.downloadsLeft(left)}`, tone: 'info' });
  }, true);

  const unlockThenDownload = () => run(async () => {
    await api(`/documents/${doc.id}/unlock`, { method: 'POST' });
    onChanged();
    const left = await startDownload(doc.id);
    setMessage({ text: `${t.obtained} ${t.personalCopy} ${t.downloadsLeft(left)}`, tone: 'success' });
  }, true);

  const cancelRequest = (paymentId) => run(async () => {
    await api(`/documents/payments/${paymentId}/cancel`, { method: 'POST' });
    onChanged();
  });

  let content;
  if (!user) {
    content = (
      <>
        <p className="text-sm text-gray-700">{t.accountRequired}</p>
        <Link to={loginLink(location.pathname)} className={primary}>{t.loginToDownload}</Link>
      </>
    );
  } else if (user.type !== 'buyer' || !doc.viewer) {
    content = <p className="text-sm text-gray-700">{t.sellerAccount}</p>;
  } else {
    const { action, quota, pendingPayment } = doc.viewer;
    if (action === 'download') {
      content = <button type="button" onClick={download} disabled={busy} aria-busy={busy} className={primary}><BusyLabel busy={busy} busyText={t.downloading}>{t.download}</BusyLabel></button>;
    } else if (action === 'unlock_free') {
      content = <button type="button" onClick={unlockThenDownload} disabled={busy} aria-busy={busy} className={primary}><BusyLabel busy={busy} busyText={t.downloading}>{t.getFree}</BusyLabel></button>;
    } else if (action === 'unlock_quota') {
      content = confirming ? (
        <div className="p-4 rounded-xl bg-yellow-100 text-purple-950" role="alertdialog" aria-label={t.useFree}>
          <p className="text-sm font-semibold">{t.useFreeConfirm(quota.remaining)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={unlockThenDownload} disabled={busy} aria-busy={busy} className={primary} autoFocus><BusyLabel busy={busy} busyText={t.downloading}>{t.confirm}</BusyLabel></button>
            <button type="button" onClick={() => setConfirming(false)} disabled={busy} className={secondary}>{t.cancel}</button>
          </div>
        </div>
      ) : (
        <>
          <button type="button" onClick={() => setConfirming(true)} className={primary}>{t.useFree}</button>
          <p className="text-sm text-gray-600">{t.quotaLeft(quota.remaining, quota.limit)}</p>
        </>
      );
    } else if (action === 'payment_pending') {
      content = (
        <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
          <p className="font-semibold text-purple-950">{t.pendingTitle}</p>
          <p className="mt-1 text-sm text-gray-700">{t.pendingText}</p>
          {pendingPayment && (
            <p className="mt-2 text-sm text-gray-700">
              {pendingPayment.operatorLabel} · {formatFCFA(pendingPayment.amount)} · <span className="font-mono">{pendingPayment.reference}</span>
            </p>
          )}
          {pendingPayment && (
            <button type="button" onClick={() => cancelRequest(pendingPayment.id)} disabled={busy} className="mt-3 text-sm font-semibold text-purple-800 underline underline-offset-4">
              <BusyLabel busy={busy} busyText={t.cancelling} tone="dark">{t.cancelRequest}</BusyLabel>
            </button>
          )}
        </div>
      );
    } else {
      content = (
        <>
          <button type="button" onClick={() => setPaying(true)} className={primary}>{t.buy(formatFCFA(doc.price))}</button>
          <p className="text-sm text-gray-600">{t.quotaUsed(quota.limit)}</p>
        </>
      );
    }
  }

  return (
    <div className="space-y-3">
      {content}
      {preparing && <WaitingPanel steps={t.prepSteps} />}
      {message && (
        <p
          role={message.tone === 'error' ? 'alert' : 'status'}
          className={`text-sm ${message.tone === 'error' ? 'text-red-700' : 'text-gray-700'}`}
        >
          {message.text}
        </p>
      )}
      {paying && (
        <PaymentModal
          doc={doc}
          user={user}
          language={language}
          onClose={() => setPaying(false)}
          onSent={() => {
            setPaying(false);
            setMessage({ text: t.paySent, tone: 'success' });
            onChanged();
          }}
        />
      )}
    </div>
  );
};

const DocumentDetail = (props) => {
  const { language, user } = props;
  const t = TEXT[language];
  const { idOrSlug } = useParams();
  const [doc, setDoc] = useState(null);
  const [state, setState] = useState('loading'); // loading | ready | missing | error

  const load = useCallback(async () => {
    try {
      setDoc(await api(`/documents/${encodeURIComponent(idOrSlug)}`));
      setState('ready');
    } catch (e) {
      setState(e.status === 404 ? 'missing' : 'error');
    }
  }, [idOrSlug]);

  // Recharger aussi à la connexion / déconnexion : l'action dépend du compte
  useEffect(() => { load(); }, [load, user?.id]);

  const facts = doc ? [
    [t.category, categoryLabel(doc, language)],
    [t.level, doc.level],
    [t.subject, doc.subject],
    [t.year, doc.year],
    [t.language, t.languages[doc.language]],
    ['PDF', [doc.pages && t.pages(doc.pages), formatSize(doc.fileSize)].filter(Boolean).join(' · ')],
  ].filter(([, v]) => v) : [];

  return (
    <>
      {doc && (
        <Helmet>
          <title>{`${doc.title} | Nengoo`}</title>
          <meta name="description" content={(doc.description || doc.title).slice(0, 160)} />
          <link rel="canonical" href={`https://www.nengoo.com/documents/${doc.slug}`} />
        </Helmet>
      )}
      <div className="min-h-screen bg-gray-50 text-left">
        <Header {...props} />
        <main className="container mx-auto px-4 pt-6 sm:pt-10 pb-14">
          <Link to="/documents" className="text-sm font-semibold text-purple-700 hover:text-purple-900 hover:underline underline-offset-4">
            ← {t.back}
          </Link>

          {state === 'loading' && <div className="mt-6 h-96 rounded-2xl loading-shimmer" aria-label="Chargement" />}
          {(state === 'missing' || state === 'error') && (
            <div className="mt-6 p-6 bg-white rounded-xl border border-gray-200" role="alert">
              <p className="text-gray-800">{state === 'missing' ? t.notFound : t.loadError}</p>
              {state === 'error' && <button type="button" onClick={load} className="mt-3 font-semibold text-purple-800 underline underline-offset-4">{t.retry}</button>}
            </div>
          )}

          {state === 'ready' && doc && (
            <div className="mt-6 grid gap-8 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
              <div>
                <div className="aspect-[3/4] rounded-2xl overflow-hidden shadow-sm">
                  <DocumentCover doc={doc} language={language} large />
                </div>
                {doc.previewUrl && (
                  <a href={doc.previewUrl} target="_blank" rel="noopener noreferrer" className={`${secondary} mt-4 w-full`}>
                    {t.preview}
                  </a>
                )}
                {doc.previewPages > 0 && <p className="mt-2 text-xs text-center text-gray-600">{t.previewPages(doc.previewPages)}</p>}
              </div>

              <div>
                <p className="text-sm font-semibold text-purple-700">{categoryLabel(doc, language)}</p>
                <h1 className="mt-1 font-display text-3xl sm:text-4xl text-purple-950 leading-tight">{doc.title}</h1>
                <p className={`price mt-3 text-2xl ${doc.isFree ? 'text-emerald-700' : 'text-purple-800'}`}>
                  {doc.isFree ? t.free : formatFCFA(doc.price)}
                </p>

                <div className="mt-5 p-5 bg-white rounded-2xl border border-gray-200">
                  <ActionPanel doc={doc} user={user} language={language} onChanged={load} />
                  {!doc.isFree && <p className="mt-4 text-xs text-gray-500">{t.noRefund}</p>}
                </div>

                {doc.description && (
                  <p className="mt-6 text-gray-800 leading-relaxed whitespace-pre-line">{doc.description}</p>
                )}

                <h2 className="mt-8 text-lg font-bold">{t.details}</h2>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                  {facts.map(([label, value]) => (
                    <React.Fragment key={label}>
                      <dt className="text-gray-600">{label}</dt>
                      <dd className="text-gray-900 font-medium">{value}</dd>
                    </React.Fragment>
                  ))}
                </dl>
                {doc.downloads > 0 && <p className="mt-4 text-sm text-gray-600">{t.downloads(doc.downloads)}</p>}
              </div>
            </div>
          )}
        </main>
        <Footer language={language} />
      </div>
    </>
  );
};

export default DocumentDetail;

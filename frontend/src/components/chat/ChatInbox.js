import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import SupportChat from '../support/SupportChat';
import { announceChatRead, chatApi } from '../../lib/chat';
import { usePolling } from '../../lib/support';
import { numberFormat } from '../../lib/numberFormat';

const formatPrice = (price) =>
  numberFormat('fr-FR', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(price);

// Le serveur renvoie des dates UTC sans fuseau
const parseDate = (value) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);

const shortDate = (value) => {
  if (!value) return '';
  const date = parseDate(value);
  const today = new Date();
  return date.toDateString() === today.toDateString()
    ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

const REASONS = [
  ['spam', 'Publicité ou messages en masse'],
  ['fraud', 'Arnaque ou demande de paiement suspecte'],
  ['abuse', 'Propos insultants ou harcèlement'],
  ['other', 'Autre raison'],
];

/** Carte du produit dont parle un message. */
const ProductCard = ({ product, own }) => (
  <Link
    to={`/product/${product.slug || product.id}`}
    className={`mb-2 flex items-center gap-3 rounded-xl p-2 ${own ? 'bg-white/15 hover:bg-white/25' : 'bg-gray-50 hover:bg-gray-100'}`}
  >
    {product.image
      ? <img src={product.image} alt="" className="h-12 w-12 rounded-lg object-cover bg-white" loading="lazy" />
      : <span className="h-12 w-12 rounded-lg bg-white/40" aria-hidden="true" />}
    <span className="min-w-0">
      <span className="block truncate text-sm font-semibold">{product.name}</span>
      {product.price != null && <span className="block text-sm">{formatPrice(product.price)}</span>}
    </span>
  </Link>
);

const Avatar = ({ name, logo }) => (
  logo
    ? <img src={logo} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover bg-purple-50" />
    : <span className="h-11 w-11 shrink-0 rounded-full bg-purple-100 text-purple-800 font-bold grid place-items-center" aria-hidden="true">
        {(name || '?').trim().charAt(0).toUpperCase()}
      </span>
);

/**
 * Messagerie d'un acheteur (onglet « Mes messages » du profil) ou d'un vendeur
 * (espace vendeur) : liste des conversations et conversation ouverte.
 * La conversation ouverte est dans l'URL (?thread=…), comme les liens des
 * notifications.
 */
const ChatInbox = ({ user, emptyText }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('thread');
  const [threads, setThreads] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [listError, setListError] = useState('');
  const [current, setCurrent] = useState(null); // { thread, messages }
  const [threadError, setThreadError] = useState('');
  const [reporting, setReporting] = useState(false);
  const [notice, setNotice] = useState('');

  const loadThreads = useCallback(async () => {
    try {
      setThreads(await chatApi.threads());
      setListError('');
    } catch (err) {
      setListError(err.message);
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  const loadThread = useCallback(async () => {
    if (!selectedId) return;
    try {
      const data = await chatApi.open(selectedId);
      setCurrent(data);
      setThreadError('');
      // Lu : la liste et les compteurs se mettent à jour
      setThreads(list => list.map(t => (t.id === selectedId ? { ...t, unread: 0 } : t)));
      announceChatRead();
    } catch (err) {
      setThreadError(err.message);
    }
  }, [selectedId]);

  useEffect(() => { if (user) loadThreads(); }, [user, loadThreads]);
  useEffect(() => {
    setCurrent(null);
    setThreadError('');
    setNotice('');
    loadThread();
  }, [loadThread]);
  usePolling(loadThreads, 30000, Boolean(user));
  usePolling(loadThread, 10000, Boolean(user && selectedId));

  const select = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set('thread', id); else next.delete('thread');
    setSearchParams(next);
  };

  const send = async (body) => {
    const message = await chatApi.send(selectedId, body);
    setCurrent(c => ({ ...c, messages: [...c.messages, message] }));
    loadThreads();
  };

  const toggleBlock = async () => {
    const blocked = !current.thread.blockedByMe;
    if (blocked && !window.confirm(`Bloquer la conversation avec ${current.thread.otherName} ? Plus personne ne pourra y écrire.`)) return;
    try {
      const thread = await chatApi.block(selectedId, blocked);
      setCurrent(c => ({ ...c, thread }));
      setNotice(blocked ? 'Conversation bloquée.' : 'Conversation débloquée.');
    } catch (err) {
      setNotice(err.message);
    }
  };

  const submitReport = async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    try {
      const result = await chatApi.report(selectedId, form.get('reason'), form.get('details'));
      setReporting(false);
      setNotice(result.message);
    } catch (err) {
      setNotice(err.message);
    }
  };

  const thread = current?.thread;
  const isSeller = user?.type === 'seller';
  const disabledText = thread?.blockedByMe
    ? 'Vous avez bloqué cette conversation.'
    : thread?.blockedByOther ? "Cette conversation n'accepte plus de messages." : null;

  return (
    <div className="adm-card overflow-hidden md:grid md:grid-cols-[minmax(16rem,1fr)_2fr] md:h-[36rem]">
      {/* Liste : seule visible sur mobile tant qu'aucune conversation n'est ouverte */}
      <nav aria-label="Conversations" className={`${selectedId ? 'hidden md:block' : 'block'} md:border-r border-gray-200 overflow-y-auto`}>
        {loadingThreads ? (
          <p className="px-5 py-12 text-center text-gray-600">Chargement des conversations…</p>
        ) : listError ? (
          <p role="alert" className="px-5 py-12 text-center text-red-700">{listError}</p>
        ) : threads.length === 0 ? (
          <p className="px-5 py-12 text-center text-gray-600">{emptyText}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {threads.map(t => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => select(t.id)}
                  aria-current={t.id === selectedId ? 'true' : undefined}
                  className={`w-full text-left px-4 py-3 flex gap-3 items-center hover:bg-gray-50 focus-visible:bg-gray-50 ${t.id === selectedId ? 'bg-purple-50' : ''}`}
                >
                  <Avatar name={t.otherName} logo={t.otherLogo} />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate ${t.unread ? 'font-bold text-purple-950' : 'font-semibold'}`}>{t.otherName}</span>
                      <span className="shrink-0 text-xs text-gray-500">{shortDate(t.lastMessageAt)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={`flex-1 truncate text-sm ${t.unread ? 'text-gray-900' : 'text-gray-600'}`}>
                        {(t.lastSenderType === user?.type ? 'Vous : ' : '') + t.lastMessagePreview}
                      </span>
                      {t.unread > 0 && (
                        <span className="shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full bg-purple-700 text-white text-xs font-bold grid place-items-center">
                          <span className="sr-only">Non lus : </span>{t.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <section className={`${selectedId ? 'flex' : 'hidden md:flex'} flex-col min-h-[30rem] md:min-h-0`} aria-label="Conversation">
        {!selectedId ? (
          <p className="m-auto px-6 text-center text-gray-600">Choisissez une conversation.</p>
        ) : threadError && !current ? (
          <div className="m-auto px-6 text-center">
            <p role="alert" className="text-red-700">{threadError}</p>
            <button type="button" onClick={() => select(null)} className="mt-3 adm-link">Retour aux conversations</button>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-gray-200 px-3 py-2">
              <button type="button" onClick={() => select(null)} className="md:hidden h-11 w-11 grid place-items-center rounded-full hover:bg-gray-100" aria-label="Retour aux conversations">
                <span aria-hidden="true">←</span>
              </button>
              {thread && <Avatar name={thread.otherName} logo={thread.otherLogo} />}
              <h3 className="flex-1 min-w-0 truncate font-bold text-purple-950">
                {thread ? (isSeller ? thread.otherName : <Link to={`/seller/${thread.sellerId}`} className="hover:underline">{thread.otherName}</Link>) : '…'}
              </h3>
              {thread && (
                <div className="flex gap-1">
                  <button type="button" onClick={() => setReporting(r => !r)} className="h-11 px-3 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-100" aria-expanded={reporting}>
                    Signaler
                  </button>
                  <button type="button" onClick={toggleBlock} className="h-11 px-3 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-100">
                    {thread.blockedByMe ? 'Débloquer' : 'Bloquer'}
                  </button>
                </div>
              )}
            </header>
            {notice && <p role="status" className="px-4 py-2 text-sm bg-purple-50 text-purple-900">{notice}</p>}
            {reporting && (
              <form onSubmit={submitReport} className="px-4 py-3 border-b border-gray-200 bg-gray-50 space-y-2">
                <fieldset>
                  <legend className="font-semibold text-sm mb-1">Pourquoi signalez-vous cette conversation ?</legend>
                  {REASONS.map(([value, label], i) => (
                    <label key={value} className="flex items-center gap-2 text-sm py-1">
                      <input type="radio" name="reason" value={value} defaultChecked={i === 0} /> {label}
                    </label>
                  ))}
                </fieldset>
                <label className="block text-sm">
                  <span className="font-semibold">Précisions (facultatif)</span>
                  <textarea name="details" rows={2} maxLength={1000} className="adm-input mt-1" />
                </label>
                <p className="text-xs text-gray-600">L'équipe Nengoo pourra lire cette conversation pour traiter le signalement.</p>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setReporting(false)} className="adm-btn adm-btn-secondary">Annuler</button>
                  <button type="submit" className="adm-btn adm-btn-primary">Envoyer le signalement</button>
                </div>
              </form>
            )}
            <SupportChat
              className="flex-1 min-h-0"
              messages={current?.messages || []}
              mine={(m) => m.senderType === user?.type}
              loading={!current}
              error={threadError}
              onSend={send}
              disabledText={disabledText}
              renderExtra={(m, own) => (m.product ? <ProductCard product={m.product} own={own} /> : null)}
              emptyText="Aucun message pour l'instant."
            />
          </>
        )}
      </section>
    </div>
  );
};

export default ChatInbox;

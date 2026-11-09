import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SectionHeader, Modal } from './AdminUI';
import SupportChat from '../support/SupportChat';
import { announceSupportRead, API_BASE_URL, errorText, usePolling } from '../../lib/support';

const FILTERS = [
  { id: 'all', label: 'Toutes' },
  { id: 'unread', label: 'Non lues' },
  { id: 'seller', label: 'Vendeurs' },
  { id: 'buyer', label: 'Acheteurs' },
];

const TYPE_LABEL = { seller: 'Vendeur', buyer: 'Acheteur' };

const parseDate = (value) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);

const shortDate = (value) => {
  if (!value) return '';
  const date = parseDate(value);
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

const threadKey = (type, id) => `${type}:${id}`;

// Choix du destinataire d'un nouveau message : vendeurs et acheteurs
const RecipientPicker = ({ onPick, onClose }) => {
  const [accounts, setAccounts] = useState(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sellersRes, buyersRes] = await Promise.all([
          fetch(`${API_BASE_URL}/sellers`),
          fetch(`${API_BASE_URL}/buyers`),
        ]);
        if (!sellersRes.ok || !buyersRes.ok) throw new Error();
        const sellers = (await sellersRes.json()).map(s => ({ type: 'seller', id: s.id, name: s.businessName || s.name, whatsapp: s.whatsapp }));
        const buyers = (await buyersRes.json()).map(b => ({ type: 'buyer', id: b.id, name: b.name, whatsapp: b.whatsapp }));
        if (!cancelled) setAccounts([...sellers, ...buyers]);
      } catch {
        if (!cancelled) setError('Impossible de charger les comptes. Réessayez.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = accounts || [];
    return (q ? list.filter(a => `${a.name} ${a.whatsapp}`.toLowerCase().includes(q)) : list).slice(0, 50);
  }, [accounts, query]);

  return (
    <Modal title="Nouveau message" onClose={onClose} size="max-w-lg">
      <input
        type="search"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Nom de la boutique, de l'acheteur ou numéro"
        aria-label="Rechercher un compte"
        className="adm-input w-full"
      />
      <div className="mt-3 max-h-[50vh] overflow-y-auto">
        {error ? <p role="alert" className="py-6 text-center text-red-700">{error}</p>
          : !accounts ? <p className="py-6 text-center text-gray-600">Chargement des comptes…</p>
          : matches.length === 0 ? <p className="py-6 text-center text-gray-600">Aucun compte ne correspond.</p>
          : (
            <ul className="divide-y divide-gray-100">
              {matches.map(a => (
                <li key={threadKey(a.type, a.id)}>
                  <button type="button" onClick={() => onPick(a)} className="w-full text-left px-2 py-3 flex items-center gap-3 hover:bg-gray-50 rounded-lg">
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold truncate">{a.name || a.id}</span>
                      <span className="block text-sm text-gray-600">{a.whatsapp}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">{TYPE_LABEL[a.type]}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
      </div>
    </Modal>
  );
};

/** Messagerie de l'équipe avec les vendeurs et les acheteurs. */
const SupportInbox = ({ user, active }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [threads, setThreads] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [picking, setPicking] = useState(false);

  // Conversation ouverte, dans l'URL (?to=seller:s1) : lien direct depuis les fiches comptes
  const selected = useMemo(() => {
    const [type, ...rest] = (searchParams.get('to') || '').split(':');
    const id = rest.join(':');
    return (type === 'seller' || type === 'buyer') && id ? { type, id } : null;
  }, [searchParams]);
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [threadError, setThreadError] = useState('');

  const open = (type, id) => {
    const next = new URLSearchParams(searchParams);
    if (type) next.set('to', threadKey(type, id)); else next.delete('to');
    setSearchParams(next);
  };

  const loadThreads = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter === 'unread') params.set('unread', 'true');
    if (filter === 'seller' || filter === 'buyer') params.set('type', filter);
    if (query.trim()) params.set('q', query.trim());
    try {
      const response = await fetch(`${API_BASE_URL}/admin/support/threads?${params}`);
      if (!response.ok) throw new Error(await errorText(response, 'Impossible de charger les conversations.'));
      setThreads(await response.json());
      setListError('');
    } catch (err) {
      setListError(err.message);
    } finally {
      setLoadingList(false);
    }
  }, [filter, query]);

  const loadThread = useCallback(async (quiet = false) => {
    if (!selected) return;
    if (!quiet) setLoadingThread(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/support/threads/${selected.type}/${encodeURIComponent(selected.id)}`);
      if (!response.ok) throw new Error(await errorText(response, 'Impossible de charger la conversation.'));
      const data = await response.json();
      setThread(data.thread);
      setMessages(data.messages);
      setThreadError('');
      // Ouvrir le fil l'a marqué comme lu
      setThreads(list => list.map(t => (t.id === data.thread.id ? { ...t, unreadByAdmin: 0 } : t)));
      announceSupportRead();
    } catch (err) {
      setThreadError(err.message);
    } finally {
      setLoadingThread(false);
    }
  }, [selected]);

  // Recherche : on attend la fin de la frappe
  useEffect(() => {
    if (!active) return undefined;
    const timer = setTimeout(loadThreads, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadThreads, query, active]);

  useEffect(() => {
    setThread(null);
    setMessages([]);
    if (active) loadThread();
  }, [loadThread, active]);

  usePolling(loadThreads, 20000, active);
  const pollThread = useCallback(() => loadThread(true), [loadThread]);
  usePolling(pollThread, 10000, active && Boolean(selected));

  const send = async (body) => {
    const response = await fetch(`${API_BASE_URL}/admin/support/threads/${selected.type}/${encodeURIComponent(selected.id)}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    });
    if (!response.ok) throw new Error(await errorText(response, "Le message n'est pas parti. Réessayez."));
    const message = await response.json();
    setMessages(current => [...current, message]);
    loadThreads();
  };

  const totalUnread = threads.filter(t => t.unreadByAdmin > 0).length;

  return (
    <div>
      <SectionHeader
        title="Messagerie"
        description="Les conversations de l'équipe avec les vendeurs et les acheteurs. Chaque compte a une seule conversation."
        actions={<button type="button" onClick={() => setPicking(true)} className="adm-btn adm-btn-primary">Nouveau message</button>}
      />

      <div className="adm-card overflow-hidden grid lg:grid-cols-[22rem_minmax(0,1fr)] min-h-[34rem]">
        {/* Liste : masquée sur mobile quand une conversation est ouverte */}
        <section aria-label="Conversations" className={`border-r border-gray-200 flex flex-col ${selected ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-3 space-y-2 border-b border-gray-200">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un nom ou un numéro"
              aria-label="Rechercher une conversation"
              className="adm-input w-full"
            />
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrer les conversations">
              {FILTERS.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  aria-pressed={filter === f.id}
                  className={`!min-h-0 h-8 px-3 rounded-full text-sm font-semibold ${filter === f.id ? 'bg-purple-700 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {f.label}{f.id === 'unread' && totalUnread > 0 && filter !== 'unread' ? ` (${totalUnread})` : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[40rem]">
            {loadingList ? <p className="p-6 text-center text-gray-600">Chargement…</p>
              : listError ? <p role="alert" className="p-6 text-center text-red-700">{listError}</p>
              : threads.length === 0 ? (
                <p className="p-6 text-center text-gray-600">
                  {filter === 'all' && !query ? 'Aucune conversation pour le moment. Écrivez à un vendeur ou un acheteur avec « Nouveau message ».' : 'Aucune conversation ne correspond.'}
                </p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {threads.map(t => {
                    const isOpen = selected && threadKey(selected.type, selected.id) === threadKey(t.userType, t.userId);
                    const unread = t.unreadByAdmin > 0;
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => open(t.userType, t.userId)}
                          aria-current={isOpen ? 'true' : undefined}
                          className={`w-full text-left px-4 py-3 flex gap-3 ${isOpen ? 'bg-purple-50' : 'hover:bg-gray-50'}`}
                        >
                          <span className={`mt-2 w-2.5 h-2.5 shrink-0 rounded-full ${unread ? 'bg-purple-700' : 'bg-transparent'}`} aria-hidden="true" />
                          <span className="flex-1 min-w-0">
                            <span className="flex items-baseline justify-between gap-2">
                              <span className={`truncate ${unread ? 'font-bold text-purple-950' : 'font-semibold'}`}>{t.userName}</span>
                              <span className="shrink-0 text-xs text-gray-500">{shortDate(t.lastMessageAt)}</span>
                            </span>
                            <span className="block text-xs text-gray-500">{TYPE_LABEL[t.userType]}{unread ? ` · ${t.unreadByAdmin} non lu${t.unreadByAdmin > 1 ? 's' : ''}` : ''}</span>
                            <span className="block mt-0.5 text-sm text-gray-700 truncate">
                              {t.lastSenderType === 'admin' && 'Vous : '}{t.lastMessagePreview}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
          </div>
        </section>

        <section aria-label="Conversation" className={`flex-col min-w-0 ${selected ? 'flex' : 'hidden lg:flex'}`}>
          {!selected ? (
            <p className="m-auto p-6 text-center text-gray-600 max-w-xs">Choisissez une conversation, ou écrivez à un compte avec « Nouveau message ».</p>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
                <button type="button" onClick={() => open(null)} className="lg:hidden adm-btn adm-btn-secondary !px-3" aria-label="Retour aux conversations">←</button>
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate">{thread?.userName || '…'}</p>
                  <p className="text-sm text-gray-600 truncate">
                    {TYPE_LABEL[selected.type]}{thread?.userWhatsapp ? ` · ${thread.userWhatsapp}` : ''}
                  </p>
                </div>
              </div>
              <SupportChat
                messages={messages}
                mine={(m) => m.senderType === 'admin'}
                loading={loadingThread}
                error={threadError}
                onSend={send}
                placeholder={`Message à ${thread?.userName || 'ce compte'}…`}
                emptyText="Aucun message encore. Le compte recevra votre message dans son espace et une notification."
                className="flex-1 min-h-[28rem]"
              />
            </>
          )}
        </section>
      </div>

      {picking && (
        <RecipientPicker
          onClose={() => setPicking(false)}
          onPick={(account) => {
            setPicking(false);
            open(account.type, account.id);
          }}
        />
      )}
    </div>
  );
};

export default SupportInbox;

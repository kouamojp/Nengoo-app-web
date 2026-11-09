import React, { useEffect, useRef, useState } from 'react';

const MAX_LENGTH = 2000; // comme le serveur (routers/support.py)

const dayLabel = (date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === yesterday.toDateString()) return 'Hier';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
};

// Le serveur renvoie des dates UTC sans fuseau
const parseDate = (value) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);

/**
 * Fil de messages et zone de saisie, partagés par l'administration, l'espace
 * vendeur et le profil acheteur. `mine(message)` dit si un message est du
 * côté de celui qui regarde (affiché à droite).
 */
const SupportChat = ({ messages, mine, loading, error, onSend, emptyText, placeholder = 'Votre message…', className = 'h-[28rem]' }) => {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const listRef = useRef(null);

  // Toujours sur le dernier message, comme une messagerie
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  const submit = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError('');
    try {
      await onSend(body);
      setDraft('');
    } catch (err) {
      setSendError(err.message || "Le message n'est pas parti. Réessayez.");
    } finally {
      setSending(false);
    }
  };

  // Ctrl+Entrée (ou Cmd+Entrée) envoie ; Entrée seule passe à la ligne
  const onKeyDown = (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) submit(event);
  };

  let lastDay = null;

  return (
    <div className={`flex flex-col ${className}`}>
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-gray-50" aria-live="polite" aria-busy={loading}>
        {loading && messages.length === 0 ? (
          <p className="py-10 text-center text-gray-600">Chargement des messages…</p>
        ) : error && messages.length === 0 ? (
          <p role="alert" className="py-10 text-center text-red-700">{error}</p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-gray-600 max-w-sm mx-auto">{emptyText}</p>
        ) : messages.map(message => {
          const date = parseDate(message.createdAt);
          const day = dayLabel(date);
          const showDay = day !== lastDay;
          lastDay = day;
          const own = mine(message);
          return (
            <React.Fragment key={message.id}>
              {showDay && <p className="pt-2 text-center text-xs font-semibold text-gray-500 first-letter:uppercase">{day}</p>}
              <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2 ${own ? 'bg-purple-700 text-white rounded-br-md' : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'}`}>
                  {!own && <p className="text-xs font-bold text-purple-800 mb-0.5">{message.senderName}</p>}
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  <p className={`mt-1 text-right text-xs ${own ? 'text-purple-200' : 'text-gray-500'}`}>
                    {own && message.senderType === 'admin' && `${message.senderName} · `}
                    {date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <form onSubmit={submit} className="border-t border-gray-200 bg-white p-3">
        {sendError && <p role="alert" className="mb-2 text-sm text-red-700">{sendError}</p>}
        <div className="flex items-end gap-2">
          <label className="flex-1">
            <span className="sr-only">{placeholder}</span>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={placeholder}
              rows={2}
              maxLength={MAX_LENGTH}
              className="block w-full resize-y rounded-xl border border-gray-300 px-3 py-2 text-base focus:outline-none focus:border-purple-700 focus:ring-2 focus:ring-purple-200"
            />
          </label>
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="h-11 shrink-0 rounded-full bg-purple-700 px-5 font-semibold text-white hover:bg-purple-800 disabled:opacity-50"
          >
            {sending ? 'Envoi…' : 'Envoyer'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SupportChat;

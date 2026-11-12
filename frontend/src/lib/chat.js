import { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL, errorText, usePolling } from './support';

// Messagerie acheteur ↔ vendeur (backend/routers/chat.py). L'identité vient du
// seul jeton de session, ajouté par authFetch : aucun en-tête d'identité ici.

const json = { 'Content-Type': 'application/json' };

const call = async (path, options, fallback) => {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  if (!response.ok) throw new Error(await errorText(response, fallback));
  return response.json();
};

export const chatApi = {
  threads: () => call('/chat/threads', {}, 'Impossible de charger vos conversations.'),
  open: (id) => call(`/chat/threads/${encodeURIComponent(id)}`, {}, 'Impossible de charger la conversation.'),
  start: ({ sellerId, productId, body }) => call('/chat/threads', {
    method: 'POST', headers: json, body: JSON.stringify({ sellerId, productId, body }),
  }, "Le message n'est pas parti. Réessayez."),
  send: (id, body, productId) => call(`/chat/threads/${encodeURIComponent(id)}/messages`, {
    method: 'POST', headers: json, body: JSON.stringify({ body, productId }),
  }, "Le message n'est pas parti. Réessayez."),
  block: (id, blocked) => call(`/chat/threads/${encodeURIComponent(id)}/block`, {
    method: 'POST', headers: json, body: JSON.stringify({ blocked }),
  }, "L'action n'a pas abouti. Réessayez."),
  report: (id, reason, details) => call(`/chat/threads/${encodeURIComponent(id)}/report`, {
    method: 'POST', headers: json, body: JSON.stringify({ reason, details }),
  }, "Le signalement n'est pas parti. Réessayez."),
};

export const announceChatRead = () => window.dispatchEvent(new Event('nengoo:chat-read'));

/** Messages non lus de l'acheteur ou du vendeur connecté. */
export const useChatUnread = (user, delay = 60000) => {
  const [count, setCount] = useState(0);
  const enabled = Boolean(user && (user.type === 'seller' || user.type === 'buyer'));

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const response = await fetch(`${API_BASE_URL}/chat/unread-count`);
      if (response.ok) setCount((await response.json()).count || 0);
    } catch {
      // Compteur indicatif : on garde la dernière valeur
    }
  }, [enabled]);

  useEffect(() => { refresh(); }, [refresh]);
  usePolling(refresh, delay, enabled);
  useEffect(() => {
    window.addEventListener('nengoo:chat-read', refresh);
    return () => window.removeEventListener('nengoo:chat-read', refresh);
  }, [refresh]);

  return count;
};

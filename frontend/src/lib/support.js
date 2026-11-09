import { useCallback, useEffect, useState } from 'react';

// Messagerie avec l'équipe Nengoo (backend/routers/support.py). Le jeton de
// session est ajouté par authFetch ; les en-têtes d'identité servent quand le
// serveur fonctionne encore sans JWT (transition).
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

export const supportHeaders = (user) => {
  const headers = { 'Content-Type': 'application/json' };
  if (user?.type === 'seller') headers['X-Seller-Id'] = user.id;
  else if (user?.type === 'buyer') headers['X-Buyer-Id'] = user.id;
  return headers;
};

export const errorText = async (response, fallback) => {
  const data = await response.json().catch(() => null);
  const detail = data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg.replace(/^Value error, /, '');
  return fallback;
};

// Rafraîchit tant que l'onglet est visible ; reprend dès qu'on y revient
export const usePolling = (callback, delay, enabled = true) => {
  useEffect(() => {
    if (!enabled) return undefined;
    const tick = () => { if (document.visibilityState === 'visible') callback(); };
    const interval = setInterval(tick, delay);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [callback, delay, enabled]);
};

/** Nombre de réponses de l'équipe non lues (vendeur / acheteur), ou de fils en attente (admin). */
export const useSupportUnread = (user, delay = 60000) => {
  const [count, setCount] = useState(0);
  const isAdmin = user?.type === 'admin';
  const enabled = Boolean(user && (isAdmin || user.type === 'seller' || user.type === 'buyer'));

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const response = await fetch(`${API_BASE_URL}/${isAdmin ? 'admin/support' : 'support'}/unread-count`, {
        headers: supportHeaders(user),
      });
      if (response.ok) setCount((await response.json()).count || 0);
    } catch {
      // Compteur indicatif : on garde la dernière valeur
    }
  }, [enabled, isAdmin, user]);

  useEffect(() => { refresh(); }, [refresh]);
  usePolling(refresh, delay, enabled);
  // Une conversation ouverte remet le compteur à jour sans attendre
  useEffect(() => {
    window.addEventListener('nengoo:support-read', refresh);
    return () => window.removeEventListener('nengoo:support-read', refresh);
  }, [refresh]);

  return count;
};

export const announceSupportRead = () => window.dispatchEvent(new Event('nengoo:support-read'));

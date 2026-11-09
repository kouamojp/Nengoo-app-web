import React, { useCallback, useEffect, useState } from 'react';
import SupportChat from './SupportChat';
import { announceSupportRead, API_BASE_URL, errorText, supportHeaders, usePolling } from '../../lib/support';

/** Conversation d'un vendeur ou d'un acheteur avec l'équipe Nengoo. */
const UserSupportThread = ({ user, className }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_BASE_URL}/support/thread`, { headers: supportHeaders(user) });
      if (!response.ok) throw new Error(await errorText(response, 'Impossible de charger la conversation.'));
      const data = await response.json();
      setMessages(data.messages);
      setError('');
      announceSupportRead();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);
  usePolling(load, 15000);

  const send = async (body) => {
    const response = await fetch(`${API_BASE_URL}/support/messages`, {
      method: 'POST',
      headers: supportHeaders(user),
      body: JSON.stringify({ body }),
    });
    if (!response.ok) throw new Error(await errorText(response, "Le message n'est pas parti. Réessayez."));
    const message = await response.json();
    setMessages(current => [...current, message]);
  };

  return (
    <SupportChat
      messages={messages}
      mine={(message) => message.senderType !== 'admin'}
      loading={loading}
      error={error}
      onSend={send}
      className={className}
      emptyText="Une question sur votre compte, une commande ou un paiement ? Écrivez-nous ici : l'équipe Nengoo vous répond dans cette conversation."
    />
  );
};

export default UserSupportThread;

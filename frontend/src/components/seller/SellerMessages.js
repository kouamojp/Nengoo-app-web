import React, { useState, useEffect } from 'react';
import SellerHeader from './SellerHeader';
import { Modal } from '../admin/AdminUI';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const SellerMessages = (props) => {
  const { user } = props;
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const fetchConversations = async () => {
    if (user) {
      try {
        setLoadingConversations(true);
        const response = await fetch(`${API_BASE_URL}/conversations`, {
          headers: {
            'user_id': user.id,
            'user_type': user.type,
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch conversations');
        }
        const data = await response.json();
        setConversations(data);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoadingConversations(false);
      }
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [user]);

  const handleConversationClick = async (conversation) => {
    setSelectedConversation(conversation);
    setLoadingMessages(true);
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${conversation.id}/messages`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (reply.trim() && selectedConversation) {
      try {
        const response = await fetch(`${API_BASE_URL}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'sender_id': user.id,
            'sender_type': user.type,
          },
          body: JSON.stringify({
            receiver_id: selectedConversation.buyer_id,
            message: reply,
            product_id: selectedConversation.product_id,
          }),
        });
        if (!response.ok) {
          throw new Error('Failed to send reply');
        }
        const newMessage = await response.json();
        setMessages([...messages, newMessage]);
        setReply('');
        // Refresh conversations to show the latest message preview
        fetchConversations();
      } catch (error) {
        console.error('Error sending reply:', error);
        alert(`Erreur: ${error.message}`);
      }
    }
  };

  const unreadCount = conversations.filter(c => c.seller_unread).length;

  return (
    <div>
      <SellerHeader
        title="Messages"
        description={unreadCount > 0
          ? `${unreadCount} conversation${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
          : 'Les questions de vos clients sur vos produits.'}
      />

      {loadingConversations ? (
        <p className="adm-card px-5 py-12 text-center text-gray-600">Chargement des conversations…</p>
      ) : conversations.length === 0 ? (
        <div className="adm-card px-5 py-12 text-center">
          <h2 className="text-lg font-extrabold text-purple-950">Aucune conversation</h2>
          <p className="mt-1 text-gray-600">Quand un client vous écrit depuis une fiche produit, son message arrive ici.</p>
        </div>
      ) : (
        <ul className="adm-card divide-y divide-gray-100 overflow-hidden">
          {conversations.map(conversation => (
            <li key={conversation.id}>
              <button
                type="button"
                onClick={() => handleConversationClick(conversation)}
                className="w-full text-left px-5 py-4 flex gap-4 hover:bg-gray-50 focus-visible:bg-gray-50"
              >
                <span className={`mt-2 w-2.5 h-2.5 shrink-0 rounded-full ${conversation.seller_unread ? 'bg-purple-700' : 'bg-transparent'}`}
                      aria-label={conversation.seller_unread ? 'Non lu' : undefined} />
                <span className="flex-1 min-w-0">
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className={`truncate ${conversation.seller_unread ? 'font-bold text-purple-950' : 'font-semibold'}`}>
                      {conversation.buyer_id}
                    </span>
                    <span className="text-xs text-gray-500">{new Date(conversation.last_message_timestamp).toLocaleString('fr-FR')}</span>
                  </span>
                  <span className="block text-xs text-gray-500">Produit {conversation.product_id}</span>
                  <span className="block mt-1 text-sm text-gray-700 line-clamp-2">{conversation.last_message_preview}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedConversation && (
        <Modal title={`Conversation avec ${selectedConversation.buyer_id}`} onClose={() => setSelectedConversation(null)}>
          <p className="-mt-3 mb-4 text-sm text-gray-600">Produit {selectedConversation.product_id}</p>
          <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-1" aria-live="polite">
            {loadingMessages ? <p className="text-gray-600">Chargement des messages…</p> : messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender_type === 'seller' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${msg.sender_type === 'seller' ? 'bg-purple-700 text-white' : 'bg-gray-100 text-gray-900'}`}>
                  <p className="whitespace-pre-wrap">{msg.message}</p>
                  <p className={`text-xs mt-1 text-right ${msg.sender_type === 'seller' ? 'text-purple-200' : 'text-gray-500'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={sendReply} className="mt-4 flex items-end gap-3">
            <label className="flex-1">
              <span className="sr-only">Votre réponse</span>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Votre réponse…"
                rows={2}
                required
                className="adm-input"
              />
            </label>
            <button type="submit" className="adm-btn adm-btn-primary">Envoyer</button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default SellerMessages;

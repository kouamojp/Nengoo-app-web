import React, { useState, useEffect } from 'react';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import SellerSidebar from './SellerSidebar';
import SellerHeader from './SellerHeader';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const SellerMessages = (props) => {
  const { language, user } = props;
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
    <div className="min-h-screen bg-gray-50">
      <Header {...props} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <SellerSidebar currentPage="messages" language={language} user={user} />
          </div>
          
          <div className="lg:col-span-3">
            <SellerHeader title="Messages et Communications" language={language} user={user} />
            
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Centre de Messages</h2>
                  <p className="text-gray-600">
                    {conversations.length} conversation(s) totale(s), {unreadCount} non lu(s)
                  </p>
                </div>
                {unreadCount > 0 && (
                  <div className="bg-red-100 text-red-800 px-4 py-2 rounded-full font-semibold">
                    {unreadCount} nouveau(x)
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {loadingConversations ? <p>Chargement des conversations...</p> : conversations.map(conversation => (
                <div 
                  key={conversation.id} 
                  className={`bg-white rounded-lg shadow-lg p-6 cursor-pointer transition-all hover:shadow-xl ${
                    conversation.seller_unread ? 'border-l-4 border-purple-500' : ''
                  }`}
                  onClick={() => handleConversationClick(conversation)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="font-bold text-lg">{conversation.buyer_id}</h3>
                        <p className="text-gray-600">Produit: {conversation.product_id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{new Date(conversation.last_message_timestamp).toLocaleString()}</p>
                      {conversation.seller_unread && (
                        <span className="inline-block w-3 h-3 bg-red-500 rounded-full mt-2"></span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-700 line-clamp-2">{conversation.last_message_preview}</p>
                </div>
              ))}
            </div>

            {conversations.length === 0 && !loadingConversations && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-xl font-semibold mb-2">Aucune conversation</h3>
                <p className="text-gray-600">Vous n'avez pas encore de conversations.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Conversation avec {selectedConversation.buyer_id}</h3>
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-gray-600 mt-2">À propos du produit: {selectedConversation.product_id}</p>
            </div>
            
            <div className="p-6 flex-grow overflow-y-auto">
              {loadingMessages ? <p>Chargement des messages...</p> : messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender_type === 'seller' ? 'justify-end' : 'justify-start'} mb-4`}>
                  <div className={`rounded-lg px-4 py-2 ${msg.sender_type === 'seller' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
                    <p>{msg.message}</p>
                    <p className="text-xs mt-1 text-right">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-6 border-t">
              <form onSubmit={sendReply}>
                <div className="flex items-center">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Tapez votre réponse ici..."
                    rows={1}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="submit"
                    className="ml-4 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                  >
                    Envoyer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      
      <Footer language={language} />
    </div>
  );
};

export default SellerMessages;

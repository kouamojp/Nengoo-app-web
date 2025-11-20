
import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import SellerSidebar from './SellerSidebar';
import SellerHeader from './SellerHeader';
import { getSellerMessages, markMessageAsRead, replyToMessage } from '../services/api';

// Seller Messages Component
export const SellerMessages = (props) => {
  const { language } = props;
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const data = await getSellerMessages();
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (messageId) => {
    try {
      await markMessageAsRead(messageId);
      setMessages(messages.map(msg =>
        msg.id === messageId ? { ...msg, read: true } : msg
      ));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (reply.trim() && selectedMessage) {
      try {
        await replyToMessage(selectedMessage.id, { message: reply });
        alert('Réponse envoyée avec succès!');
        setReply('');
        setSelectedMessage(null);
        loadMessages(); // Reload messages
      } catch (error) {
        console.error('Error sending reply:', error);
        alert('Erreur lors de l\'envoi de la réponse');
      }
    }
  };

  const unreadCount = messages.filter(msg => !msg.read).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header {...props} />
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <SellerSidebar currentPage="messages" language={language} />
          </div>
          
          {/* Main Content */}
          <div className="lg:col-span-3">
            <SellerHeader title="Messages et Communications" language={language} />
            
            {/* Messages Overview */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Centre de Messages</h2>
                  <p className="text-gray-600">
                    {messages.length} message(s) total, {unreadCount} non lu(s)
                  </p>
                </div>
                {unreadCount > 0 && (
                  <div className="bg-red-100 text-red-800 px-4 py-2 rounded-full font-semibold">
                    {unreadCount} nouveau(x)
                  </div>
                )}
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">⏳</div>
                <p className="text-gray-600">Chargement des messages...</p>
              </div>
            ) : (
              <>
                {/* Messages List */}
                <div className="space-y-4">
                  {messages.map(message => (
                <div 
                  key={message.id} 
                  className={`bg-white rounded-lg shadow-lg p-6 cursor-pointer transition-all hover:shadow-xl ${
                    !message.read ? 'border-l-4 border-purple-500' : ''
                  }`}
                  onClick={() => {
                    setSelectedMessage(message);
                    markAsRead(message.id);
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        {message.senderName.split(' ').map(name => name[0]).join('')}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{message.senderName}</h3>
                        <p className="text-gray-600">{message.subject}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {new Date(message.createdDate).toLocaleDateString('fr-FR')}
                      </p>
                      {!message.read && (
                        <span className="inline-block w-3 h-3 bg-red-500 rounded-full mt-2"></span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-700 line-clamp-2">{message.message}</p>
                  
                  <div className="mt-4 flex space-x-2">
                    <button 
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMessage(message);
                        markAsRead(message.id);
                      }}
                    >
                      Répondre
                    </button>
                    <button className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                      Marquer comme lu
                    </button>
                  </div>
                </div>
              ))}
            </div>

                {messages.length === 0 && (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">💬</div>
                    <h3 className="text-xl font-semibold mb-2">Aucun message</h3>
                    <p className="text-gray-600">Vous n'avez pas encore reçu de messages.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Reply Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Répondre à {selectedMessage.senderName}</h3>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-gray-600 mt-2">Sujet: {selectedMessage.subject}</p>
            </div>
            
            <div className="p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-600 mb-2">Message original:</p>
                <p className="text-gray-800">{selectedMessage.message}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(selectedMessage.createdDate).toLocaleDateString('fr-FR')}
                </p>
              </div>
              
              <form onSubmit={sendReply}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Votre réponse:</label>
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Tapez votre réponse ici..."
                    rows={6}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div className="flex space-x-4">
                  <button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Envoyer la Réponse
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedMessage(null)}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    Annuler
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

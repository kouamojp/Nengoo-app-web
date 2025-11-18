
import React from 'react';
import { Link } from 'react-router-dom';
import { translations, openWhatsApp } from './common';
import Header from './Header';
import Footer from './Footer';

// Pending Approval Component
export const PendingApproval = (props) => {
  const { language } = props;
  const t = translations[language];
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header {...props} />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-6">⏳</div>
            
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
              {t.pendingApproval}
            </h1>
            
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-6 text-left">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-2xl">📢</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    {t.approvalMessage}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold mb-4">Prochaines étapes :</h3>
              <div className="space-y-3 text-left">
                <div className="flex items-center">
                  <span className="text-green-500 mr-3">✅</span>
                  <span className="text-sm">Votre demande a été reçue</span>
                </div>
                <div className="flex items-center">
                  <span className="text-yellow-500 mr-3">⏳</span>
                  <span className="text-sm">Vérification en cours par notre équipe</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-400 mr-3">📱</span>
                  <span className="text-sm text-gray-600">Confirmation par WhatsApp (en attente)</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-400 mr-3">🏪</span>
                  <span className="text-sm text-gray-600">Accès à votre espace vendeur (en attente)</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600">
                <strong>Temps de traitement :</strong> 24-48 heures ouvrables
              </p>
              
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center">
                <Link
                  to="/"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  {t.backToHome}
                </Link>
                <button
                  onClick={() => openWhatsApp("+237655123456", "Bonjour, je voudrais avoir des nouvelles concernant ma demande d'inscription vendeur sur Nengoo.")}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                >
                  <span>📱</span>
                  <span>Contacter le Support</span>
                </button>
              </div>
            </div>

            <div className="mt-8 text-xs text-gray-500">
              <p>Référence de demande : #{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
            </div>
          </div>
        </div>
      </div>
      
      <Footer language={language} />
    </div>
  );
};

export default PendingApproval;


import React from 'react';
import { translations } from '../../lib/translations';
import { Link, useNavigate } from 'react-router-dom';

const SellerSidebar = ({ onNavigate, currentPage, language, user, setUser }) => {
  const menuItems = [
    { key: 'dashboard', icon: '📊', label: 'Tableau de Bord' },
    { key: 'products', icon: '📦', label: 'Produits' },
    { key: 'orders', icon: '📋', label: 'Commandes' },
    { key: 'analytics', icon: '📈', label: 'Analyses' },
    { key: 'messages', icon: '💬', label: 'Messages' },
    { key: 'profile', icon: '⚙️', label: 'Profil & Livraison' }
  ];
  const t = translations[language];
  const navigate = useNavigate();

  const sellerName = user?.businessName || 'Vendeur';
  const logoUrl = user?.logoUrl;
  const initial = sellerName.charAt(0).toUpperCase();

  const renderAvatar = () => {
    if (logoUrl) {
      return (
        <img
          src={logoUrl}
          alt="Logo"
          className="w-12 h-12 rounded-full mr-3 object-cover"
        />
      );
    }
    return (
      <div className="w-12 h-12 rounded-full mr-3 bg-purple-600 flex items-center justify-center text-white text-xl font-bold">
        {initial}
      </div>
    );
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 sticky top-24">
      <div className="flex items-center mb-8">
        {renderAvatar()}
        <div>
          <h3 className="font-bold">{sellerName}</h3>
        </div>
      </div>
      
      <nav className="space-y-2">
        {menuItems.map(item => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
              currentPage === item.key 
                ? 'bg-purple-100 text-purple-700 font-semibold' 
                : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      
      <div className="mt-8 pt-6 border-t">
        <a
          href="/"
          className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
        >
          <span className="text-xl">🏠</span>
          <span>Retour au Site</span>
        </a>
      </div>
      <div className="border-t border-gray-200 my-2">
          <button
          onClick={() => {
                setUser(null);
                localStorage.removeItem('nengoo-user');
                navigate('/'); // Redirect to home page
              }}
              className=" flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
        >
          <span className="text-xl">🔌</span>
          <span>{t.logout}</span>
          </button>
      </div>
    </div>
  );
};

export default SellerSidebar;


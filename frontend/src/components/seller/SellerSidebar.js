
import React from 'react';
import { Link } from 'react-router-dom';

const SellerSidebar = ({ currentPage, language, user }) => {
  const menuItems = [
    { key: 'dashboard', path: '/seller', icon: '📊', label: 'Tableau de Bord' },
    { key: 'products', path: '/seller/products', icon: '📦', label: 'Produits' },
    { key: 'orders', path: '/seller/orders', icon: '📋', label: 'Commandes' },
    { key: 'analytics', path: '/seller/analytics', icon: '📈', label: 'Analyses' },
    { key: 'messages', path: '/seller/messages', icon: '💬', label: 'Messages' },
    { key: 'profile', path: '/seller/profile', icon: '⚙️', label: 'Profil' }
  ];

  const sellerName = user?.businessName || 'Vendeur';
  const sellerRating = user?.rating || 4.5;
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
          {/* <div className="flex items-center text-sm text-gray-600">
            <span className="mr-1">⭐</span>
            {sellerRating}
          </div> */}
        </div>
      </div>
      
      <nav className="space-y-2">
        {menuItems.map(item => (
          <Link
            key={item.key}
            to={item.path}
            className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
              currentPage === item.key 
                ? 'bg-purple-100 text-purple-700 font-semibold' 
                : 'hover:bg-gray-50 text-gray-700'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      
      <div className="mt-8 pt-6 border-t">
        <Link
          to="/"
          className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
        >
          <span className="text-xl">🏠</span>
          <span>Retour au Site</span>
        </Link>
      </div>
    </div>
  );
};

export default SellerSidebar;


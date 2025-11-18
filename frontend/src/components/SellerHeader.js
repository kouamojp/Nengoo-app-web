
import React from 'react';

// Seller Header Component
const SellerHeader = ({ title, language }) => {
  return (
    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-lg shadow-lg mb-8">
      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      <div className="flex items-center space-x-6 text-sm opacity-90">
        <span>📅 {new Date().toLocaleDateString('fr-FR')}</span>
        <span>🕒 {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
        <span>🏪 Espace Vendeur Nengoo</span>
      </div>
    </div>
  );
};

export default SellerHeader;

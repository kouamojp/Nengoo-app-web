import React, { useEffect } from 'react';

const CartNotification = ({ show, product, onClose }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000); // Disparaît après 3 secondes

      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show || !product) return null;

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up w-full flex flex-col items-center px-4">
      <div className="bg-white rounded-lg shadow-2xl border-2 border-green-500 px-4 py-2 md:flex items-center space-x-4 max-w-md">
        {/* Product Image */}
        {product.image && (
          <img
            src={product.image}
            alt={product.name?.fr || product.name}
            className="w-16 h-16 object-cover rounded-lg m-auto"
          />
        )}

        {/* Notification Content */}
        <div className="flex-1">
          <p className="text-sm text-gray-600">
            {product.name?.fr || product.name}
          </p>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-green-500 text-xl">✓</span>
            <span className="font-bold text-gray-800">Ajouté au panier!</span>
          </div>
        </div>

        {/* Close Button */}
        {/* <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Fermer"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button> */}
      </div>
    </div>
  );
};

export default CartNotification;

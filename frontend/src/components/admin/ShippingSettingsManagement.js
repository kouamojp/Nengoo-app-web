import React, { useState, useEffect } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const ShippingSettingsManagement = ({ user }) => {
  const [shippingPrice, setShippingPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchShippingPrice = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/settings/shipping`);
      if (!response.ok) {
        throw new Error('Failed to fetch shipping price');
      }
      const data = await response.json();
      setShippingPrice(data.price);
    } catch (err) {
      console.error("Error fetching shipping price:", err);
      setError(err.message || 'Erreur lors de la récupération du prix de livraison.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShippingPrice();
  }, []);

  const handlePriceChange = (e) => {
    setShippingPrice(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!user || user.role !== 'super_admin') {
      setError('Seul un Super Administrateur peut modifier les frais de livraison.');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/settings/shipping`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Role': user.role, // Ensure the header is sent for authorization
        },
        body: JSON.stringify({ price: parseFloat(shippingPrice) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to update shipping price');
      }

      setSuccess('Prix de livraison mis à jour avec succès!');
    } catch (err) {
      console.error("Error updating shipping price:", err);
      setError(err.message || 'Erreur lors de la mise à jour du prix de livraison.');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p>Chargement des paramètres de livraison...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">⚙️ Gestion des frais de livraison</h2>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="shippingPrice" className="block text-sm font-medium text-gray-700 mb-2">
            Prix de livraison standard (XAF)
          </label>
          <input
            type="number"
            id="shippingPrice"
            name="shippingPrice"
            value={shippingPrice}
            onChange={handlePriceChange}
            min="0"
            step="100"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
            disabled={!user || user.role !== 'super_admin'}
          />
        </div>
        
        {user && user.role === 'super_admin' && (
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Mise à jour...' : 'Mettre à jour le prix'}
          </button>
        )}
        
        {(!user || user.role !== 'super_admin') && (
            <p className="text-sm text-red-500 mt-2">Seul le Super Administrateur peut modifier ce paramètre.</p>
        )}
      </form>
    </div>
  );
};

export default ShippingSettingsManagement;
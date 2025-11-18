import React, { useState, useEffect } from 'react';
import AdminSidebar from './AdminSidebar';
import { getAllBuyers, deleteBuyer } from '../services/api';

export const AdminBuyers = (props) => {
  const { setUser } = props;
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadBuyers();
  }, []);

  const loadBuyers = async () => {
    try {
      const data = await getAllBuyers();
      setBuyers(data);
    } catch (error) {
      console.error('Error loading buyers:', error);
      alert('Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (buyerId) => {
    if (deleteConfirm !== buyerId) {
      setDeleteConfirm(buyerId);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }

    try {
      await deleteBuyer(buyerId);
      setBuyers(buyers.filter(b => b.id !== buyerId));
      setDeleteConfirm(null);
      alert('Client supprimé avec succès');
    } catch (error) {
      console.error('Error deleting buyer:', error);
      alert('Erreur lors de la suppression du client');
    }
  };

  const filteredBuyers = buyers.filter(buyer =>
    buyer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    buyer.whatsapp?.includes(searchTerm) ||
    buyer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar setUser={setUser} />

      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Gestion des Clients</h1>
            <p className="text-gray-600 mt-2">
              Total: {buyers.length} client(s)
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Rechercher par nom, WhatsApp ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-gray-600">Chargement des clients...</p>
            </div>
          ) : filteredBuyers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <div className="text-4xl mb-4">👤</div>
              <p className="text-gray-600">
                {searchTerm ? 'Aucun client trouvé' : 'Aucun client inscrit'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      WhatsApp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date d'inscription
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredBuyers.map((buyer) => (
                    <tr key={buyer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="text-2xl mr-3">👤</div>
                          <div className="text-sm font-medium text-gray-900">
                            {buyer.name || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {buyer.whatsapp || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {buyer.email || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {buyer.joinDate ? new Date(buyer.joinDate).toLocaleDateString('fr-FR') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleDelete(buyer.id)}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            deleteConfirm === buyer.id
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          {deleteConfirm === buyer.id ? 'Confirmer ?' : 'Supprimer'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminBuyers;

import React, { useState, useEffect } from 'react';
import AdminSidebar from './AdminSidebar';
import { getAllSellers, approveSeller, rejectSeller, deleteSeller, createSellerByAdmin, getAllCategories } from '../services/api';

export const AdminSellers = (props) => {
  const { setUser } = props;
  const [sellers, setSellers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    whatsapp: '',
    name: '',
    businessName: '',
    email: '',
    city: '',
    categories: [],
    password: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sellersData, categoriesData] = await Promise.all([
        getAllSellers(),
        getAllCategories()
      ]);
      setSellers(sellersData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryToggle = (categoryName) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryName)
        ? prev.categories.filter(c => c !== categoryName)
        : [...prev.categories, categoryName]
    }));
  };

  const handleSubmitSeller = async (e) => {
    e.preventDefault();

    if (!formData.whatsapp || !formData.name || !formData.businessName ||
        !formData.email || !formData.city || !formData.password ||
        formData.categories.length === 0) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      await createSellerByAdmin(formData);
      await loadData();
      alert('Vendeur créé et approuvé avec succès');
      resetForm();
    } catch (error) {
      console.error('Error creating seller:', error);
      alert(error.message || 'Erreur lors de la création du vendeur');
    }
  };

  const resetForm = () => {
    setFormData({
      whatsapp: '',
      name: '',
      businessName: '',
      email: '',
      city: '',
      categories: [],
      password: ''
    });
    setShowAddForm(false);
  };

  const handleApprove = async (sellerId) => {
    try {
      await approveSeller(sellerId);
      setSellers(sellers.map(s =>
        s.id === sellerId ? { ...s, status: 'approved' } : s
      ));
      alert('Vendeur approuvé avec succès');
    } catch (error) {
      console.error('Error approving seller:', error);
      alert('Erreur lors de l\'approbation du vendeur');
    }
  };

  const handleReject = async (sellerId) => {
    try {
      await rejectSeller(sellerId);
      setSellers(sellers.map(s =>
        s.id === sellerId ? { ...s, status: 'rejected' } : s
      ));
      alert('Vendeur rejeté');
    } catch (error) {
      console.error('Error rejecting seller:', error);
      alert('Erreur lors du rejet du vendeur');
    }
  };

  const handleDelete = async (sellerId) => {
    if (deleteConfirm !== sellerId) {
      setDeleteConfirm(sellerId);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }

    try {
      await deleteSeller(sellerId);
      setSellers(sellers.filter(s => s.id !== sellerId));
      setDeleteConfirm(null);
      alert('Vendeur supprimé avec succès');
    } catch (error) {
      console.error('Error deleting seller:', error);
      alert('Erreur lors de la suppression du vendeur');
    }
  };

  const filteredSellers = sellers.filter(seller => {
    const matchesSearch =
      seller.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seller.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seller.whatsapp?.includes(searchTerm) ||
      seller.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterStatus === 'all' || seller.status === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'En attente' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approuvé' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejeté' }
    };

    const badge = badges[status] || badges.pending;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const pendingCount = sellers.filter(s => s.status === 'pending').length;
  const approvedCount = sellers.filter(s => s.status === 'approved').length;

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar setUser={setUser} />

      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Gestion des Vendeurs</h1>
              <p className="text-gray-600 mt-2">
                Total: {sellers.length} vendeur(s) | Approuvés: {approvedCount} | En attente: {pendingCount}
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              + Ajouter un vendeur
            </button>
          </div>

          {showAddForm && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                Nouveau vendeur
              </h2>
              <form onSubmit={handleSubmitSeller} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Numéro WhatsApp *
                    </label>
                    <input
                      type="tel"
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Ex: +221 77 123 45 67"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom du propriétaire *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Ex: Amadou Diallo"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom de l'entreprise *
                    </label>
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Ex: Marché de Sandaga"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="vendeur@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ville *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Ex: Dakar"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mot de passe *
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Mot de passe"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Catégories de produits * (Sélectionnez au moins une)
                  </label>
                  {categories.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {categories.map((category) => (
                        <label
                          key={category.id}
                          className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                            formData.categories.includes(category.name)
                              ? 'bg-purple-100 border-purple-500'
                              : 'bg-white border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.categories.includes(category.name)}
                            onChange={() => handleCategoryToggle(category.name)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">
                            {category.icon} {category.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Aucune catégorie disponible. Créez d'abord des catégories.
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                  >
                    Créer le vendeur
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <input
                  type="text"
                  placeholder="Rechercher par nom, entreprise, WhatsApp ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="pending">En attente</option>
                  <option value="approved">Approuvés</option>
                  <option value="rejected">Rejetés</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-gray-600">Chargement des vendeurs...</p>
            </div>
          ) : filteredSellers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <div className="text-4xl mb-4">🏪</div>
              <p className="text-gray-600">
                {searchTerm ? 'Aucun vendeur trouvé' : 'Aucun vendeur inscrit'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSellers.map((seller) => (
                <div key={seller.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="text-4xl">🏪</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-800">
                            {seller.businessName || 'N/A'}
                          </h3>
                          {getStatusBadge(seller.status)}
                        </div>
                        <p className="text-gray-600 mb-3">
                          <strong>Propriétaire:</strong> {seller.name || 'N/A'}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                          <div>
                            <strong>WhatsApp:</strong> {seller.whatsapp || 'N/A'}
                          </div>
                          <div>
                            <strong>Email:</strong> {seller.email || 'N/A'}
                          </div>
                          <div>
                            <strong>Ville:</strong> {seller.city || 'N/A'}
                          </div>
                          <div>
                            <strong>Date de soumission:</strong>{' '}
                            {seller.submitDate ? new Date(seller.submitDate).toLocaleDateString('fr-FR') : 'N/A'}
                          </div>
                        </div>
                        {seller.categories && seller.categories.length > 0 && (
                          <div className="mt-3">
                            <strong className="text-sm text-gray-600">Catégories:</strong>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {seller.categories.map((cat, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                                >
                                  {cat}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      {seller.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(seller.id)}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors whitespace-nowrap"
                          >
                            Approuver
                          </button>
                          <button
                            onClick={() => handleReject(seller.id)}
                            className="px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-colors whitespace-nowrap"
                          >
                            Rejeter
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(seller.id)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                          deleteConfirm === seller.id
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {deleteConfirm === seller.id ? 'Confirmer ?' : 'Supprimer'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSellers;

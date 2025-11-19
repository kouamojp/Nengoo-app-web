import React, { useState, useEffect } from 'react';
import AdminSidebar from './AdminSidebar';
import { 
  getAllSellers, 
  approveSeller, 
  rejectSeller, 
  deleteSeller, 
  createSellerByAdmin, 
  updateSellerByAdmin,
  updateSellerPasswordByAdmin,
  getAllCategories 
} from '../services/api';

export const AdminSellers = (props) => {
  const { setUser } = props;
  const [sellers, setSellers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const [showForm, setShowForm] = useState(false);
  const [editingSeller, setEditingSeller] = useState(null);
  const [formData, setFormData] = useState({
    whatsapp: '', name: '', businessName: '', email: '', city: '', categories: [], password: '', status: 'pending'
  });

  // State for password modal
  const [passwordModal, setPasswordModal] = useState({ isOpen: false, seller: null });
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
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
  
  const handleEdit = (seller) => {
    setEditingSeller(seller);
    setFormData({
      whatsapp: seller.whatsapp || '',
      name: seller.name || '',
      businessName: seller.businessName || '',
      email: seller.email || '',
      city: seller.city || '',
      categories: seller.categories || [],
      status: seller.status || 'pending',
      password: ''
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingSeller) {
      const { password, ...updateData } = formData;
      try {
        await updateSellerByAdmin(editingSeller.id, updateData);
        await loadData();
        alert('Vendeur mis à jour avec succès');
        resetForm();
      } catch (error) {
        console.error('Error updating seller:', error);
        alert(error.response?.data?.detail || error.message || 'Erreur lors de la mise à jour du vendeur');
      }
    } else {
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
        alert(error.response?.data?.detail || error.message || 'Erreur lors de la création du vendeur');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      whatsapp: '', name: '', businessName: '', email: '', city: '', categories: [], password: '', status: 'pending'
    });
    setShowForm(false);
    setEditingSeller(null);
  };

  const handlePasswordModalOpen = (seller) => {
    setPasswordModal({ isOpen: true, seller: seller });
    setNewPassword('');
  };

  const handlePasswordModalClose = () => {
    setPasswordModal({ isOpen: false, seller: null });
    setNewPassword('');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!passwordModal.seller || !newPassword) {
      alert('Veuillez entrer un nouveau mot de passe.');
      return;
    }
    if (newPassword.length < 6) {
        alert('Le mot de passe doit contenir au moins 6 caractères.');
        return;
    }

    try {
      await updateSellerPasswordByAdmin(passwordModal.seller.id, newPassword);
      alert('Mot de passe mis à jour avec succès.');
      handlePasswordModalClose();
    } catch (error) {
      console.error('Error updating password:', error);
      alert(error.response?.data?.detail || error.message || 'Erreur lors de la mise à jour du mot de passe.');
    }
  };

  const handleApprove = async (sellerId) => {
    try {
      await approveSeller(sellerId);
      await loadData();
      alert('Vendeur approuvé avec succès');
    } catch (error) {
      console.error('Error approving seller:', error);
      alert('Erreur lors de l\'approbation du vendeur');
    }
  };

  const handleReject = async (sellerId) => {
    try {
      await rejectSeller(sellerId);
      await loadData();
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
    const matchesFilter = filterStatus === 'all' || seller.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'En attente' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approuvé' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejeté' }
    };
    const badge = badges[status] || badges.pending;
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>{badge.label}</span>;
  };

  const pendingCount = sellers.filter(s => s.status === 'pending').length;
  const approvedCount = sellers.filter(s => s.status === 'approved').length;
  
  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar setUser={setUser} />

      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Gestion des Vendeurs</h1>
              <p className="text-gray-600 mt-2">Total: {sellers.length} | Approuvés: {approvedCount} | En attente: {pendingCount}</p>
            </div>
            <button onClick={() => { setEditingSeller(null); resetForm(); setShowForm(true); }} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700">
              + Ajouter un vendeur
            </button>
          </div>

          {/* Add/Edit Form */}
          {showForm && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">{editingSeller ? 'Modifier le vendeur' : 'Nouveau vendeur'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Form fields... */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp *</label><input type="tel" name="whatsapp" value={formData.whatsapp} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Nom du propriétaire *</label><input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" required /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Nom de l'entreprise *</label><input type="text" name="businessName" value={formData.businessName} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Email *</label><input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" required /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-2">Ville *</label><input type="text" name="city" value={formData.city} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" required /></div>
                  {!editingSeller && (<div><label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe *</label><input type="password" name="password" value={formData.password} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-4 py-2" required /></div>)}
                  {editingSeller && (<div><label className="block text-sm font-medium text-gray-700 mb-2">Statut</label><select name="status" value={formData.status} onChange={handleInputChange} className="w-full border border-gray-300 rounded-lg px-4 py-2"><option value="pending">En attente</option><option value="approved">Approuvé</option><option value="rejected">Rejeté</option></select></div>)}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Catégories *</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">{categories.map(c => <label key={c.id} className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer ${formData.categories.includes(c.name) ? 'bg-purple-100 border-purple-500' : ''}`}><input type="checkbox" checked={formData.categories.includes(c.name)} onChange={()=> handleCategoryToggle(c.name)} /><span>{c.name}</span></label>)}</div>
                </div>
                <div className="flex gap-3"><button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded-lg">{editingSeller ? 'Mettre à jour' : 'Créer'}</button><button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-200 rounded-lg">Annuler</button></div>
              </form>
            </div>
          )}

          {/* Filter/Search Bar */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center gap-4">
                <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full border-gray-300 rounded-lg py-3"/>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border-gray-300 rounded-lg py-3">
                    <option value="all">Tous les statuts</option><option value="pending">En attente</option><option value="approved">Approuvés</option><option value="rejected">Rejetés</option>
                </select>
            </div>
          </div>

          {/* Seller List */}
          {loading ? <p>Chargement...</p> : (
            <div className="space-y-4">
              {filteredSellers.map((seller) => (
                <div key={seller.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold">{seller.businessName} {getStatusBadge(seller.status)}</h3>
                      <p><strong>Propriétaire:</strong> {seller.name}</p>
                      <p><strong>WhatsApp:</strong> {seller.whatsapp}</p>
                      <p><strong>Email:</strong> {seller.email}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => handleEdit(seller)} className="px-4 py-2 bg-blue-500 text-white rounded-lg">Éditer</button>
                      <button onClick={() => handlePasswordModalOpen(seller)} className="px-4 py-2 bg-gray-500 text-white rounded-lg">Mot de passe</button>
                      {seller.status === 'pending' && (<><button onClick={() => handleApprove(seller.id)} className="px-4 py-2 bg-green-500 text-white rounded-lg">Approuver</button><button onClick={() => handleReject(seller.id)} className="px-4 py-2 bg-yellow-500 text-white rounded-lg">Rejeter</button></>)}
                      <button onClick={() => handleDelete(seller.id)} className={`px-4 py-2 rounded-lg ${deleteConfirm === seller.id ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'}`}>{deleteConfirm === seller.id ? 'Confirmer ?' : 'Supprimer'}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Password Change Modal */}
      {passwordModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Changer le mot de passe</h2>
            <p className="mb-4">Pour : <strong>{passwordModal.seller?.name}</strong> ({passwordModal.seller?.businessName})</p>
            <form onSubmit={handlePasswordChange}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nouveau mot de passe (min 6 caractères)</label>
              <input 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4"
                placeholder="Entrez le nouveau mot de passe"
                required
              />
              <div className="flex justify-end gap-4">
                <button type="button" onClick={handlePasswordModalClose} className="px-6 py-2 bg-gray-200 rounded-lg">Annuler</button>
                <button type="submit" className="px-6 py-2 bg-purple-600 text-white rounded-lg">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSellers;

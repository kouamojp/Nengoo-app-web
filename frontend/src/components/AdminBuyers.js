import React, { useState, useEffect } from 'react';
import AdminSidebar from './AdminSidebar';
import { getAllBuyers, deleteBuyer, updateBuyerByAdmin, updateBuyerPasswordByAdmin } from '../services/api';

export const AdminBuyers = (props) => {
  const { setUser } = props;
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState(null);
  const [formData, setFormData] = useState({ name: '', whatsapp: '', email: '' });

  const [passwordModal, setPasswordModal] = useState({ isOpen: false, buyer: null });
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => { loadBuyers(); }, []);

  const loadBuyers = async () => {
    setLoading(true);
    try {
      const data = await getAllBuyers();
      setBuyers(data);
    } catch (error) {
      console.error('Error loading buyers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = (buyer) => {
    setEditingBuyer(buyer);
    setFormData({ name: buyer.name || '', whatsapp: buyer.whatsapp || '', email: buyer.email || '' });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingBuyer) return;
    try {
      await updateBuyerByAdmin(editingBuyer.id, formData);
      await loadBuyers();
      alert('Client mis à jour');
      resetForm();
    } catch (error) {
      console.error('Error updating buyer:', error);
      alert(error.response?.data?.detail || 'Erreur');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', whatsapp: '', email: '' });
    setShowForm(false);
    setEditingBuyer(null);
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
      alert('Client supprimé');
    } catch (error) {
      console.error('Error deleting buyer:', error);
      alert('Erreur suppression');
    }
  };
  
  const handlePasswordModalOpen = (buyer) => {
    setPasswordModal({ isOpen: true, buyer: buyer });
    setNewPassword('');
  };

  const handlePasswordModalClose = () => {
    setPasswordModal({ isOpen: false, buyer: null });
    setNewPassword('');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!passwordModal.buyer || !newPassword) {
      alert('Veuillez entrer un nouveau mot de passe.');
      return;
    }
    if (newPassword.length < 6) {
        alert('Le mot de passe doit contenir au moins 6 caractères.');
        return;
    }
    try {
      await updateBuyerPasswordByAdmin(passwordModal.buyer.id, newPassword);
      alert('Mot de passe mis à jour.');
      handlePasswordModalClose();
    } catch (error) {
      console.error('Error updating password:', error);
      alert(error.response?.data?.detail || 'Erreur mise à jour mot de passe.');
    }
  };

  const filteredBuyers = buyers.filter(b =>
    b.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.whatsapp?.includes(searchTerm) ||
    b.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar setUser={setUser} />
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Gestion des Clients</h1>
          <p className="text-gray-600 mb-8">Total: {buyers.length} client(s)</p>

          {showForm && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Modifier le client</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700">Nom</label><input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full mt-1 border-gray-300 rounded-lg" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700">WhatsApp</label><input type="tel" name="whatsapp" value={formData.whatsapp} onChange={handleInputChange} className="w-full mt-1 border-gray-300 rounded-lg" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700">Email</label><input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full mt-1 border-gray-300 rounded-lg" required /></div>
                </div>
                <div className="flex gap-3"><button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg">Mettre à jour</button><button type="button" onClick={resetForm} className="px-6 py-2 bg-gray-200 rounded-lg">Annuler</button></div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full border-gray-300 rounded-lg py-3"/>
          </div>

          {loading ? <p>Chargement...</p> : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50"><tr><th className="p-4 text-left">Nom</th><th className="p-4 text-left">Contact</th><th className="p-4 text-left">Date d'inscription</th><th className="p-4 text-left">Actions</th></tr></thead>
                <tbody className="divide-y">
                  {filteredBuyers.map(b => (
                    <tr key={b.id}>
                      <td className="p-4">{b.name}</td>
                      <td className="p-4">{b.whatsapp} / {b.email}</td>
                      <td className="p-4">{new Date(b.joinDate).toLocaleDateString('fr-FR')}</td>
                      <td className="p-4 space-x-2">
                        <button onClick={() => handleEdit(b)} className="px-3 py-1 bg-blue-100 text-blue-700 rounded">Éditer</button>
                        <button onClick={() => handlePasswordModalOpen(b)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded">Mot de passe</button>
                        <button onClick={() => handleDelete(b.id)} className={`px-3 py-1 rounded ${deleteConfirm === b.id ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'}`}>{deleteConfirm === b.id ? 'Confirmer ?' : 'Supprimer'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {passwordModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8">
            <h2 className="text-xl font-bold mb-4">Changer mot de passe pour {passwordModal.buyer?.name}</h2>
            <form onSubmit={handlePasswordChange}>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full border-gray-300 rounded-lg mb-4 py-2" placeholder="Nouveau mot de passe" required />
              <div className="flex justify-end gap-3"><button type="button" onClick={handlePasswordModalClose} className="px-4 py-2 bg-gray-200 rounded">Annuler</button><button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded">Enregistrer</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBuyers;

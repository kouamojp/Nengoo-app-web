
import React, { useState, useEffect } from 'react';
import { openWhatsApp } from './common';
import { getCurrentUser, updateSellerProfile } from '../services/api';
import Header from './Header';
import Footer from './Footer';
import SellerSidebar from './SellerSidebar';
import SellerHeader from './SellerHeader';

// Seller Profile Component
export const SellerProfile = (props) => {
  const { language } = props;
  const [profileData, setProfileData] = useState(null);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const userData = await getCurrentUser();
      setProfileData(userData);
      setEditData({
        name: userData.name || '',
        businessName: userData.businessName || '',
        email: userData.email || '',
        whatsapp: userData.whatsapp || '',
        city: userData.city || ''
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({
      name: profileData.name || '',
      businessName: profileData.businessName || '',
      email: profileData.email || '',
      whatsapp: profileData.whatsapp || '',
      city: profileData.city || ''
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedProfile = await updateSellerProfile(editData);
      setProfileData(updatedProfile);
      setIsEditing(false);
      alert('Profil mis à jour avec succès!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(error.message || 'Erreur lors de la mise à jour du profil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header {...props} />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-600">Chargement du profil...</p>
          </div>
        </div>
        <Footer language={language} />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header {...props} />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">❌</div>
            <p className="text-gray-600">Erreur lors du chargement du profil</p>
          </div>
        </div>
        <Footer language={language} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header {...props} />

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <SellerSidebar currentPage="profile" language={language} />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <SellerHeader title="Profil Vendeur" language={language} />

            {/* Profile Card */}
            <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">Informations du Profil</h2>
                {!isEditing ? (
                  <button
                    onClick={handleEdit}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                  >
                    ✏️ Modifier
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCancel}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors disabled:bg-gray-400"
                    >
                      {saving ? 'Enregistrement...' : '💾 Enregistrer'}
                    </button>
                  </div>
                )}
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="flex items-center space-x-6 mb-8">
                  <div className="w-24 h-24 bg-gradient-to-r from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-purple-200">
                    {profileData.businessName?.charAt(0) || profileData.name?.charAt(0) || '?'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Nom de la Boutique</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.businessName}
                        onChange={(e) => setEditData({ ...editData, businessName: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    ) : (
                      <p className="text-lg font-semibold text-gray-800">{profileData.businessName || 'N/A'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Nom du Vendeur</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    ) : (
                      <p className="text-lg text-gray-800">{profileData.name || 'N/A'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editData.email}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    ) : (
                      <p className="text-lg text-gray-800">{profileData.email || 'N/A'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">WhatsApp</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editData.whatsapp}
                        onChange={(e) => setEditData({ ...editData, whatsapp: e.target.value })}
                        placeholder="+237 6XX XXX XXX"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    ) : (
                      <div className="flex flex-col items-center space-x-2">
                        <p className="text-lg text-gray-800">{profileData.whatsapp || 'N/A'}</p>
                        {/* {profileData.whatsapp && (
                          <button
                            type="button"
                            onClick={() => openWhatsApp(profileData.whatsapp)}
                            className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 transition-colors"
                          >
                            📱 Contacter
                          </button>
                        )} */}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Ville</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.city}
                        onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    ) : (
                      <p className="text-lg text-gray-800">{profileData.city || 'N/A'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Statut</label>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      profileData.status === 'approved' ? 'bg-green-100 text-green-800' :
                      profileData.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {profileData.status === 'approved' ? '✅ Approuvé' :
                       profileData.status === 'pending' ? '⏳ En attente' : '❌ Rejeté'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Catégories</label>
                  <div className="flex flex-wrap gap-2">
                    {profileData.categories && profileData.categories.length > 0 ? (
                      profileData.categories.map((category, index) => (
                        <span key={index} className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                          {category}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500">Aucune catégorie</p>
                    )}
                  </div>
                </div>
              </form>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-r from-purple-400 to-purple-600 text-white rounded-lg p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Membre Depuis</p>
                    <p className="text-2xl font-bold">
                      {profileData.joinDate ? new Date(profileData.joinDate).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 'N/A'}
                    </p>
                    <p className="text-sm opacity-75">
                      {profileData.status === 'approved' ? 'Vendeur actif' : 'En attente d\'approbation'}
                    </p>
                  </div>
                  <div className="text-4xl">🕐</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-lg p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Catégories de Produits</p>
                    <p className="text-3xl font-bold">{profileData.categories?.length || 0}</p>
                    <p className="text-sm opacity-75">
                      {profileData.categories?.length > 1 ? 'Catégories' : 'Catégorie'}
                    </p>
                  </div>
                  <div className="text-4xl">📦</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer language={language} />
    </div>
  );
};

export default SellerProfile;

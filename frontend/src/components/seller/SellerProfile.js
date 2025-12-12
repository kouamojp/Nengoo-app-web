
import React, { useState, useEffect } from 'react';
import { openWhatsApp } from '../../lib/utils';
import SellerHeader from './SellerHeader';

const SellerProfile = (props) => {
  const { language, user } = props;
  const [profileData, setProfileData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user) {
      // Map the user prop to the profileData state
      setProfileData({
        name: user.businessName || '',
        email: user.email || '',
        phone: user.whatsapp || '',
        address: user.address || '',
        city: user.city || '',
        description: user.description || '',
        logo: user.logoUrl || null,
        joinDate: user.joinDate || new Date().toISOString(),
        rating: user.rating || 4.5, // Mock data for now
        totalSales: user.totalSales || 120, // Mock data for now
        socialMedia: user.socialMedia || { whatsapp: user.whatsapp || '' },
      });
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();

    const sellerId = user.id;
    if (!sellerId) {
      alert("Erreur: ID du vendeur non trouvé.");
      return;
    }

    console.log('profileData before update:', profileData);

    // Mapping frontend state to backend model
    const updateData = {
      businessName: profileData?.name,
      email: profileData?.email,
      whatsapp: profileData?.phone,
      address: profileData?.address,
      city: profileData?.city,
      description: profileData?.description,
      logoUrl: profileData?.logo,
      socialMedia: profileData?.socialMedia
    };

    try {
      const response = await fetch(`http://localhost:8000/api/sellers/${sellerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Seller-Id': sellerId,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update profile');
      }

      const updatedSeller = await response.json();

      // Update local state and UI
      props.setUser(updatedSeller);
      setIsEditing(false);
      alert('Profil mis à jour avec succès!');

    } catch (error) {
      console.error('Error updating profile:', error);
      alert(`Erreur lors de la mise à jour du profil: ${error.message}`);
    }
  };

  if (!profileData) {
    return (
      <div className="lg:col-span-3">
        <SellerHeader title="Profil Vendeur" language={language} />
        <div className="container mx-auto px-4 py-8 text-center">
          <p>Chargement du profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:col-span-3">
      <SellerHeader title="Profil Vendeur" language={language} />
      
      {/* Profile Card */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Informations du Profil</h2>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            {isEditing ? 'Annuler' : '✏️ Modifier'}
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="flex items-center space-x-6 mb-8">
          {profileData.logo ? (
            <img
              src={profileData.logo}
              alt="Logo"
              className="w-24 h-24 rounded-full object-cover border-4 border-purple-200"
            />
          ) : (
            <div className="w-24 h-24 rounded-full border-4 border-purple-200 bg-purple-600 flex items-center justify-center text-white text-4xl font-bold">
              {profileData.name.charAt(0).toUpperCase()}
            </div>
          )}
            {isEditing && (
              <div>
                <label className="block text-sm font-medium mb-2">URL du Logo</label>
                <input
                  type="url"
                  value={profileData.logo || ''}
                  onChange={(e) => setProfileData({ ...profileData, logo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Nom de la Boutique</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              ) : (
                <p className="text-lg font-semibold text-gray-800">{profileData.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              {isEditing ? (
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              ) : (
                <p className="text-lg text-gray-800">{profileData.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Téléphone</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              ) : (
                <p className="text-lg text-gray-800">{profileData.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Adresse</label>
              {isEditing ? (
                <div>
                  <input
                    type="text"
                    placeholder="Adresse"
                    value={profileData.address}
                    onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2"
                  />
                  <input
                    type="text"
                    placeholder="Ville"
                    value={profileData.city}
                    onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              ) : (
                <p className="text-lg text-gray-800">{profileData.address}{profileData.city ? `, ${profileData.city}` : ''}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description de la Boutique</label>
            {isEditing ? (
              <textarea
                value={profileData.description}
                onChange={(e) => setProfileData({ ...profileData, description: e.target.value })}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            ) : (
              <p className="text-lg text-gray-800">{profileData.description}</p>
            )}
          </div>

          {/* Social Media Links */}
          <div>
            <label className="block text-sm font-medium mb-4">Réseaux Sociaux</label>
            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">WhatsApp</label>
                  <input
                    type="tel"
                    value={profileData.socialMedia?.whatsapp || ''}
                    onChange={(e) => setProfileData({
                      ...profileData,
                      socialMedia: { ...profileData.socialMedia, whatsapp: e.target.value }
                    })}
                    placeholder="+237 6XX XXX XXX"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Facebook</label>
                  <input
                    type="url"
                    value={profileData.socialMedia?.facebook || ''}
                    onChange={(e) => setProfileData({
                      ...profileData,
                      socialMedia: { ...profileData.socialMedia, facebook: e.target.value }
                    })}
                    placeholder="https://facebook.com/..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            ) : (
              <div className="flex space-x-4">
                {profileData.socialMedia?.whatsapp && (
                  <button
                    onClick={() => openWhatsApp(profileData.socialMedia.whatsapp)}
                    className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <span>📱</span>
                    <span>WhatsApp</span>
                  </button>
                )}
                {profileData.socialMedia?.facebook && (
                  <a
                    href={profileData.socialMedia.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <span>📘</span>
                    <span>Facebook</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {isEditing && (
            <div className="pt-6">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
              >
                Sauvegarder les Modifications
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Stats Cards */}
      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Note Moyenne</p>
              <p className="text-3xl font-bold">{profileData.rating} ⭐</p>
              <p className="text-sm opacity-75">Très bon vendeur</p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-400 to-green-600 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Ventes</p>
              <p className="text-3xl font-bold">{profileData.totalSales}</p>
              <p className="text-sm opacity-75">Commandes livrées</p>
            </div>
            <div className="text-4xl">📦</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-400 to-purple-600 text-white rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Membre Depuis</p>
              <p className="text-2xl font-bold">
                {new Date(profileData.joinDate).toLocaleDateString('fr-FR', { 
                  year: 'numeric', 
                  month: 'short' 
                })}
              </p>
              <p className="text-sm opacity-75">Vendeur actif</p>
            </div>
            <div className="text-4xl">🕐</div>
          </div>
        </div>
      </div> */}
    </div>
  );
};

export default SellerProfile;


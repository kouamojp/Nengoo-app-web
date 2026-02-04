import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

/**
 * Composant de gestion des images du carrousel Hero
 * Réservé aux super administrateurs
 */
const HeroImagesManager = () => {
  const [heroImages, setHeroImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '');

  // Charger les images actuelles
  useEffect(() => {
    fetchHeroImages();
  }, []);

  const fetchHeroImages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/settings/homepage`);
      if (!response.ok) throw new Error('Erreur lors du chargement des images');
      const data = await response.json();
      setHeroImages(data.heroImages || []);
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Uploader une nouvelle image
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Veuillez sélectionner un fichier image'
      });
      return;
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'L\'image ne doit pas dépasser 5MB'
      });
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Erreur lors de l\'upload');
      const data = await response.json();

      // Ajouter l'URL de l'image uploadée à la liste
      const updatedImages = [...heroImages, data.url];
      await updateHeroImages(updatedImages);

      Swal.fire({
        icon: 'success',
        title: 'Succès',
        text: 'Image uploadée avec succès'
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: error.message
      });
    } finally {
      setUploading(false);
    }
  };

  // Ajouter une image par URL
  const handleAddImageByUrl = async () => {
    if (!newImageUrl.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Veuillez entrer une URL d\'image valide'
      });
      return;
    }

    try {
      const updatedImages = [...heroImages, newImageUrl];
      await updateHeroImages(updatedImages);
      setNewImageUrl('');

      Swal.fire({
        icon: 'success',
        title: 'Succès',
        text: 'Image ajoutée avec succès'
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: error.message
      });
    }
  };

  // Supprimer une image
  const handleDeleteImage = async (index) => {
    const result = await Swal.fire({
      title: 'Êtes-vous sûr?',
      text: 'Cette action est irréversible',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler'
    });

    if (result.isConfirmed) {
      try {
        const updatedImages = heroImages.filter((_, i) => i !== index);
        await updateHeroImages(updatedImages);

        Swal.fire({
          icon: 'success',
          title: 'Supprimé',
          text: 'L\'image a été supprimée'
        });
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: error.message
        });
      }
    }
  };

  // Réorganiser les images (déplacer vers le haut)
  const handleMoveUp = async (index) => {
    if (index === 0) return;
    const updatedImages = [...heroImages];
    [updatedImages[index - 1], updatedImages[index]] = [updatedImages[index], updatedImages[index - 1]];
    await updateHeroImages(updatedImages);
  };

  // Réorganiser les images (déplacer vers le bas)
  const handleMoveDown = async (index) => {
    if (index === heroImages.length - 1) return;
    const updatedImages = [...heroImages];
    [updatedImages[index], updatedImages[index + 1]] = [updatedImages[index + 1], updatedImages[index]];
    await updateHeroImages(updatedImages);
  };

  // Mettre à jour les images sur le backend
  const updateHeroImages = async (images) => {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/homepage`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ heroImages: images })
      });

      if (!response.ok) throw new Error('Erreur lors de la mise à jour');
      setHeroImages(images);
    } catch (error) {
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gestion du Carrousel Hero
          </h1>
          <p className="text-gray-600">
            Gérez les images qui s'affichent dans le carrousel de la page d'accueil
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Ajouter une nouvelle image</h2>

          {/* Upload File */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Uploader depuis votre ordinateur
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              JPG, PNG ou WebP. Taille max: 5MB. Dimensions recommandées: 1920x1080px
            </p>
          </div>

          {/* Add by URL */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="Ou entrez une URL d'image..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <button
              onClick={handleAddImageByUrl}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              Ajouter
            </button>
          </div>

          {uploading && (
            <div className="mt-4 text-center text-purple-600">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mr-2"></div>
              Upload en cours...
            </div>
          )}
        </div>

        {/* Images List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">
            Images actuelles ({heroImages.length})
          </h2>

          {heroImages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">🖼️</div>
              <p>Aucune image n'a été ajoutée</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {heroImages.map((imageUrl, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
                  <img
                    src={imageUrl}
                    alt={`Hero ${index + 1}`}
                    className="w-full h-48 object-cover rounded-lg mb-3"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/400x200?text=Image+non+disponible';
                    }}
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Image {index + 1}
                    </span>

                    <div className="flex gap-2">
                      {/* Move Up */}
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="p-2 text-gray-600 hover:text-purple-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Déplacer vers le haut"
                      >
                        ⬆️
                      </button>

                      {/* Move Down */}
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === heroImages.length - 1}
                        className="p-2 text-gray-600 hover:text-purple-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Déplacer vers le bas"
                      >
                        ⬇️
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteImage(index)}
                        className="p-2 text-red-600 hover:text-red-800"
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mt-2 truncate" title={imageUrl}>
                    {imageUrl}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Conseils</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Utilisez 3 à 5 images maximum pour des performances optimales</li>
            <li>Les images défilent automatiquement toutes les 5 secondes</li>
            <li>Privilégiez des images avec des couleurs harmonieuses</li>
            <li>Assurez-vous que les éléments importants sont visibles sur mobile</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HeroImagesManager;

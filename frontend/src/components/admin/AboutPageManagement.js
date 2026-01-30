import React, { useState, useEffect } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const AboutPageManagement = ({ user }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [formData, setFormData] = useState({
    mission_image_url: '',
    mission_title: '',
    mission_text_1: '',
    mission_text_2: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/about-page-settings`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setFormData({
          mission_image_url: data.mission_image_url || '',
          mission_title: data.mission_title || '',
          mission_text_1: data.mission_text_1 || '',
          mission_text_2: data.mission_text_2 || ''
        });
      }
    } catch (error) {
      console.error('Error fetching about page settings:', error);
      setMessage({ text: 'Erreur lors du chargement des paramètres', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const response = await fetch(`${API_BASE_URL}/about-page-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Id': user.id
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setMessage({ text: '✅ Paramètres mis à jour avec succès !', type: 'success' });
      } else {
        const error = await response.json();
        setMessage({ text: `❌ Erreur: ${error.detail}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error updating about page settings:', error);
      setMessage({ text: '❌ Erreur lors de la mise à jour', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePresignedUrl = async () => {
    try {
      const fileName = prompt('Nom du fichier (ex: about-mission.jpg):');
      if (!fileName) return;

      const response = await fetch(`${API_BASE_URL}/generate-presigned-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Id': user.id
        },
        body: JSON.stringify({
          fileName: fileName,
          fileType: 'image/jpeg'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          mission_image_url: data.publicUrl
        }));
        setMessage({
          text: `✅ URL générée ! Upload URL: ${data.uploadUrl.substring(0, 50)}...`,
          type: 'success'
        });
      } else {
        const error = await response.json();
        setMessage({ text: `❌ Erreur: ${error.detail}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      setMessage({ text: '❌ Erreur lors de la génération de l\'URL', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Gestion Page "À propos"</h2>
        <p className="text-gray-600">
          Configurez le contenu de la section "Notre Mission" de la page À propos
        </p>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            URL de l'image de mission
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              name="mission_image_url"
              value={formData.mission_image_url}
              onChange={handleChange}
              placeholder="https://exemple.com/image.jpg"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
            <button
              type="button"
              onClick={handleGeneratePresignedUrl}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors whitespace-nowrap"
              title="Générer une URL d'upload S3"
            >
              📤 S3 URL
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            URL complète de l'image (doit être accessible publiquement)
          </p>
        </div>

        {/* Image Preview */}
        {formData.mission_image_url && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aperçu de l'image
            </label>
            <img
              src={formData.mission_image_url}
              alt="Aperçu"
              className="w-full max-w-md h-64 object-cover rounded-lg shadow-md"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif"%3EImage non disponible%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>
        )}

        {/* Mission Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Titre de la mission
          </label>
          <input
            type="text"
            name="mission_title"
            value={formData.mission_title}
            onChange={handleChange}
            placeholder="Notre Mission"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
        </div>

        {/* Mission Text 1 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Texte de mission - Paragraphe 1
          </label>
          <textarea
            name="mission_text_1"
            value={formData.mission_text_1}
            onChange={handleChange}
            rows={4}
            placeholder="Premier paragraphe de la mission..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            {formData.mission_text_1.length} caractères
          </p>
        </div>

        {/* Mission Text 2 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Texte de mission - Paragraphe 2
          </label>
          <textarea
            name="mission_text_2"
            value={formData.mission_text_2}
            onChange={handleChange}
            rows={4}
            placeholder="Deuxième paragraphe de la mission..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            {formData.mission_text_2.length} caractères
          </p>
        </div>

        {/* Last Updated Info */}
        {settings && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Dernière mise à jour :</strong>{' '}
              {new Date(settings.last_updated).toLocaleString('fr-FR')}
            </p>
            {settings.updated_by && (
              <p className="text-sm text-gray-600 mt-1">
                <strong>Par :</strong> {settings.updated_by}
              </p>
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={fetchSettings}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={saving}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className={`px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold transition-colors ${
              saving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700'
            }`}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>

      {/* Preview Link */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <a
          href="/about"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-purple-600 hover:text-purple-700 font-medium"
        >
          👁️ Prévisualiser la page À propos
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
};

export default AboutPageManagement;

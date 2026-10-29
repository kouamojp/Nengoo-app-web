import React, { useState, useEffect } from 'react';
import { SectionHeader, Field } from './AdminUI';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const AboutPageManagement = ({ user }) => {
  const [settings, setSettings] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
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
        setMessage({ text: 'Page À propos enregistrée.', type: 'success' });
      } else {
        const error = await response.json();
        setMessage({ text: error.detail || "L'enregistrement a échoué.", type: 'error' });
      }
    } catch (error) {
      console.error('Error updating about page settings:', error);
      setMessage({ text: "L'enregistrement a échoué. Vérifiez votre connexion, puis réessayez.", type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // Envoie l'image choisie sur S3 puis place son adresse publique dans le formulaire
  const handleUploadImage = async (file) => {
    if (!file) return;
    setUploadingImage(true);
    setMessage({ text: '', type: '' });
    try {
      const presignedResponse = await fetch(`${API_BASE_URL}/generate-presigned-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Role': user?.role || 'admin',
        },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });
      if (!presignedResponse.ok) {
        const err = await presignedResponse.json();
        throw new Error(err.detail || "Impossible de préparer l'envoi de l'image.");
      }
      const { uploadUrl, publicUrl } = await presignedResponse.json();
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadResponse.ok) throw new Error("L'envoi de l'image a échoué.");
      setFormData(prev => ({ ...prev, mission_image_url: publicUrl }));
      setMessage({ text: 'Image envoyée. Enregistrez pour la publier sur la page.', type: 'success' });
    } catch (error) {
      console.error('Error uploading about image:', error);
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-10 w-1/3 rounded loading-shimmer" />
        <div className="h-96 rounded-xl loading-shimmer" />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title="Page À propos"
        description="Le bloc « mission » affiché en haut de la page À propos."
        actions={
          <a href="/about" target="_blank" rel="noopener noreferrer" className="adm-btn adm-btn-secondary">
            Voir la page
          </a>
        }
      />

      {message.text && (
        <p
          role={message.type === 'error' ? 'alert' : 'status'}
          className={`mb-5 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}
        >
          {message.text}
        </p>
      )}

      <form onSubmit={handleSubmit} className="grid xl:grid-cols-[minmax(0,1fr)_22rem] gap-6 items-start">
        <div className="adm-card p-5 sm:p-6 space-y-5">
          <Field label="Titre" required>
            <input
              type="text"
              name="mission_title"
              value={formData.mission_title}
              onChange={handleChange}
              className="adm-input"
              required
            />
          </Field>
          <Field label="Premier paragraphe" required hint={`${formData.mission_text_1.length} caractères`}>
            <textarea
              name="mission_text_1"
              value={formData.mission_text_1}
              onChange={handleChange}
              rows={5}
              className="adm-input"
              required
            />
          </Field>
          <Field label="Second paragraphe" required hint={`${formData.mission_text_2.length} caractères`}>
            <textarea
              name="mission_text_2"
              value={formData.mission_text_2}
              onChange={handleChange}
              rows={5}
              className="adm-input"
              required
            />
          </Field>

          {settings && (
            <p className="text-sm text-gray-500">
              Dernière mise à jour le {new Date(settings.last_updated).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              {settings.updated_by && <>, par {settings.updated_by}</>}.
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-gray-200">
            <button type="button" onClick={fetchSettings} className="adm-btn adm-btn-secondary mt-4" disabled={saving}>
              Annuler les modifications
            </button>
            <button type="submit" disabled={saving || uploadingImage} className="adm-btn adm-btn-primary mt-4">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>

        <aside className="adm-card p-5 sm:p-6 space-y-4">
          <h3 className="font-bold">Image</h3>
          <div className="aspect-[4/5] rounded-xl overflow-hidden bg-gray-100">
            {formData.mission_image_url && (
              <img
                src={formData.mission_image_url}
                alt="Aperçu de l'image de la mission"
                className="w-full h-full object-cover object-top"
                onError={(e) => { e.target.style.visibility = 'hidden'; }}
                onLoad={(e) => { e.target.style.visibility = 'visible'; }}
              />
            )}
          </div>
          <Field label="Envoyer une image" hint="JPG, PNG ou WebP, format portrait de préférence.">
            <input
              type="file"
              accept="image/*"
              disabled={uploadingImage}
              onChange={(e) => handleUploadImage(e.target.files[0])}
              className="block w-full text-sm text-gray-600 file:mr-3 file:h-10 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-100 file:text-purple-800 hover:file:bg-purple-200 disabled:opacity-50"
            />
          </Field>
          {uploadingImage && <p className="text-sm text-gray-600" role="status">Envoi de l'image…</p>}
          <Field label="Ou adresse (URL) de l'image" required>
            <input
              type="url"
              name="mission_image_url"
              value={formData.mission_image_url}
              onChange={handleChange}
              placeholder="https://exemple.com/image.jpg"
              className="adm-input"
              required
            />
          </Field>
        </aside>
      </form>
    </div>
  );
};

export default AboutPageManagement;

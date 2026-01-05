import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import './PrivacyPolicyEditor.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001/api';

const PrivacyPolicyEditor = (props) => {
  const { user } = props;
  const [policy, setPolicy] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    fetchPolicy();
  }, []);

  // Vérifier que l'utilisateur est super admin
  if (!user || user.type !== 'admin' || user.role !== 'super_admin') {
    return (
      <div className="privacy-editor">
        <div className="message message-error">
          <h2>Accès refusé</h2>
          <p>Vous devez être connecté en tant que super admin pour accéder à cette page.</p>
          <a href="/admin/dashboard" className="btn btn-primary">Retour au tableau de bord</a>
        </div>
      </div>
    );
  }

  const fetchPolicy = async () => {
    try {
      const response = await axios.get(`${API_URL}/privacy-policy`);
      setPolicy(response.data);
      setTitle(response.data.title);
      setContent(response.data.content);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement de la politique:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement de la politique' });
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // Récupérer l'admin depuis localStorage
      const userStr = localStorage.getItem('nengoo-user');
      if (!userStr) {
        setMessage({ type: 'error', text: 'Vous devez être connecté en tant qu\'admin' });
        setSaving(false);
        return;
      }

      const user = JSON.parse(userStr);
      const adminId = user.id;
      const adminRole = user.role;

      if (adminRole !== 'super_admin') {
        setMessage({ type: 'error', text: 'Seuls les super admins peuvent modifier la politique' });
        setSaving(false);
        return;
      }

      const response = await axios.put(
        `${API_URL}/privacy-policy`,
        { title, content },
        {
          headers: {
            'X-Admin-Id': adminId,
            'X-Admin-Role': adminRole
          }
        }
      );

      setPolicy(response.data);
      setMessage({ type: 'success', text: 'Politique de confidentialité mise à jour avec succès!' });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Erreur lors de la sauvegarde'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="privacy-editor">
        <div className="loading">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="privacy-editor">
      <div className="privacy-editor-header">
        <h1>Gestion de la Politique de Confidentialité</h1>
        <div className="header-actions">
          <button
            className={`btn ${previewMode ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? '✏️ Édition' : '👁️ Aperçu'}
          </button>
          <button
            className="btn btn-success"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Sauvegarde...' : '💾 Sauvegarder'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      {policy && (
        <div className="last-updated">
          Dernière mise à jour : {new Date(policy.last_updated).toLocaleString('fr-FR')}
        </div>
      )}

      {!previewMode ? (
        <div className="editor-form">
          <div className="form-group">
            <label htmlFor="title">Titre</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-control"
              placeholder="Titre de la politique"
            />
          </div>

          <div className="form-group">
            <label htmlFor="content">
              Contenu (Markdown supporté)
              <span className="markdown-hint">
                # Titre, ## Sous-titre, **gras**, *italique*, - liste
              </span>
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="form-control textarea-large"
              placeholder="Contenu de la politique de confidentialité..."
              rows={25}
            />
          </div>
        </div>
      ) : (
        <div className="preview-container">
          <div className="preview-header">
            <h2>Aperçu</h2>
          </div>
          <div className="preview-content">
            <h1 className="preview-title">{title}</h1>
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivacyPolicyEditor;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import { API_URL } from '../../lib/utils';
import AdminLayout from './AdminLayout';

const PrivacyPolicyEditor = (props) => {
  const { user, setUser } = props;
  const isSuperAdmin = user && user.type === 'admin' && user.role === 'super_admin';
  const [policy, setPolicy] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  // Sans contenu chargé, enregistrer écraserait la politique en ligne par un texte vide
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const fetchPolicy = async () => {
      try {
        const response = await axios.get(`${API_URL}/privacy-policy`);
        setPolicy(response.data);
        setTitle(response.data.title);
        setContent(response.data.content);
      } catch (error) {
        console.error('Erreur lors du chargement de la politique:', error);
        setLoadFailed(true);
        setMessage({ type: 'error', text: "Impossible de charger la politique. Rechargez la page pour réessayer ; l'édition reste bloquée tant qu'elle n'est pas chargée." });
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="adm-card max-w-md w-full p-8 text-left">
          <h1 className="adm-title">Accès réservé</h1>
          <p className="adm-subtitle mb-6">Seul un super administrateur peut modifier la politique de confidentialité.</p>
          <Link to="/admin/dashboard" className="adm-btn adm-btn-primary">Retour à l'administration</Link>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await axios.put(
        `${API_URL}/privacy-policy`,
        { title, content },
        {
          headers: {
            'X-Admin-Id': user.id,
            'X-Admin-Role': user.role
          }
        }
      );

      setPolicy(response.data);
      setMessage({ type: 'success', text: 'Politique enregistrée. Elle est visible sur le site.' });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'L\'enregistrement a échoué. Vérifiez votre connexion, puis réessayez.'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      user={user}
      setUser={setUser}
      active="privacy"
      title="Politique de confidentialité"
      description={policy?.last_updated
        ? `Dernière mise à jour le ${new Date(policy.last_updated).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.`
        : 'Texte affiché sur la page publique de confidentialité.'}
      actions={!loading && !loadFailed && (
        <>
          <button type="button" className="adm-btn adm-btn-secondary" onClick={() => setPreviewMode(!previewMode)} aria-pressed={previewMode}>
            {previewMode ? 'Modifier' : 'Aperçu'}
          </button>
          <button type="button" className="adm-btn adm-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </>
      )}
    >
      {message && (
        <p
          role={message.type === 'error' ? 'alert' : 'status'}
          className={`mb-5 p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}
        >
          {message.text}
        </p>
      )}

      {loading ? (
        <div className="space-y-4" aria-busy="true">
          <div className="h-11 rounded-lg loading-shimmer" />
          <div className="h-96 rounded-lg loading-shimmer" />
        </div>
      ) : loadFailed ? null : !previewMode ? (
        <div className="adm-card p-5 sm:p-6 space-y-5">
          <div>
            <label htmlFor="title" className="adm-label">Titre</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="adm-input"
            />
          </div>

          <div>
            <label htmlFor="content" className="adm-label">Contenu</label>
            <p id="content-help" className="text-xs text-gray-500 mb-2">
              Mise en forme Markdown : # Titre, ## Sous-titre, **gras**, *italique*, - liste
            </p>
            <textarea
              id="content"
              aria-describedby="content-help"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="adm-input font-mono text-sm leading-relaxed"
              rows={25}
            />
          </div>
        </div>
      ) : (
        <article className="adm-card p-6 sm:p-10">
          <div className="max-w-[72ch]">
            <h1 className="font-display text-4xl text-purple-950 mb-6">{title}</h1>
            <div className="policy-content">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          </div>
        </article>
      )}
    </AdminLayout>
  );
};

export default PrivacyPolicyEditor;

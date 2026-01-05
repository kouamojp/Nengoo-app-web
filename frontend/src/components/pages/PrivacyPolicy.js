import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8001/api';

const PrivacyPolicy = () => {
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      const response = await axios.get(`${API_URL}/privacy-policy`);
      setPolicy(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement de la politique:', error);
      setError('Erreur lors du chargement de la politique de confidentialité');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="privacy-policy-page">
        <div className="container">
          <div className="loading">Chargement...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="privacy-policy-page">
        <div className="container">
          <div className="error">{error}</div>
        </div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="privacy-policy-page">
        <div className="container">
          <div className="error">Politique de confidentialité non disponible</div>
        </div>
      </div>
    );
  }

  return (
    <div className="privacy-policy-page">
      <div className="container">
        <div className="policy-header">
          <h1>{policy.title}</h1>
          <p className="last-updated">
            Dernière mise à jour : {new Date(policy.last_updated).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </p>
        </div>

        <div className="policy-content">
          <ReactMarkdown>{policy.content}</ReactMarkdown>
        </div>

        <div className="policy-footer">
          <a href="/" className="back-link">← Retour à l'accueil</a>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

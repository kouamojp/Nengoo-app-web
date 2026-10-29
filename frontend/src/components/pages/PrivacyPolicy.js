import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { API_URL } from '../../lib/utils';
import Header from '../layout/Header';
import Footer from '../layout/Footer';

const PrivacyPolicy = (props) => {
  const { language } = props;
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/privacy-policy`);
      setPolicy(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement de la politique:', error);
      setError('Impossible de charger la politique de confidentialité. Vérifiez votre connexion, puis réessayez.');
    } finally {
      setLoading(false);
    }
  };

  let body;
  if (loading) {
    body = (
      <div className="space-y-4" aria-busy="true">
        <div className="h-12 w-3/4 rounded loading-shimmer" />
        <div className="h-4 w-40 rounded loading-shimmer" />
        {[...Array(6)].map((_, i) => <div key={i} className="h-4 w-full rounded loading-shimmer" />)}
      </div>
    );
  } else if (error || !policy) {
    body = (
      <div className="py-12 px-6 bg-white rounded-xl border border-gray-200 text-center" role="alert">
        <p className="text-gray-800">{error || 'La politique de confidentialité n\'est pas encore publiée.'}</p>
        {error && (
          <button type="button" onClick={fetchPolicy} className="mt-5 inline-flex items-center h-11 px-5 rounded-full bg-purple-700 text-white font-semibold hover:bg-purple-800">
            Réessayer
          </button>
        )}
      </div>
    );
  } else {
    body = (
      <article>
        <header className="pb-6 mb-8 border-b border-gray-200">
          <h1 className="font-display text-4xl sm:text-5xl text-purple-950">{policy.title}</h1>
          {policy.last_updated && (
            <p className="mt-3 text-sm text-gray-500">
              Dernière mise à jour :{' '}
              <time dateTime={policy.last_updated}>
                {new Date(policy.last_updated).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </time>
            </p>
          )}
        </header>

        <div className="policy-content">
          <ReactMarkdown>{policy.content}</ReactMarkdown>
        </div>
      </article>
    );
  }

  return (
    <>
      <Helmet>
        <title>Politique de confidentialité — Nengoo</title>
        <meta name="description" content="Comment Nengoo collecte, utilise et protège vos données personnelles." />
        <link rel="canonical" href="https://www.nengoo.com/privacy-policy" />
      </Helmet>
      <div className="min-h-screen bg-gray-50 text-left">
        <Header {...props} />

        <main className="container mx-auto px-4 pt-8 sm:pt-12 pb-14">
          <div className="max-w-[72ch] mx-auto">
            {body}
            <p className="mt-12 pt-6 border-t border-gray-200">
              <Link to="/" className="font-semibold text-purple-700 hover:text-purple-900 hover:underline underline-offset-4">
                Retour à l'accueil
              </Link>
            </p>
          </div>
        </main>

        <Footer language={language} />
      </div>
    </>
  );
};

export default PrivacyPolicy;

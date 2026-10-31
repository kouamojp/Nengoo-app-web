import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { API_URL } from '../../lib/utils';
import Header from '../layout/Header';
import Footer from '../layout/Footer';

const inputClass =
  'w-full h-12 border border-gray-300 rounded-lg px-4 text-base focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600';

/**
 * Suppression de compte par son titulaire, acheteur ou vendeur, créé sur le
 * site ou dans l'application mobile. URL déclarée aux stores :
 * https://www.nengoo.com/delete-account
 */
const DeleteAccount = (props) => {
  const { user, setUser, language } = props;
  const loggedIn = user && (user.type === 'buyer' || user.type === 'seller');
  // Compte créé avec Google : pas de mot de passe, la session confirme
  const sessionOnly = loggedIn && user.oauth_provider && user.accessToken;

  const [userType, setUserType] = useState(loggedIn ? user.type : 'buyer');
  const [whatsapp, setWhatsapp] = useState(loggedIn ? user.whatsapp || '' : '');
  const [password, setPassword] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [deleted, setDeleted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!understood) {
      setError('Cochez la case pour confirmer que vous comprenez que la suppression est définitive.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body = sessionOnly && userType === user.type
        ? { userType }
        : { userType, whatsapp, password };
      const response = await fetch(`${API_URL}/account/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof data.detail === 'string' ? data.detail : 'La suppression a échoué. Réessayez.');
      }
      if (loggedIn && user.type === userType) setUser(null);
      setDeleted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const typeButton = (value, label) => (
    <button
      type="button"
      onClick={() => setUserType(value)}
      aria-pressed={userType === value}
      className={`flex-1 h-11 rounded-md font-semibold transition-colors ${
        userType === value ? 'bg-white text-purple-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      <Helmet>
        <title>Supprimer mon compte — Nengoo</title>
        <meta name="description" content="Supprimez définitivement votre compte Nengoo, acheteur ou vendeur, créé sur le site ou dans l'application." />
        <link rel="canonical" href="https://www.nengoo.com/delete-account" />
      </Helmet>
      <div className="min-h-screen bg-gray-50 text-left">
        <Header {...props} />

        <main className="container mx-auto px-4 pt-8 sm:pt-12 pb-14">
          <div className="max-w-[72ch] mx-auto">
            <header className="pb-6 mb-8 border-b border-gray-200">
              <h1 className="font-display text-4xl sm:text-5xl text-purple-950">Supprimer mon compte</h1>
              <p className="mt-3 text-gray-700 text-lg">
                Cette page supprime définitivement votre compte Nengoo, acheteur ou vendeur,
                qu'il ait été créé sur le site ou dans l'application mobile.
              </p>
            </header>

            {deleted ? (
              <section className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8" role="status">
                <h2 className="text-2xl font-bold text-gray-900">Votre compte a été supprimé</h2>
                <p className="mt-3 text-gray-700">
                  Vos informations personnelles ont été effacées. Si vous utilisez l'application mobile,
                  vous pouvez la désinstaller : elle ne contient plus de session active.
                </p>
                <Link to="/" className="mt-6 inline-flex items-center h-11 px-5 rounded-full bg-purple-700 text-white font-semibold hover:bg-purple-800">
                  Retour à l'accueil
                </Link>
              </section>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 gap-6 mb-10">
                  <section>
                    <h2 className="text-lg font-bold text-gray-900">Ce qui est supprimé</h2>
                    <ul className="mt-2 space-y-1.5 text-gray-700 list-disc pl-5">
                      <li>votre compte et votre profil (nom, numéro, e-mail, mot de passe) ;</li>
                      <li>pour un vendeur : la boutique et tous ses produits ;</li>
                      <li>vos notifications, conversations, favoris et statistiques.</li>
                    </ul>
                  </section>
                  <section>
                    <h2 className="text-lg font-bold text-gray-900">Ce qui est conservé</h2>
                    <ul className="mt-2 space-y-1.5 text-gray-700 list-disc pl-5">
                      <li>
                        les commandes passées, pendant la durée légale de conservation des pièces
                        comptables, sans votre nom ni vos coordonnées ;
                      </li>
                      <li>vos avis sur les produits, affichés sans votre nom.</li>
                    </ul>
                  </section>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 space-y-5" noValidate>
                  <div>
                    <span className="block text-sm font-semibold text-gray-900 mb-2">Type de compte</span>
                    <div className="flex gap-1 p-1 bg-gray-100 rounded-lg" role="group" aria-label="Type de compte">
                      {typeButton('buyer', 'Acheteur')}
                      {typeButton('seller', 'Vendeur')}
                    </div>
                  </div>

                  {sessionOnly && userType === user.type ? (
                    <p className="text-gray-700">
                      Vous êtes connecté avec Google : votre session suffit pour confirmer la suppression.
                    </p>
                  ) : (
                    <>
                      <div>
                        <label htmlFor="del-whatsapp" className="block text-sm font-semibold text-gray-900 mb-2">
                          Numéro WhatsApp du compte
                        </label>
                        <input
                          id="del-whatsapp"
                          type="tel"
                          autoComplete="tel"
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(e.target.value)}
                          placeholder="+237 6XX XX XX XX"
                          required
                          className={inputClass}
                        />
                        <p className="mt-1.5 text-sm text-gray-500">
                          Hors du Cameroun, indiquez l'indicatif du pays (+1, +7…).
                        </p>
                      </div>
                      <div>
                        <label htmlFor="del-password" className="block text-sm font-semibold text-gray-900 mb-2">
                          Mot de passe
                        </label>
                        <input
                          id="del-password"
                          type="password"
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className={inputClass}
                        />
                        <p className="mt-1.5 text-sm text-gray-500">
                          Mot de passe oublié ?{' '}
                          <Link to={`/forgot-password?type=${userType}`} className="font-semibold text-purple-700 hover:underline underline-offset-4">
                            Réinitialisez-le
                          </Link>{' '}
                          puis revenez sur cette page.
                        </p>
                      </div>
                    </>
                  )}

                  <label className="flex items-start gap-3 text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={understood}
                      onChange={(e) => setUnderstood(e.target.checked)}
                      className="mt-1 h-5 w-5 rounded border-gray-300 text-red-600 focus:ring-red-600"
                    />
                    <span>Je comprends que la suppression est définitive et que mon compte ne pourra pas être récupéré.</span>
                  </label>

                  {error && (
                    <p className="p-3 rounded-lg bg-red-50 text-red-800 text-sm" role="alert">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-12 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
                  >
                    {submitting ? 'Suppression…' : 'Supprimer définitivement mon compte'}
                  </button>
                </form>

                <p className="mt-6 text-gray-700">
                  Vous ne pouvez plus vous connecter à votre compte ? Écrivez à{' '}
                  <a href="mailto:contact@nengoo.com?subject=Suppression%20de%20compte" className="font-semibold text-purple-700 hover:underline underline-offset-4">
                    contact@nengoo.com
                  </a>{' '}
                  avec le numéro WhatsApp du compte : nous le supprimons sous 30 jours.
                </p>
              </>
            )}
          </div>
        </main>

        <Footer language={language} />
      </div>
    </>
  );
};

export default DeleteAccount;

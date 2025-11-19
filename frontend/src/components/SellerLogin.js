import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { translations } from './common';
import { login } from '../services/api';
import Header from './Header';
import Footer from './Footer';

// Seller Login Component
export const SellerLogin = (props) => {
  const { language, setUser } = props;
  const navigate = useNavigate();
  const t = translations[language];
  const [formData, setFormData] = useState({
    whatsapp: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Login seller
      const response = await login(formData.whatsapp, formData.password, 'seller');
      const userData = {
        ...response.user,
        token: response.access_token
      };
      setUser(userData);
      localStorage.setItem('nengoo-user', JSON.stringify(userData));

      // Redirect to seller dashboard
      navigate('/seller');
    } catch (err) {
      if (err.message && err.message.includes("n'est pas encore approuvé")) {
        setError("Votre compte vendeur n'est pas encore approuvé par l'administrateur. Vous recevrez une notification une fois approuvé.");
      } else {
        setError(err.message || 'Une erreur est survenue lors de la connexion');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header {...props} />

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🏪</div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Connexion Vendeur
              </h1>
              <p className="text-gray-600">
                Connectez-vous pour gérer votre boutique
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  {t.whatsappNumber} *
                </label>
                <input
                  type="tel"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleInputChange}
                  placeholder="+237 6XX XXX XXX"
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Mot de passe *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connexion en cours...
                  </span>
                ) : (
                  t.login
                )}
              </button>
            </form>

            <div className="mt-6 space-y-3">
              <div className="text-center">
                <Link to="/signup/seller" className="text-purple-600 hover:text-purple-700 text-sm font-medium">
                  {t.noAccount} Devenir vendeur
                </Link>
              </div>

              <div className="text-center">
                <Link to="/login" className="text-gray-600 hover:text-gray-700 text-sm">
                  ← Choisir un autre type de compte
                </Link>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="text-2xl mr-3">📋</div>
              <div>
                <h3 className="font-semibold text-purple-900 mb-1">
                  Devenir vendeur sur Nengoo
                </h3>
                <p className="text-sm text-purple-800 mb-2">
                  Créez votre compte vendeur et vendez vos produits à travers tout le Cameroun !
                </p>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>✓ Inscription gratuite</li>
                  <li>✓ Gestion simple de vos produits</li>
                  <li>✓ Paiements sécurisés</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer language={language} />
    </div>
  );
};

export default SellerLogin;

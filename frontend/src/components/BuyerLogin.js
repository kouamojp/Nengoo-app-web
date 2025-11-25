import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { translations } from './common';
import { login } from '../services/api';
import Header from './Header';
import Footer from './Footer';

// Buyer Login Component
export const BuyerLogin = (props) => {
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
      // Login buyer
      const response = await login(formData.whatsapp, formData.password, 'buyer');
      const userData = {
        ...response.user,
        token: response.access_token
      };
      setUser(userData);
      localStorage.setItem('nengoo-user', JSON.stringify(userData));

      // Vérifier s'il y a une URL de redirection sauvegardée
      const redirectUrl = localStorage.getItem('redirectAfterLogin');

      if (redirectUrl) {
        // Supprimer l'URL de redirection du localStorage
        localStorage.removeItem('redirectAfterLogin');
        // Rediriger vers l'URL sauvegardée
        navigate(redirectUrl);
      } else {
        // Redirection par défaut vers la page d'accueil
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue lors de la connexion');
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
              <div className="text-6xl mb-4">👤</div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Connexion client
              </h1>
              <p className="text-gray-600">
                Connectez-vous pour continuer vos achats
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
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
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
                <Link to="/signup/buyer" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  {t.noAccount} Créer un compte
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
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="text-2xl mr-3">ℹ️</div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  Première visite ?
                </h3>
                <p className="text-sm text-blue-800">
                  Créez un compte client gratuitement pour commander vos produits préférés et suivre vos commandes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer language={language} />
    </div>
  );
};

export default BuyerLogin;

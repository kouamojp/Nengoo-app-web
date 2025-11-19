
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { translations } from './common';
import { registerBuyer, login } from '../services/api';
import Header from './Header';
import Footer from './Footer';

// Buyer Signup Component
export const BuyerSignup = (props) => {
  const { language, setUser } = props;
  const navigate = useNavigate();
  const t = translations[language];
  const [formData, setFormData] = useState({
    whatsapp: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLogin, setIsLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validatePassword = () => {
    if (!isLogin) {
      if (formData.password.length < 6) {
        setPasswordError('Le mot de passe doit contenir au moins 6 caractères');
        return false;
      }
      // Maximum practical length (SHA-256 preprocessing handles any length)
      if (formData.password.length > 1000) {
        setPasswordError('Le mot de passe ne peut pas dépasser 1000 caractères');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setPasswordError('Les mots de passe ne correspondent pas');
        return false;
      }
    }
    setPasswordError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validatePassword()) {
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Login existing buyer
        const response = await login(formData.whatsapp, formData.password, 'buyer');
        const userData = {
          ...response.user,
          token: response.access_token
        };
        setUser(userData);
        localStorage.setItem('nengoo-user', JSON.stringify(userData));
        navigate('/');
      } else {
        // Register new buyer
        const buyerData = {
          whatsapp: formData.whatsapp,
          name: formData.name,
          email: formData.email,
          password: formData.password
        };
        const response = await registerBuyer(buyerData);
        const userData = {
          ...response.user,
          token: response.access_token
        };
        setUser(userData);
        localStorage.setItem('nengoo-user', JSON.stringify(userData));
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue');
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
              <div className="text-5xl mb-4">👤</div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                {isLogin ? t.buyerLogin : t.signupAsBuyer}
              </h1>
              <p className="text-gray-600">
                {isLogin ? t.welcomeBack : "Créez votre compte acheteur"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">{t.whatsappNumber}</label>
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
                <label className="block text-sm font-medium mb-2">Mot de passe *</label>
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
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Confirmer le mot de passe *</label>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      placeholder="••••••••"
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Nom complet</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Votre nom complet"
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="votre@email.com"
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {(passwordError || error) && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {passwordError || error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Chargement...' : (isLogin ? t.login : t.createAccount)}
              </button>
            </form>

            <div className="text-center mt-6">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                {isLogin ? t.noAccount : t.haveAccount} {isLogin ? t.signup : t.login}
              </button>
            </div>

            <div className="text-center mt-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-700 text-sm">
                ← Choisir un autre type de compte
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <Footer language={language} />
    </div>
  );
};

export default BuyerSignup;

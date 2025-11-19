
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { translations, cameroonCities } from './common';
import { registerSeller, login } from '../services/api';
import Header from './Header';
import Footer from './Footer';

// Seller Signup Component  
export const SellerSignup = (props) => {
  const { language, setUser } = props;
  const navigate = useNavigate();
  const t = translations[language];
  const [formData, setFormData] = useState({
    whatsapp: '',
    name: '',
    businessName: '',
    email: '',
    city: '',
    categories: [],
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

  const handleCategoryChange = (category) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
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
        // Login existing seller
        const response = await login(formData.whatsapp, formData.password, 'seller');
        const userData = {
          ...response.user,
          token: response.access_token
        };
        setUser(userData);
        localStorage.setItem('nengoo-user', JSON.stringify(userData));
        navigate('/seller');
      } else {
        // Register new seller
        const sellerData = {
          whatsapp: formData.whatsapp,
          name: formData.name,
          businessName: formData.businessName,
          email: formData.email,
          city: formData.city,
          categories: formData.categories,
          password: formData.password
        };
        const response = await registerSeller(sellerData);
        // Navigate to pending approval with seller info
        navigate('/pending-approval', { state: { seller: response.seller } });
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const categoryOptions = [
    { key: 'clothing_accessories', label: 'Vêtements et Accessoires', icon: '👗' },
    { key: 'food_drinks', label: 'Aliments et Boissons', icon: '🍽️' },
    { key: 'electronics', label: 'Électroniques', icon: '📱' },
    { key: 'home_garden', label: 'Maison & Jardinage', icon: '🏠' },
    { key: 'handicrafts', label: 'Artisanat et Produits Faits Main', icon: '🎨' },
    { key: 'beauty_care', label: 'Produits de Beauté et Soins Personnels', icon: '💄' },
    { key: 'sports_articles', label: 'Articles Sportifs', icon: '⚽' },
    { key: 'toys', label: 'Jouets pour Enfants', icon: '🧸' },
    { key: 'medical_equipment', label: 'Matériel Médical', icon: '🏥' },
    { key: 'professional_equipment', label: 'Équipements Professionnels', icon: '🔧' },
    { key: 'services', label: 'Services', icon: '🛠️' },
    { key: 'travel_tickets', label: 'Voyages et Billets', icon: '✈️' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header {...props} />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🏪</div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                {isLogin ? t.sellerLogin : t.signupAsSeller}
              </h1>
              <p className="text-gray-600">
                {isLogin ? t.welcomeBack : "Inscrivez-vous pour vendre vos produits"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">{t.whatsappNumber} *</label>
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
                  <label className="block text-sm font-medium mb-2">Mot de passe *</label>
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
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Nom complet *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Votre nom complet"
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">{t.businessName} *</label>
                      <input
                        type="text"
                        name="businessName"
                        value={formData.businessName}
                        onChange={handleInputChange}
                        placeholder="Nom de votre entreprise"
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">{t.email} *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="votre@email.com"
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">{t.city} *</label>
                      <select
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">{t.selectCity}</option>
                        {cameroonCities.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium mb-4">{t.selectCategories} *</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {categoryOptions.map(category => (
                      <label key={category.key} className="flex flex-col items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={formData.categories.includes(category.key)}
                          onChange={() => handleCategoryChange(category.key)}
                          className="sr-only"
                        />
                        <div className={`text-2xl mb-1 ${formData.categories.includes(category.key) ? 'opacity-100' : 'opacity-50'}`}>
                          {category.icon}
                        </div>
                        <span className={`text-xs text-center ${formData.categories.includes(category.key) ? 'font-semibold text-purple-700' : 'text-gray-600'}`}>
                          {category.label}
                        </span>
                      </label>
                    ))}
                  </div>
                  {formData.categories.length === 0 && (
                    <p className="text-sm text-red-500 mt-2">Veuillez sélectionner au moins une catégorie</p>
                  )}
                </div>
              )}

              {(passwordError || error) && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {passwordError || error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (!isLogin && formData.categories.length === 0)}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Chargement...' : (isLogin ? t.login : "Soumettre ma candidature")}
              </button>
            </form>

            <div className="text-center mt-6">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-purple-600 hover:text-purple-700 text-sm"
              >
                {isLogin ? t.noAccount : t.haveAccount} {isLogin ? "S\'inscrire" : t.login}
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

export default SellerSignup;

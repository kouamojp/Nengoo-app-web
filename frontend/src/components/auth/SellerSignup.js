
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { translations } from '../../lib/translations';
import { mockUsers, cameroonCities } from '../../lib/mockData';
import Header from '../layout/Header';
import Footer from '../layout/Footer';

const SellerSignup = (props) => {
  const { language, setUser } = props;
  const navigate = useNavigate();
  const t = translations[language];
  const [formData, setFormData] = useState({
    whatsapp: '',
    name: '',
    businessName: '',
    email: '',
    city: '',
    categories: []
  });
  const [isLogin, setIsLogin] = useState(false);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isLogin) {
      // Check if seller exists and is approved
      const existingSeller = mockUsers.sellers.find(user => user.whatsapp === formData.whatsapp);
      if (existingSeller && existingSeller.status === 'approved') {
        setUser(existingSeller);
        localStorage.setItem('nengoo-user', JSON.stringify(existingSeller));
        navigate('/seller');
      } else {
        alert('Compte vendeur non trouvé ou non approuvé. Veuillez contacter l\'administrateur.');
      }
    } else {
      // Register new seller
      const newSeller = {
        id: Date.now(), // ID unique basé sur timestamp
        whatsapp: formData.whatsapp,
        name: formData.name,
        businessName: formData.businessName,
        email: formData.email,
        city: formData.city,
        categories: formData.categories,
        status: 'pending',
        submitDate: new Date().toISOString().split('T')[0],
        type: 'seller'
      };
      
      // Sauvegarder dans localStorage pour persistance
      const existingPendingSellers = JSON.parse(localStorage.getItem('nengoo-pending-sellers') || '[]');
      existingPendingSellers.push(newSeller);
      localStorage.setItem('nengoo-pending-sellers', JSON.stringify(existingPendingSellers));
      
      mockUsers.pendingSellers.push(newSeller);
      navigate('/pending-approval', { state: { seller: newSeller } });
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

                {!isLogin && (
                  <>
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

              <button
                type="submit"
                disabled={!isLogin && formData.categories.length === 0}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLogin ? t.login : "Soumettre ma candidature"}
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

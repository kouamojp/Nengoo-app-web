
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2'; // Import SweetAlert2
import { translations } from '../../lib/translations';
import { mockUsers, cameroonCities } from '../../lib/mockData';
import Header from '../layout/Header';
import Footer from '../layout/Footer';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const SellerSignup = (props) => {
  const { language, setUser, isLoginDefault = false } = props;
  const navigate = useNavigate();
  const t = translations[language];
  const [formData, setFormData] = useState({
    whatsapp: '',
    password: '',
    name: '',
    businessName: '',
    email: '',
    city: '',
    region: '',
    address: '',
    description: '',
  });
  const [isLogin, setIsLogin] = useState(isLoginDefault);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLogin) {
      try {
        const response = await fetch(`${API_BASE_URL}/sellers/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            whatsapp: formData.whatsapp,
            password: formData.password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || 'Failed to login');
        }

        setUser(data);
        localStorage.setItem('nengoo-user', JSON.stringify(data));
        Swal.fire({
          icon: 'success',
          title: 'Connecté!',
          text: 'Vous êtes connecté avec succès.',
          showConfirmButton: false,
          timer: 1500
        });
        navigate('/seller');
      } catch (error) {
        console.error('Login error:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur de connexion',
          text: error.message,
        });
      }
    } else {
      // Register new seller
      try {
        const response = await fetch(`${API_BASE_URL}/sellers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error('Signup error response:', data);
          const errorDetail = data.detail && Array.isArray(data.detail) 
            ? data.detail.map(err => `${err.loc.join(' -> ')}: ${err.msg}`).join('; ')
            : (data.detail || 'Failed to signup');
          throw new Error(errorDetail);
        }
        
        Swal.fire({
          icon: 'success',
          title: 'Inscription en attente!',
          text: 'Votre demande d\'inscription a été soumise avec succès. Veuillez attendre l\'approbation de l\'administrateur.',
          showConfirmButton: false,
          timer: 2000
        });
        navigate('/pending-approval', { state: { seller: data } });

      } catch (error) {
        console.error('Signup error:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur d\'inscription',
          text: error.message,
        });
      }
    }
  };

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
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Votre mot de passe"
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {isLogin && (
                    <div className="text-right mt-1">
                        <Link to="/forgot-password?type=seller" className="text-sm text-purple-600 hover:text-purple-700">
                            Mot de passe oublié ?
                        </Link>
                    </div>
                  )}
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

                    <div>
                      <label className="block text-sm font-medium mb-2">{t.region} *</label>
                      <input
                        type="text"
                        name="region"
                        value={formData.region}
                        onChange={handleInputChange}
                        placeholder="Votre région"
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">{t.address} *</label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Votre adresse"
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium mb-2">Description *</label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Décrivez votre entreprise"
                        required
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </>
                )}
              </div>

              <button
                type="submit"
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

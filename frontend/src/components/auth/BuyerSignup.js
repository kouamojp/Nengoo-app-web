
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2'; // Import SweetAlert2
import { translations } from '../../lib/translations';
import { mockUsers } from '../../lib/mockData';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import SocialLoginButtons from './SocialLoginButtons';

const BuyerSignup = (props) => {
  const { language, setUser, isLoginDefault = false } = props;
  const navigate = useNavigate();
  const t = translations[language];
  const [formData, setFormData] = useState({
    whatsapp: '',
    name: '',
    password: '',
    email: ''
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
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';
    
    if (isLogin) {
      try {
        const response = await fetch(`${API_BASE_URL}/buyers/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            whatsapp: formData.whatsapp,
            password: formData.password,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to login');
        }

        const loggedInUser = await response.json();
        setUser(loggedInUser);
        localStorage.setItem('nengoo-user', JSON.stringify(loggedInUser));
        Swal.fire({
          icon: 'success',
          title: 'Connecté!',
          text: 'Vous êtes connecté avec succès.',
          showConfirmButton: false,
          timer: 1500
        });
        navigate('/');
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Erreur de connexion',
          text: error.message,
        });
      }
    } else {
      // Register new buyer by calling the backend
      try {
        const newBuyerData = {
          whatsapp: formData.whatsapp,
          name: formData.name,
          password: formData.password,
          email: formData.email,
        };

        const response = await fetch(`${API_BASE_URL}/buyers/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newBuyerData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to register');
        }

        const newBuyer = await response.json();
        
        setUser(newBuyer);
        localStorage.setItem('nengoo-user', JSON.stringify(newBuyer));
        Swal.fire({
          icon: 'success',
          title: 'Inscription réussie!',
          text: 'Votre compte acheteur a été créé avec succès.',
          showConfirmButton: false,
          timer: 1500
        });
        navigate('/');
      } catch (error) {
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

              {!isLogin && (
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
              )}

              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium mb-2">Adresse e-mail</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Votre adresse e-mail"
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">{isLogin ? "Mot de passe" : "Créer un mot de passe"}</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="********"
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {isLogin && (
                    <div className="text-right mt-1">
                        <Link to="/forgot-password?type=buyer" className="text-sm text-blue-600 hover:text-blue-700">
                            Mot de passe oublié ?
                        </Link>
                    </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-shadow"
              >
                {isLogin ? t.login : t.createAccount}
              </button>
            </form>

            {/* Social Login Buttons */}
           {/*  <div className="mt-6">
              <SocialLoginButtons
                userType="buyer"
                setUser={setUser}
                mode={isLogin ? 'login' : 'signup'}
              />
            </div> */}

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

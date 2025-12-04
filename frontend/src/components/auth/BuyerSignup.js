
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { translations } from '../../lib/translations';
import { mockUsers } from '../../lib/mockData';
import Header from '../layout/Header';
import Footer from '../layout/Footer';

const BuyerSignup = (props) => {
  const { language, setUser } = props;
  const navigate = useNavigate();
  const t = translations[language];
  const [formData, setFormData] = useState({
    whatsapp: '',
    name: ''
  });
  const [isLogin, setIsLogin] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isLogin) {
      // Check if user exists
      const existingUser = mockUsers.buyers.find(user => user.whatsapp === formData.whatsapp);
      if (existingUser) {
        setUser(existingUser);
        localStorage.setItem('nengoo-user', JSON.stringify(existingUser));
        navigate('/');
      } else {
        alert('Numéro WhatsApp non trouvé. Veuillez vous inscrire d\'abord.');
      }
    } else {
      // Register new buyer
      const newBuyer = {
        id: mockUsers.buyers.length + 1,
        whatsapp: formData.whatsapp,
        name: formData.name,
        joinDate: new Date().toISOString().split('T')[0],
        type: "buyer"
      };
      
      mockUsers.buyers.push(newBuyer);
      setUser(newBuyer);
      localStorage.setItem('nengoo-user', JSON.stringify(newBuyer));
      navigate('/');
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

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-shadow"
              >
                {isLogin ? t.login : t.createAccount}
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

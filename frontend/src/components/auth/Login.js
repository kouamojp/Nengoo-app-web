
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { translations } from '../../lib/translations';
import Header from '../layout/Header';
import Footer from '../layout/Footer';

const Login = (props) => {
  const { language, setUser } = props;
  const navigate = useNavigate();
  const t = translations[language];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header {...props} />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🛍️</div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Bienvenue sur Nengoo</h1>
              <p className="text-gray-600">Choisissez votre type de compte</p>
            </div>

            <div className="space-y-4">
              <Link
                to="/signup/buyer"
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-center block hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-center space-x-3">
                  <span className="text-2xl">👤</span>
                  <div>
                    <div className="font-bold">{t.loginAsBuyer}</div>
                    <div className="text-sm opacity-90">Acheter des produits</div>
                  </div>
                </div>
              </Link>

              <Link
                to="/signup/seller"
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-4 px-6 rounded-lg font-semibold text-center block hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-center space-x-3">
                  <span className="text-2xl">🏪</span>
                  <div>
                    <div className="font-bold">{t.loginAsSeller}</div>
                    <div className="text-sm opacity-90">Vendre vos produits</div>
                  </div>
                </div>
              </Link>
            </div>

            <div className="text-center mt-8">
              <Link to="/" className="text-purple-600 hover:text-purple-700 text-sm">
                {t.backToHome}
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <Footer language={language} />
    </div>
  );
};

export default Login;

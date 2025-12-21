
import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import Header from '../layout/Header';
import Footer from '../layout/Footer';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const ForgotPassword = (props) => {
  const { language } = props;
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') || 'buyer';
  
  const [email, setEmail] = useState('');
  const [userType, setUserType] = useState(initialType);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          user_type: userType
        }),
      });

      // We always show success message for security reasons (unless server error)
      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Email envoyé',
          text: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.',
          confirmButtonColor: '#3085d6',
        });
      } else {
         const data = await response.json();
         throw new Error(data.detail || 'Une erreur est survenue');
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: error.message,
      });
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
              <div className="text-5xl mb-4">🔐</div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                Mot de passe oublié
              </h1>
              <p className="text-gray-600">
                Entrez votre email pour réinitialiser votre mot de passe
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Type Selection */}
              <div className="flex justify-center space-x-4 mb-6">
                <button
                    type="button"
                    onClick={() => setUserType('buyer')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        userType === 'buyer'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                    Acheteur
                </button>
                <button
                    type="button"
                    onClick={() => setUserType('seller')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        userType === 'seller'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                    Vendeur
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Adresse e-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-shadow ${
                    userType === 'buyer' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-purple-500 to-purple-600'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Envoi...' : 'Envoyer le lien'}
              </button>
            </form>

            <div className="text-center mt-6">
              <Link to={userType === 'buyer' ? "/login/buyer" : "/login/seller"} className="text-gray-600 hover:text-gray-700 text-sm">
                ← Retour à la connexion
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <Footer language={language} />
    </div>
  );
};

export default ForgotPassword;

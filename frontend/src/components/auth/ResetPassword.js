
import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Header from '../layout/Header';
import Footer from '../layout/Footer';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const ResetPassword = (props) => {
  const { language } = props;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get('token');
  const userType = searchParams.get('type');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!token || !userType) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Lien invalide</h1>
                <p className="mb-4">Le lien de réinitialisation est incomplet ou invalide.</p>
                <Link to="/" className="text-blue-600 hover:underline">Retour à l'accueil</Link>
            </div>
        </div>
      );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
        Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: 'Les mots de passe ne correspondent pas.',
        });
        return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          new_password: password,
          user_type: userType
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: 'Votre mot de passe a été réinitialisé avec succès.',
          confirmButtonColor: '#3085d6',
        }).then(() => {
            navigate(userType === 'buyer' ? '/login/buyer' : '/login/seller');
        });
      } else {
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
              <div className="text-5xl mb-4">🔑</div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                Nouveau mot de passe
              </h1>
              <p className="text-gray-600">
                Créez votre nouveau mot de passe
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div>
                <label className="block text-sm font-medium mb-2">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="********"
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
                {loading ? 'Réinitialiser...' : 'Réinitialiser le mot de passe'}
              </button>
            </form>
          </div>
        </div>
      </div>
      
      <Footer language={language} />
    </div>
  );
};

export default ResetPassword;

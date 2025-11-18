
import React from 'react';
import { Link } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

// User Profile Component
export const UserProfile = (props) => {
  const { language } = props;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header {...props} />
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Profil Utilisateur</h2>
        <p className="text-gray-600 mb-8">Fonctionnalité en cours de développement</p>
        <Link to="/" className="text-purple-600 hover:text-purple-700">
          ← Retour à l'accueil
        </Link>
      </div>
      <Footer language={language} />
    </div>
  );
};

export default UserProfile;

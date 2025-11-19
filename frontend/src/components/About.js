
import React from 'react';
import { Link } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

// About Component
export const About = (props) => {
  const { language } = props;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header {...props} />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold mb-6">À propos de Nengoo</h1>
            <p className="text-xl text-gray-600">
              Votre marketplace camerounaise de confiance depuis 2025
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-12 items-center mb-16">
            <div>
              <img
                src="https://images.pexels.com/photos/13086663/pexels-photo-13086663.jpeg"
                alt="About Nengoo"
                className="rounded-lg shadow-lg h-80 w-full object-cover object-bottom"
              />
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-6">Notre Mission</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Nengoo a été créé avec pour mission de connecter les consommateurs camerounais 
                aux meilleurs produits locaux et internationaux, tout en soutenant l'économie locale 
                et l'artisanat traditionnel.
              </p>
              <p className="text-gray-700 leading-relaxed">
                Nous croyons fermement au potentiel du commerce électronique pour transformer 
                l'économie camerounaise et offrir de nouvelles opportunités aux entrepreneurs locaux.
              </p>
            </div>
            
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-bold mb-2">Qualité Garantie</h3>
              <p className="text-gray-600">Tous nos produits sont soigneusement sélectionnés et vérifiés.</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🚚</div>
              <h3 className="text-xl font-bold mb-2">Livraison Rapide</h3>
              <p className="text-gray-600">Livraison dans tout le Cameroun avec suivi en temps réel.</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-bold mb-2">Support 24/7</h3>
              <p className="text-gray-600">Notre équipe est toujours là pour vous aider.</p>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-600 to-red-600 text-white rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Rejoignez la famille Nengoo</h2>
            <p className="mb-6">Découvrez les meilleurs produits du Cameroun et d'ailleurs</p>
            <Link
              to="/catalog"
              className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Commencer mes achats
            </Link>
          </div>
        </div>
      </div>
      
      <Footer language={language} />
    </div>
  );
};

export default About;

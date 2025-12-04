
import React from 'react';
import { Link } from 'react-router-dom';
import { translations } from '../../lib/translations';

const Footer = ({ language }) => {
  const t = translations[language];
  
  const handleStoreClick = (store) => {
    if (store === 'android') {
      alert('🤖 Application Android\n\nL\'application sera bientôt disponible sur Google Play Store!\n\nEn attendant, vous pouvez installer la version PWA en cliquant sur le bouton "Installer l\'App" en haut de la page.');
    } else {
      alert('🍎 Application iOS\n\nL\'application sera bientôt disponible sur Apple App Store!\n\nEn attendant, vous pouvez installer la version PWA:\n\niOS: Appuyez sur Partager (□↑) puis "Sur l\'écran d\'accueil"');
    }
  };
  
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          {/* Company Info */}
          <div>
            <div className="mb-4">
              <img 
                src="/images/logo-nengoo.png" 
                alt="Nengoo Logo" 
                className="h-12 w-auto mb-2"
              />
              <p className="text-sm opacity-75">nengoo.com</p>
            </div>
            <p className="text-gray-300 mb-4 w-80">
              {t.footerText}
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-2xl hover:text-purple-400 transition-colors">📘</a>
              <a href="#" className="text-2xl hover:text-purple-400 transition-colors">📧</a>
              <a href="#" className="text-2xl hover:text-purple-400 transition-colors">📷</a>
              <a href="#" className="text-2xl hover:text-purple-400 transition-colors">🐦</a>
            </div>
          </div>

          {/* Quick Links */}
        {/*   <div>
            <h4 className="text-lg font-semibold mb-4">{t.about}</h4>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-gray-300 hover:text-white transition-colors">{t.about}</Link></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">{t.contact}</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">{t.help}</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">{t.terms}</a></li>
            </ul>
          </div> */}

          {/* Categories */}
          <div>
            <h4 className="text-lg font-semibold mb-4">{t.categories}</h4>
            <ul className="space-y-2">
              <li><Link to="/catalog/clothing_accessories" className="text-gray-300 hover:text-white transition-colors">{t.clothing_accessories}</Link></li>
              <li><Link to="/catalog/electronics" className="text-gray-300 hover:text-white transition-colors">{t.electronics}</Link></li>
              <li><Link to="/catalog/handicrafts" className="text-gray-300 hover:text-white transition-colors">{t.handicrafts}</Link></li>
              <li><Link to="/catalog/food_drinks" className="text-gray-300 hover:text-white transition-colors">{t.food_drinks}</Link></li>
            </ul>
          </div>

          {/* Download App */}
          <div>
            <h4 className="text-lg font-semibold mb-4">📱 Télécharger l'App</h4>
            <p className="text-gray-300 mb-4 text-sm">Installez Nengoo sur votre mobile</p>
            
            {/* Google Play Badge */}
            <button 
              onClick={() => handleStoreClick('android')}
              className="w-full bg-black hover:bg-gray-800 rounded-lg p-3 mb-3 transition-all hover:scale-105 flex items-center space-x-3 border border-gray-700"
            >
              <div className="text-3xl">📱</div>
              <div className="text-left">
                <div className="text-xs text-gray-400">Disponible sur</div>
                <div className="text-sm font-semibold">Google Play</div>
              </div>
            </button>

            {/* App Store Badge */}
            <button 
              onClick={() => handleStoreClick('ios')}
              className="w-full bg-black hover:bg-gray-800 rounded-lg p-3 mb-3 transition-all hover:scale-105 flex items-center space-x-3 border border-gray-700"
            >
              <div className="text-3xl">🍎</div>
              <div className="text-left">
                <div className="text-xs text-gray-400">Télécharger sur</div>
                <div className="text-sm font-semibold">App Store</div>
              </div>
            </button>

            {/* PWA Install */}
            <div className="bg-purple-900 bg-opacity-50 rounded-lg p-3 border border-purple-700">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">⚡</span>
                <span className="text-xs font-semibold text-yellow-300">Installation Rapide</span>
              </div>
              <p className="text-xs text-gray-300">
                Installez maintenant en 1 clic depuis cette page (PWA)
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2025 Nengoo. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

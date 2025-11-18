
import React from 'react';
import { Link } from 'react-router-dom';
import { translations } from './common';

// Footer Component
const Footer = ({ language }) => {
  const t = translations[language];
  
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-purple-600 rounded-lg p-2">
                <span className="text-2xl font-bold">🛍️</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">Nengoo</h3>
                <p className="text-sm opacity-75">nengoo.com</p>
              </div>
            </div>
            <p className="text-gray-300 mb-4">
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
          <div>
            <h4 className="text-lg font-semibold mb-4">{t.about}</h4>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-gray-300 hover:text-white transition-colors">{t.about}</Link></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">{t.contact}</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">{t.help}</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">{t.terms}</a></li>
            </ul>
          </div>

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

          {/* Newsletter */}
          <div>
            <h4 className="text-lg font-semibold mb-4">{t.newsletter}</h4>
            <p className="text-gray-300 mb-4">Recevez nos dernières offres et nouveautés</p>
            <div className="flex">
              <input
                type="email"
                placeholder={t.email}
                className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-l-lg focus:outline-none focus:bg-gray-600"
              />
              <button className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-r-lg transition-colors">
                {t.subscribe}
              </button>
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

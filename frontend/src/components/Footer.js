
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { translations } from './common';

// Footer Component
const Footer = ({ language }) => {
  const t = translations[language];

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterFeedback, setNewsletterFeedback] = useState({ type: '', message: '' });

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8001/api';

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!newsletterEmail) {
      setNewsletterFeedback({ type: 'error', message: 'Veuillez entrer une adresse email.' });
      return;
    }

    setNewsletterLoading(true);
    setNewsletterFeedback({ type: '', message: '' });

    try {
      const response = await fetch(`${API_BASE_URL}/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newsletterEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Une erreur est survenue.');
      }

      setNewsletterFeedback({ type: 'success', message: data.message });
      setNewsletterEmail('');
    } catch (error) {
      setNewsletterFeedback({ type: 'error', message: error.message });
    } finally {
      setNewsletterLoading(false);
    }
  };
  
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-3 mb-4 max-md:justify-center">
              <div className="bg-purple-600 rounded-lg p-2">
                <span className="text-2xl font-bold">🛍️</span>
              </div>
              <div>
                <h3 className="text-xl font-bold">Nengoo</h3>
                <p className="text-sm opacity-75">nengoo.com</p>
              </div>
            </div>
            <p className="text-gray-300 mb-4 md:text-left w-80">
              {t.footerText}
            </p>
            {/* <div className="flex space-x-4 max-md:justify-center">
              <a href="#" className="text-2xl hover:text-purple-400 transition-colors">📘</a>
              <a href="#" className="text-2xl hover:text-purple-400 transition-colors">📧</a>
              <a href="#" className="text-2xl hover:text-purple-400 transition-colors">📷</a>
              <a href="#" className="text-2xl hover:text-purple-400 transition-colors">🐦</a>
            </div> */}
          </div>

          {/* Quick Links */}
          {/* <div>
            <h4 className="text-lg font-semibold mb-4">{t.about}</h4>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-gray-300 hover:text-white transition-colors">{t.about}</Link></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">{t.contact}</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">{t.help}</a></li>
              <li><a href="#" className="text-gray-300 hover:text-white transition-colors">{t.terms}</a></li>
            </ul>
          </div> */}

          {/* Categories */}
          <div className='md:text-left'>
            <h4 className="text-lg font-semibold mb-4">{t.categories}</h4>
            <ul className="space-y-2">
              <li><Link to="/catalog/clothing_accessories" className="text-gray-300 hover:text-white transition-colors">{t.clothing_accessories}</Link></li>
              <li><Link to="/catalog/electronics" className="text-gray-300 hover:text-white transition-colors">{t.electronics}</Link></li>
              <li><Link to="/catalog/handicrafts" className="text-gray-300 hover:text-white transition-colors">{t.handicrafts}</Link></li>
              <li><Link to="/catalog/food_drinks" className="text-gray-300 hover:text-white transition-colors">{t.food_drinks}</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className='md:text-left'>
            <h4 className="text-lg font-semibold mb-4">{t.newsletter}</h4>
            <p className="text-gray-300 mb-4">Recevez nos dernières offres et nouveautés</p>
            <form onSubmit={handleNewsletterSubmit}>
              <div className="flex">
                <input
                  type="email"
                  placeholder={t.email}
                  className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-l-lg focus:outline-none focus:bg-gray-600 disabled:bg-gray-500"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  disabled={newsletterLoading}
                />
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-r-lg transition-colors disabled:bg-purple-400 disabled:cursor-not-allowed"
                  disabled={newsletterLoading}
                >
                  {newsletterLoading ? '...' : t.subscribe}☻
                </button>
              </div>
              {newsletterFeedback.message && (
                <p className={`mt-2 text-sm ${newsletterFeedback.type === 'success' ? 'text-green-300' : 'text-red-400'}`}>
                  {newsletterFeedback.message}
                </p>
              )}
            </form>
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

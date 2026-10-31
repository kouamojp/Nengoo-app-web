
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { translations } from '../../lib/translations';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const Footer = ({ language }) => {
  const t = translations[language];
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
        const data = await response.json();
        setCategories(data);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);

  const linkClass = 'text-purple-200 hover:text-white hover:underline underline-offset-4';

  return (
    <footer className="on-dark text-left bg-purple-950 text-white pb-20 md:pb-0">
      <div className="container mx-auto px-4 pt-12 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-10">
          <div className="max-w-xs">
            <img
              src="/images/logo-nengoo-white.png"
              alt="Nengoo"
              className="h-12 w-auto mb-4"
            />
            <p className="text-purple-200 leading-relaxed">
              {t.footerText}
            </p>
            <ul className="mt-6 space-y-2">
              <li><Link to="/catalog" className={linkClass}>{t.browseCatalog}</Link></li>
              <li><Link to="/pickup-points" className={linkClass}>{t.pickupPoints}</Link></li>
              <li><Link to="/about" className={linkClass}>{t.about}</Link></li>
            </ul>
          </div>

          {categories.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-4">{t.categories}</h2>
              <ul className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                {categories.map(category => (
                  <li key={category.id}>
                    <Link
                      to={`/catalog/${encodeURIComponent(category.name)}`}
                      className={linkClass}
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row gap-2 justify-between text-sm text-purple-300">
          <p>&copy; {new Date().getFullYear()} Nengoo. {t.rightsReserved}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link to="/privacy-policy" className={linkClass}>
              {t.privacyPolicy}
            </Link>
            <Link to="/delete-account" className={linkClass}>
              {t.deleteAccount}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

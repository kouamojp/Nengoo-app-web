import React, { useEffect, useState } from 'react';
import ProductCard from '../product/ProductCard';
import { translations } from '../../lib/translations';
import { cardImage } from '../../lib/productImages';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';
const LIMIT = 8;

/**
 * « À la une » : annonces mises en avant par l'équipe, puis les plus
 * commandées, demandées, consultées ou les mieux notées (backend/routers/highlights.py).
 * Chaque carte dit pourquoi elle est là. Masquée s'il y en a moins de deux.
 */
const HighlightsSection = ({ language, addToCart }) => {
  const t = translations[language];
  const [items, setItems] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/highlights?limit=${LIMIT}`)
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
      .then((data) => {
        if (cancelled) return;
        setItems(
          data.map((p) => ({
            ...p,
            name: { [language]: p.name },
            description: { [language]: p.description },
            image: cardImage(p),
            inStock: p.kind === 'service' || p.stock > 0,
            sellerWhatsApp: p.sellerWhatsapp,
            reviews: p.reviewsCount || 0,
            rating: p.rating || 0,
          }))
        );
      });
    return () => {
      cancelled = true;
    };
  }, [language]);

  if (!items || items.length < 2) return null;

  return (
    <section className="pt-10 lg:pt-14" aria-labelledby="highlights-title">
      <div className="container mx-auto px-4">
        <div className="mb-5">
          <h2 id="highlights-title" className="text-2xl sm:text-3xl font-extrabold">{t.highlightsTitle}</h2>
          <p className="mt-1 text-gray-600">{t.highlightsSubtitle}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
          {items.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              language={language}
              addToCart={addToCart}
              ribbon={t.highlightLabels[product.highlight]}
              promoted={product.highlight === 'promoted'}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HighlightsSection;

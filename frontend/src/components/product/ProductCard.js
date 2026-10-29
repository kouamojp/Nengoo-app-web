
import React from 'react';
import { Link } from 'react-router-dom';
import { translations } from '../../lib/translations';
import { openWhatsApp, generateProductWhatsAppMessage } from '../../lib/utils';
import { CartIcon, WhatsAppIcon } from '../ui/Icons';

const formatPrice = (price) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
  }).format(price);
};

const isNew = (creationDate) => {
  if (!creationDate) return false;
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  return new Date(creationDate) > twoDaysAgo;
};

const ProductCard = ({ product, language, addToCart }) => {
  const t = translations[language];
  const productUrl = `/product/${product.slug || product.id}`;
  const name = product.name[language];

  const handleWhatsAppContact = () => {
    const message = generateProductWhatsAppMessage(product, language);
    openWhatsApp(product.sellerWhatsApp, message);
  };

  const hasPromo = product.promoPrice && product.promoPrice > 0;
  const discountPercentage = hasPromo && product.price > product.promoPrice
    ? Math.round(((product.price - product.promoPrice) / product.price) * 100)
    : 0;

  return (
    <article className="group text-left flex flex-col bg-white rounded-xl border border-gray-200 hover:border-purple-300 overflow-hidden transition-colors">
      <Link to={productUrl} className="relative block aspect-square bg-gray-100 overflow-hidden" tabIndex={-1} aria-hidden="true">
        <img
          src={product.image}
          alt=""
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            e.target.onerror = null; // Prevent infinite loop if fallback also fails
            e.target.src = process.env.PUBLIC_URL + '/images/logo-nengoo.png';
            e.target.className = 'w-full h-full object-contain p-6';
          }}
        />
        {!product.inStock ? (
          <span className="absolute top-2 left-2 bg-gray-900/80 text-white px-2 py-0.5 text-xs font-semibold rounded-md">
            {t.outOfStock}
          </span>
        ) : isNew(product.createdAt) && (
          <span className="absolute top-2 left-2 bg-yellow-300 text-purple-950 px-2 py-0.5 text-xs font-bold rounded-md">
            {t.newBadge}
          </span>
        )}
        {discountPercentage > 0 && (
          <span className="price absolute top-2 right-2 bg-red-600 text-white px-2 py-0.5 text-sm rounded-md">
            -{discountPercentage} %
          </span>
        )}
      </Link>

      <div className="flex flex-col flex-1 p-3 sm:p-4">
        <h3 className="text-[0.95rem] sm:text-base font-semibold leading-snug line-clamp-2 min-h-[2.6em]">
          <Link to={productUrl} className="hover:text-purple-700">
            {name}
          </Link>
        </h3>

        <div className="mt-2 mb-3 flex flex-wrap items-baseline gap-x-2">
          {hasPromo ? (
            <>
              <span className="price text-lg sm:text-xl text-red-600">
                {formatPrice(product.promoPrice)}
              </span>
              <span className="text-xs sm:text-sm text-gray-500 line-through">
                {formatPrice(product.price)}
              </span>
            </>
          ) : (
            <span className="price text-lg sm:text-xl text-purple-800">
              {formatPrice(product.price)}
            </span>
          )}
        </div>

        <div className="mt-auto flex gap-2">
          <button
            onClick={() => addToCart(product)}
            disabled={!product.inStock}
            className="flex-1 !min-w-0 h-10 !min-h-0 px-2 rounded-lg bg-purple-700 hover:bg-purple-800 disabled:bg-gray-300 disabled:text-gray-600 text-white text-[0.8rem] sm:text-sm font-semibold leading-tight flex items-center justify-center gap-1.5 transition-colors"
          >
            <CartIcon className="w-[1.1rem] h-[1.1rem] shrink-0 max-sm:hidden" strokeWidth={2.2} />
            <span>{t.addToCart}</span>
          </button>
          {product.sellerWhatsApp && (
            <button
              onClick={handleWhatsAppContact}
              aria-label={`Contacter le vendeur sur WhatsApp à propos de ${name}`}
              title="Contacter sur WhatsApp"
              className="shrink-0 !min-w-0 !min-h-0 w-10 h-10 rounded-lg border border-green-600 text-green-700 hover:bg-green-50 flex items-center justify-center transition-colors"
            >
              <WhatsAppIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default ProductCard;

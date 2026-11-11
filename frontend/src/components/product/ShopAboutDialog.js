import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { RichText } from '../ui/RichText';
import { isBlank } from '../../lib/richText';
import { PinIcon, WhatsAppIcon } from '../ui/Icons';

/** Présentation de la boutique, ouverte depuis la fiche produit. */
const ShopAboutDialog = ({ seller, t, onClose, onWhatsApp }) => {
  const closeRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose]);

  const place = [seller.city, seller.region].filter(Boolean).join(', ');

  return (
    <div
      className="fixed inset-0 z-50 bg-purple-950/60 flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-about-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-lg max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-2xl text-left shadow-2xl"
      >
        <div className="flex items-start gap-4 p-6 pb-4 border-b border-gray-100">
          <div className="shrink-0 w-14 h-14 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center text-2xl font-extrabold overflow-hidden" aria-hidden="true">
            {seller.logoUrl ? (
              <img src={seller.logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              seller.businessName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="shop-about-title" className="text-xl font-extrabold leading-tight">
              {t.aboutShopOf(seller.businessName)}
            </h2>
            {place && (
              <p className="mt-1 flex items-center gap-1 text-sm text-gray-600">
                <PinIcon className="w-4 h-4 shrink-0" />
                {place}
              </p>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t.closeDialog}
            className="!min-h-0 shrink-0 w-10 h-10 -mr-2 -mt-1 rounded-full inline-flex items-center justify-center text-gray-600 hover:bg-gray-100"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto text-gray-700 max-w-[68ch]">
          {isBlank(seller.description) ? (
            <p className="text-gray-500">{t.noShopDescription}</p>
          ) : (
            <RichText value={seller.description} />
          )}
        </div>

        <div className="p-4 sm:px-6 border-t border-gray-100 grid sm:grid-cols-2 gap-2">
          <Link
            to={`/seller/${seller.id}`}
            className="inline-flex items-center justify-center h-11 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-sm font-bold"
          >
            {t.visitShop}
          </Link>
          {seller.whatsapp && (
            <button
              type="button"
              onClick={onWhatsApp}
              className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-gray-300 text-gray-900 text-sm font-semibold hover:border-green-600"
            >
              <WhatsAppIcon className="w-5 h-5 text-green-600" />
              {t.contactWhatsApp}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopAboutDialog;

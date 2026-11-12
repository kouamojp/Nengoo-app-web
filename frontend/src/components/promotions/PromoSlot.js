import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FEED_PER_PAGE, fetchPromotions, internalPath, orderWeighted, pickWeighted, PLACEMENT_RATIOS, trackOpen, trackView } from '../../lib/promotions';

const LABEL = { fr: 'Sponsorisé', en: 'Sponsored' };

/**
 * Une bannière : image large ou mobile, lien, mention « Sponsorisé ».
 * Une vue est comptée quand elle est visible au moins à moitié.
 */
export const PromoBanner = ({ promotion, placement, language = 'fr', eager = false, className = '' }) => {
  const location = useLocation();
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!promotion || !el) return undefined;
    const pageKey = `${location.pathname}${location.search}|${location.key}`;
    if (typeof IntersectionObserver === 'undefined') {
      trackView(promotion, pageKey);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          trackView(promotion, pageKey);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [promotion, location.pathname, location.search, location.key]);

  if (!promotion) return null;

  const ratios = PLACEMENT_RATIOS[placement] || PLACEMENT_RATIOS.home_middle;
  const [mw, mh] = ratios.mobile;
  const [dw, dh] = ratios.desktop || ratios.mobile;
  const desktop = promotion.imageDesktop || promotion.imageMobile;
  const mobile = promotion.imageMobile || desktop;
  const path = internalPath(promotion.link);

  const image = (
    <picture>
      <source media="(min-width: 640px)" srcSet={desktop} width={dw} height={dh} />
      <img
        src={mobile}
        width={mw}
        height={mh}
        alt={promotion.alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="promo-slot-image block w-full h-auto object-cover"
        style={{ '--ratio-m': `${mw} / ${mh}`, '--ratio-d': `${dw} / ${dh}` }}
      />
    </picture>
  );

  const linkClass =
    'group relative block overflow-hidden rounded-2xl bg-gray-100 ring-1 ring-black/5 focus-visible:outline-offset-4';
  const badge = (
    <span className="absolute left-2 top-2 rounded-md bg-white/90 px-2 py-0.5 text-xs font-semibold text-gray-800 shadow-sm">
      {LABEL[language] || LABEL.fr}
    </span>
  );

  return (
    <aside ref={ref} className={className} aria-label={LABEL[language] || LABEL.fr}>
      {path ? (
        <Link to={path} onClick={() => trackOpen(promotion)} className={linkClass}>
          {image}
          {badge}
        </Link>
      ) : (
        <a
          href={promotion.link}
          target="_blank"
          rel="sponsored noopener noreferrer"
          onClick={() => trackOpen(promotion)}
          className={linkClass}
        >
          {image}
          {badge}
        </a>
      )}
    </aside>
  );
};

/**
 * Emplacement publicitaire : affiche une bannière en cours de l'emplacement
 * (tirage pondéré), ou rien du tout s'il n'y en a pas.
 */
const PromoSlot = ({ placement, categories = [], language = 'fr', eager = false, className = '' }) => {
  const location = useLocation();
  const [promotion, setPromotion] = useState(null);
  const categoryKey = categories.filter(Boolean).join(',');

  useEffect(() => {
    let cancelled = false;
    fetchPromotions(placement, categoryKey ? categoryKey.split(',') : []).then((items) => {
      if (!cancelled) setPromotion(pickWeighted(items));
    });
    return () => {
      cancelled = true;
    };
  }, [placement, categoryKey, location.pathname]);

  return <PromoBanner promotion={promotion} placement={placement} language={language} eager={eager} className={className} />;
};

/**
 * Bannières « entre les produits » d'une page : jusqu'à FEED_PER_PAGE
 * campagnes différentes, dans un ordre tiré au sort (pondéré).
 */
export const useFeedPromotions = (categories = []) => {
  const location = useLocation();
  const [promotions, setPromotions] = useState([]);
  const categoryKey = categories.filter(Boolean).join(',');

  useEffect(() => {
    let cancelled = false;
    fetchPromotions('feed', categoryKey ? categoryKey.split(',') : []).then((items) => {
      if (!cancelled) setPromotions(orderWeighted(items).slice(0, FEED_PER_PAGE));
    });
    return () => {
      cancelled = true;
    };
  }, [categoryKey, location.pathname]);

  return promotions;
};

export default PromoSlot;

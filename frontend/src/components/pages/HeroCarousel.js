import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './HeroSwiper.css';
import { afterHero, heroDone } from '../../lib/heroGate';

// Carrousel du hero de l'accueil : fondu enchaîné, défilement automatique,
// flèches, puces et glissement au doigt. Remplace Swiper (plus de 100 Ko dans
// le paquet principal pour ce seul usage).

const DELAY = 5000;

// Largeur affichée, pour que le navigateur choisisse la bonne version (même
// valeur que les préchargements de public/index.html et public/home.php)
const SIZES = '(min-width: 1024px) 46vw, (min-width: 640px) 576px, calc(100vw - 2rem)';

// Lien d'une image : navigation SPA pour nos propres pages
// (/chemin ou URL complète vers notre domaine), nouvel onglet sinon.
const resolveLink = (raw) => {
  const value = (raw || '').trim();
  if (!value) return null;
  if (value.startsWith('/') && !value.startsWith('//')) return { internal: true, href: value };
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.host === window.location.host || url.host.replace(/^www\./, '') === 'nengoo.com') {
      return { internal: true, href: url.pathname + url.search + url.hash };
    }
    return { internal: false, href: url.href };
  } catch {
    return null;
  }
};

const Chevron = ({ dir }) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === 'prev' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
  </svg>
);

/**
 * images, sources et links sont parallèles (réglages de l'accueil). sources :
 * versions réduites créées par le serveur, { avif, webp, src } (srcset prêts à
 * l'emploi, backend/image_variants.py), {} tant qu'elles n'existent pas.
 */
const HeroCarousel = ({ images, sources = [], links = [], className = '' }) => {
  const count = images.length;
  const [active, setActive] = useState(0);
  // Images chargées une à une : la première d'abord, puis (une fois peinte,
  // lib/heroGate.js) la suivante seulement, pour ne pas disputer la bande
  // passante du premier affichage
  const [firstLoaded, setFirstLoaded] = useState(false);
  const [reached, setReached] = useState(0);
  const [paused, setPaused] = useState(false);
  // Le visiteur a pris la main (flèche, puce, glissement) : plus de défilement
  // automatique. Seul moyen d'arrêter le carrousel au doigt (WCAG 2.2.2).
  const [stopped, setStopped] = useState(false);
  const touch = useRef(null);

  const go = useCallback((index) => {
    const next = (index + count) % count;
    setActive(next);
    setReached(r => Math.max(r, next));
  }, [count]);

  // Défilement automatique, suspendu au survol, au focus et onglet caché
  useEffect(() => {
    if (count < 2 || paused || stopped || !firstLoaded) return undefined;
    // Mouvement réduit demandé : pas de défilement automatique
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = setTimeout(() => {
      if (!document.hidden) go(active + 1);
    }, DELAY);
    return () => clearTimeout(timer);
  }, [active, count, paused, stopped, firstLoaded, go]);

  useEffect(() => {
    let cancelled = false;
    afterHero().then(() => { if (!cancelled) setFirstLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  if (!count) return null;

  // Première image chargée : la suite de la page charge dès qu'elle est peinte
  const onFirstShown = (event) => {
    heroDone(event.type === 'load' ? event.currentTarget : undefined);
  };

  const goByUser = (index) => {
    setStopped(true);
    go(index);
  };

  const onTouchStart = (e) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    // Geste surtout vertical : c'est un défilement de la page, pas un glissement
    if (Math.abs(dy) > Math.abs(dx)) return;
    if (Math.abs(dx) > 40) goByUser(active + (dx < 0 ? 1 : -1));
  };

  return (
    <div
      className={`hero-carousel relative overflow-hidden ${className}`}
      role="region"
      aria-roledescription="carrousel"
      aria-label={'Nengoo – à la une'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {images.map((src, index) => {
        const isActive = index === active;
        // Dernière image : à charger aussi dès qu'on peut revenir en arrière
        const load = index === 0 || (firstLoaded && (index <= reached + 1 || (reached > 0 && index === count - 1)));
        const source = sources[index] || {};
        const picture = load ? (
          <img
            src={source.src || src}
            srcSet={source.webp}
            sizes={source.webp ? SIZES : undefined}
            alt={`Nengoo, visuel ${index + 1}`}
            width="1000"
            height="750"
            className="w-full h-full object-cover"
            loading={index === 0 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'low'}
            decoding={index === 0 ? 'sync' : 'async'}
            onLoad={index === 0 ? onFirstShown : undefined}
            onError={index === 0 ? onFirstShown : undefined}
          />
        ) : null;
        // AVIF (plus léger) pour les navigateurs qui le lisent, WebP sinon
        const img = picture && source.avif ? (
          <picture className="block w-full h-full">
            <source type="image/avif" srcSet={source.avif} sizes={SIZES} />
            {picture}
          </picture>
        ) : picture;
        const link = resolveLink(links[index]);
        const content = !link ? img : link.internal ? (
          <Link to={link.href} className="block w-full h-full" tabIndex={isActive ? 0 : -1}>{img}</Link>
        ) : (
          <a href={link.href} target="_blank" rel="noopener noreferrer" className="block w-full h-full" tabIndex={isActive ? 0 : -1}>{img}</a>
        );
        return (
          <div
            key={index}
            className={`hero-slide absolute inset-0 bg-purple-900/40 ${isActive ? 'is-active' : ''}`}
            aria-hidden={!isActive}
            role="group"
            aria-roledescription="diapositive"
            aria-label={`${index + 1} / ${count}`}
          >
            {content}
          </div>
        );
      })}

      {count > 1 && (
        <>
          <button type="button" className="hero-arrow hero-arrow-prev" onClick={() => goByUser(active - 1)} aria-label="Image précédente">
            <Chevron dir="prev" />
          </button>
          <button type="button" className="hero-arrow hero-arrow-next" onClick={() => goByUser(active + 1)} aria-label="Image suivante">
            <Chevron dir="next" />
          </button>
          <div className="hero-dots">
            {images.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`hero-dot ${index === active ? 'is-active' : ''}`}
                onClick={() => goByUser(index)}
                aria-label={`Afficher l'image ${index + 1}`}
                aria-current={index === active ? 'true' : undefined}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default HeroCarousel;

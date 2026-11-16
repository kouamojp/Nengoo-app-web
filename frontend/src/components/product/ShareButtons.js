import React, { useEffect, useRef, useState } from 'react';
import { WhatsAppIcon } from '../ui/Icons';

const TEXT = {
  fr: { title: 'Partager', native: 'Partager…', copy: 'Copier le lien', copied: 'Lien copié', on: (n) => `Partager sur ${n}` },
  en: { title: 'Share', native: 'Share…', copy: 'Copy link', copied: 'Link copied', on: (n) => `Share on ${n}` },
};

/** Liens de partage vers chaque réseau (texte et lien encodés). */
export const shareLinks = (url, text) => {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  return {
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${text} ${url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    telegram: `https://t.me/share/url?url=${u}&text=${t}`,
    x: `https://x.com/intent/post?url=${u}&text=${t}`,
  };
};

const Svg = ({ children, className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">{children}</svg>
);

const FacebookIcon = () => (
  <Svg><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.5 1.6-1.5h1.7V4.4c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.4H7.7V14h2.7v8z" /></Svg>
);
const TelegramIcon = () => (
  <Svg><path d="M21.4 4.3 18.3 19c-.2 1-.8 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-1 .5l.3-4.7 8.5-7.7c.4-.3-.1-.5-.6-.2L6.5 13.1 2 11.7c-1-.3-1-1 .2-1.5L20 3.3c.8-.3 1.6.2 1.4 1z" /></Svg>
);
const XIcon = () => (
  <Svg className="w-4 h-4"><path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.3l4.4 5.9zm-1.1 16.2h1.7L7.4 4.7H5.6z" /></Svg>
);
const LinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
    <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
    <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
  </svg>
);
const ShareIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
  </svg>
);

const round = 'inline-flex items-center justify-center w-11 h-11 !min-h-0 !min-w-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2';

/**
 * Boutons de partage d'une fiche : partage natif du téléphone quand le
 * navigateur le propose, WhatsApp, Facebook, Telegram, X et copie du lien.
 */
const ShareButtons = ({ url, text, language = 'fr' }) => {
  const t = TEXT[language] || TEXT.fr;
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  const canShareNatively = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const links = shareLinks(url, text);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      // Presse-papiers refusé (page non sécurisée, ancien navigateur) : copie classique
      const area = document.createElement('textarea');
      area.value = url;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      area.remove();
    }
    // Échec : le lien est affiché pour une copie à la main
    setCopied(ok ? 'ok' : 'manual');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), ok ? 2500 : 15000);
  };

  const shareNatively = async () => {
    try {
      await navigator.share({ title: text, text, url });
    } catch {
      // Partage annulé par l'utilisateur : rien à faire
    }
  };

  const networks = [
    { id: 'whatsapp', name: 'WhatsApp', Icon: WhatsAppIcon, className: 'bg-green-600 hover:bg-green-700 text-white' },
    { id: 'facebook', name: 'Facebook', Icon: FacebookIcon, className: 'bg-[#1877F2] hover:bg-[#145dbf] text-white' },
    { id: 'telegram', name: 'Telegram', Icon: TelegramIcon, className: 'bg-[#229ED9] hover:bg-[#1b86b8] text-white' },
    { id: 'x', name: 'X', Icon: XIcon, className: 'bg-gray-900 hover:bg-black text-white' },
  ];

  return (
    <div className="mt-5" role="group" aria-label={t.title}>
      <p className="text-sm font-semibold text-gray-700 mb-2">{t.title}</p>
      <div className="flex flex-wrap items-center gap-2">
        {canShareNatively && (
          <button type="button" onClick={shareNatively} className={`${round} bg-purple-700 hover:bg-purple-800 text-white`} aria-label={t.native} title={t.native}>
            <ShareIcon />
          </button>
        )}
        {networks.map(({ id, name, Icon, className }) => (
          <a
            key={id}
            href={links[id]}
            target="_blank"
            rel="noopener noreferrer"
            className={`${round} ${className}`}
            aria-label={t.on(name)}
            title={t.on(name)}
          >
            <Icon />
          </a>
        ))}
        <button
          type="button"
          onClick={copy}
          className={`${round} border border-gray-300 bg-white text-gray-800 hover:border-purple-400`}
          aria-label={t.copy}
          title={t.copy}
        >
          <LinkIcon />
        </button>
        <span className="text-sm font-semibold text-green-700 break-all select-all" role="status" aria-live="polite">
          {copied === 'ok' ? t.copied : copied === 'manual' ? url : ''}
        </span>
      </div>
    </div>
  );
};

export default ShareButtons;

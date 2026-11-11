import React, { useEffect, useRef, useState } from 'react';
import { toSafeHtml, safeLink, isBlank } from '../../lib/richText';

/** Affiche une description mise en forme (HTML nettoyé ou ancien texte brut). */
export const RichText = ({ value, className = '' }) => {
  const html = toSafeHtml(value);
  if (!html) return null;
  // eslint-disable-next-line react/no-danger
  return <div className={`rich-text ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
};

const TOOLS = [
  { command: 'bold', label: 'Gras', shortcut: 'Ctrl+B', glyph: <span className="font-extrabold">G</span> },
  { command: 'italic', label: 'Italique', shortcut: 'Ctrl+I', glyph: <span className="italic font-serif">I</span> },
  { command: 'underline', label: 'Souligné', shortcut: 'Ctrl+U', glyph: <span className="underline">S</span> },
  {
    command: 'insertUnorderedList',
    label: 'Liste à puces',
    glyph: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4" cy="6" r="1" fill="currentColor" /><circle cx="4" cy="12" r="1" fill="currentColor" /><circle cx="4" cy="18" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    command: 'insertOrderedList',
    label: 'Liste numérotée',
    glyph: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M10 6h10M10 12h10M10 18h10" /><path d="M4 4.5h1.5V9M3.5 9h3M3.5 14.5c.4-.6 1-1 1.7-1 .8 0 1.3.5 1.3 1.1 0 1.3-3 1.9-3 3.9h3" strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    command: 'createLink',
    label: 'Lien',
    glyph: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
      </svg>
    ),
  },
  {
    command: 'removeFormat',
    label: 'Retirer la mise en forme',
    glyph: (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M6 5h12M12 5l-3 14M4 20 20 4" />
      </svg>
    ),
  },
];

/**
 * Éditeur de texte riche léger (gras, italique, souligné, listes, liens).
 * Renvoie du HTML ; le collage insère du texte brut pour ne pas importer la
 * mise en forme d'autres sites. Le serveur nettoie le HTML reçu.
 */
export const RichTextEditor = ({ id, value, onChange, placeholder, minHeight = '9rem', ariaLabelledBy, invalid }) => {
  const ref = useRef(null);
  const lastHtml = useRef(null);

  // Contenu repris de l'extérieur (chargement du profil, réinitialisation)
  useEffect(() => {
    const el = ref.current;
    if (!el || value === lastHtml.current) return;
    el.innerHTML = toSafeHtml(value);
    lastHtml.current = value;
  }, [value]);

  const emit = () => {
    const el = ref.current;
    const html = isBlank(el.innerHTML) ? '' : toSafeHtml(el.innerHTML);
    lastHtml.current = html;
    onChange(html);
  };

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const [linkError, setLinkError] = useState(false);
  const savedRange = useRef(null);

  const run = (command) => {
    ref.current.focus();
    if (command === 'createLink') {
      const selection = window.getSelection();
      savedRange.current =
        selection && selection.rangeCount && ref.current.contains(selection.anchorNode)
          ? selection.getRangeAt(0).cloneRange()
          : null;
      setLinkValue('');
      setLinkError(false);
      setLinkOpen(true);
      return;
    }
    document.execCommand(command, false);
    emit();
  };

  const insertLink = () => {
    const href = safeLink(linkValue);
    if (!href) {
      setLinkError(true);
      return;
    }
    const el = ref.current;
    el.focus();
    const selection = window.getSelection();
    selection.removeAllRanges();
    if (savedRange.current) {
      selection.addRange(savedRange.current);
    } else {
      const end = document.createRange();
      end.selectNodeContents(el);
      end.collapse(false);
      selection.addRange(end);
    }
    if (selection.isCollapsed) {
      const safe = href.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      document.execCommand('insertHTML', false, `<a href="${safe}">${safe}</a>&nbsp;`);
    } else {
      document.execCommand('createLink', false, href);
    }
    setLinkOpen(false);
    emit();
  };

  const onPaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <div
      className={`rounded-xl border bg-white focus-within:ring-2 focus-within:ring-purple-500 ${
        invalid ? 'border-red-500' : 'border-gray-300'
      }`}
    >
      <div role="toolbar" aria-label="Mise en forme" className="flex flex-wrap gap-1 border-b border-gray-200 p-1.5">
        {TOOLS.map((tool) => (
          <button
            key={tool.command}
            type="button"
            title={tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label}
            aria-label={tool.label}
            onMouseDown={(e) => e.preventDefault()} // garde la sélection
            onClick={() => run(tool.command)}
            className="!min-h-0 w-9 h-9 inline-flex items-center justify-center rounded-lg text-gray-700 hover:bg-purple-50 hover:text-purple-800"
          >
            {tool.glyph}
          </button>
        ))}
      </div>
      {linkOpen && (
        <div className="flex flex-wrap items-start gap-2 border-b border-gray-200 bg-purple-50/60 p-2">
          <div className="flex-1 min-w-[12rem]">
            <input
              type="url"
              inputMode="url"
              autoFocus
              value={linkValue}
              onChange={(e) => { setLinkValue(e.target.value); setLinkError(false); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); insertLink(); }
                if (e.key === 'Escape') { e.preventDefault(); setLinkOpen(false); ref.current.focus(); }
              }}
              placeholder="https://"
              aria-label="Adresse du lien"
              aria-invalid={linkError || undefined}
              className="w-full h-10 !rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {linkError && (
              <p className="mt-1 text-xs text-red-700">Saisissez une adresse commençant par https://, www., mailto: ou tel:</p>
            )}
          </div>
          <button type="button" onClick={insertLink} className="h-10 px-4 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold">
            Ajouter le lien
          </button>
          <button type="button" onClick={() => { setLinkOpen(false); ref.current.focus(); }} className="h-10 px-3 rounded-lg text-sm font-semibold text-gray-700 hover:bg-white">
            Annuler
          </button>
        </div>
      )}
      <div
        id={id}
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-labelledby={ariaLabelledBy}
        aria-invalid={invalid || undefined}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        onFocus={() => {
          // Entrée crée un paragraphe <p> (Chrome crée des <div> par défaut)
          try {
            document.execCommand('defaultParagraphSeparator', false, 'p');
          } catch {
            // navigateur sans cette commande : le nettoyage convertit les <div>
          }
        }}
        onBlur={emit}
        onPaste={onPaste}
        className="rich-text rich-text-editor px-4 py-3 text-left focus:outline-none"
        style={{ minHeight }}
      />
    </div>
  );
};

export default RichText;

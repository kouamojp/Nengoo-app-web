// Texte riche (description des boutiques) : un petit sous-ensemble de HTML.
// Le serveur nettoie déjà ce qu'il enregistre (backend/rich_text.py) ; on
// nettoie de nouveau à l'affichage, et les anciennes descriptions en texte
// brut sont converties (retours à la ligne conservés).

const ALLOWED = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'A']);
// Conteneurs dont le contenu disparaît avec eux
const DROPPED = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE', 'NOSCRIPT', 'SVG', 'MATH']);
// Éléments de bloc remplacés par un paragraphe (ce que produit l'édition)
const AS_PARAGRAPH = new Set(['DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE']);
const TAG_PATTERN = /<\/?(p|br|strong|b|em|i|u|ul|ol|li|a|div)\b[^>]*>/i;

export const isHtml = (value) => TAG_PATTERN.test(value || '');

const escapeHtml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const textToHtml = (text) =>
  text
    .trim()
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('');

export const safeLink = (href) => {
  const value = (href || '').trim();
  if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) return value;
  if (/^www\./i.test(value)) return `https://${value}`;
  return null;
};

const clean = (source, target, doc) => {
  source.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      target.appendChild(doc.createTextNode(node.textContent));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || DROPPED.has(node.tagName)) return;
    let tag = node.tagName;
    if (AS_PARAGRAPH.has(tag)) tag = 'P';
    if (!ALLOWED.has(tag)) {
      clean(node, target, doc); // balise inconnue : on garde son texte
      return;
    }
    if (tag === 'A') {
      const href = safeLink(node.getAttribute('href'));
      if (!href) {
        clean(node, target, doc);
        return;
      }
      const link = doc.createElement('a');
      link.setAttribute('href', href);
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer nofollow');
      clean(node, link, doc);
      target.appendChild(link);
      return;
    }
    const el = doc.createElement(tag);
    clean(node, el, doc);
    target.appendChild(el);
  });
};

/** HTML sûr à afficher, ou '' si la description est vide. */
export const toSafeHtml = (value) => {
  const raw = (value || '').trim();
  if (!raw) return '';
  if (!isHtml(raw)) return textToHtml(raw);
  const parsed = new DOMParser().parseFromString(`<body>${raw}</body>`, 'text/html');
  const out = document.createElement('div');
  clean(parsed.body, out, document);
  // Paragraphes vides laissés par l'éditeur autour des listes
  out.querySelectorAll('p').forEach((p) => {
    if (!p.childNodes.length || (!p.textContent.trim() && !p.querySelector('br'))) p.remove();
  });
  return out.innerHTML;
};

/** Texte sans mise en forme (balises meta, aperçus). */
export const toPlainText = (value) => {
  const raw = value || '';
  if (!isHtml(raw)) return raw.trim();
  const parsed = new DOMParser().parseFromString(
    raw.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|div)>/gi, '\n'),
    'text/html'
  );
  return (parsed.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
};

/** Vrai si la description ne contient aucun texte (ex. "<p><br></p>"). */
export const isBlank = (value) => toPlainText(value).length === 0;

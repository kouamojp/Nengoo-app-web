// Médiathèque de l'admin et des vendeurs : appels à l'API (backend/routers/media.py).
import { api } from './documents';

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
];
const DOCUMENT_EXTENSIONS = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv';
const MB = 1024 * 1024;
export const MAX_SIZE = { image: 10 * MB, document: 25 * MB };

/** Valeur `accept` du champ fichier. */
export const acceptAttribute = (accept) => (
  accept === 'image' ? IMAGE_TYPES.join(',') : `${IMAGE_TYPES.join(',')},${DOCUMENT_TYPES.join(',')},${DOCUMENT_EXTENSIONS}`
);

// Certains navigateurs ne donnent pas le type des .docx, .csv…
const TYPE_BY_EXTENSION = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
  pdf: 'application/pdf', doc: 'application/msword', docx: DOCUMENT_TYPES[2], xls: 'application/vnd.ms-excel',
  xlsx: DOCUMENT_TYPES[4], ppt: 'application/vnd.ms-powerpoint', pptx: DOCUMENT_TYPES[6], txt: 'text/plain', csv: 'text/csv',
};

export const fileType = (file) => (
  file.type || TYPE_BY_EXTENSION[(file.name.split('.').pop() || '').toLowerCase()] || ''
);

export const kindOfType = (type) => (
  IMAGE_TYPES.includes(type) ? 'image' : DOCUMENT_TYPES.includes(type) ? 'document' : null
);

/** Erreur à afficher avant l'envoi, ou null si le fichier est acceptable. */
export const fileProblem = (file, accept) => {
  const kind = kindOfType(fileType(file));
  if (!kind || (accept === 'image' && kind !== 'image')) {
    return accept === 'image'
      ? 'Format non accepté : JPG, PNG, WEBP ou GIF.'
      : 'Format non accepté : images (JPG, PNG, WEBP, GIF) ou documents (PDF, Word, Excel, PowerPoint, TXT, CSV).';
  }
  if (file.size > MAX_SIZE[kind]) return `Trop lourd : ${MAX_SIZE[kind] / MB} Mo maximum.`;
  return null;
};

export const listMedia = ({ kind = 'all', q = '', page = 1, limit = 40 } = {}) => {
  const params = new URLSearchParams({ kind, q, page: String(page), limit: String(limit) });
  return api(`/media?${params}`, { fallback: 'Impossible de charger la médiathèque.' });
};

/** Envoi d'un fichier vers S3 (lien signé), puis ajout à la bibliothèque. */
export const uploadMedia = async (file, onProgress) => {
  const type = fileType(file);
  const ticket = await api('/media/upload-url', {
    method: 'POST',
    body: { fileName: file.name, fileType: type, size: file.size },
    fallback: "Impossible de préparer l'envoi du fichier.",
  });
  await new Promise((resolve, reject) => {
    // XMLHttpRequest pour suivre la progression (fetch ne le permet pas)
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', ticket.uploadUrl);
    xhr.setRequestHeader('Content-Type', type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("L'envoi du fichier a échoué.")));
    xhr.onerror = () => reject(new Error("L'envoi du fichier a échoué. Vérifiez votre connexion."));
    xhr.send(file);
  });
  return api('/media', {
    method: 'POST',
    body: { key: ticket.key, name: file.name },
    fallback: "Le fichier est envoyé mais n'a pas pu être ajouté à la médiathèque.",
  });
};

export const deleteMedia = (id) => api(`/media/${encodeURIComponent(id)}`, {
  method: 'DELETE',
  fallback: 'La suppression a échoué.',
});

export const syncMedia = () => api('/media/sync', {
  method: 'POST',
  fallback: "L'import des fichiers existants a échoué.",
});

export const fileExtension = (name) => {
  const ext = (name || '').split('.').pop();
  return ext && ext !== name ? ext.toUpperCase().slice(0, 4) : 'FICHIER';
};

// Assistant Nengoo : appels à l'API et ouverture depuis n'importe quel écran.
// Les clés et le choix du modèle restent sur le serveur.

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';
const OPEN_EVENT = 'nengoo:assistant-open';
// Un modèle qui consulte le catalogue peut prendre plusieurs dizaines de secondes
const TIMEOUT_MS = 60000;
const HISTORY_SENT = 10;

/** Ouvre l'assistant ; avec un texte, l'envoie comme premier message. */
export const openAssistant = (prompt = '') => {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { prompt } }));
};

export const onAssistantOpen = (listener) => {
  const handler = (event) => listener(event.detail?.prompt || '');
  window.addEventListener(OPEN_EVENT, handler);
  return () => window.removeEventListener(OPEN_EVENT, handler);
};

export const newConversationId = () => (
  window.crypto?.randomUUID?.() || `conv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
);

/** Envoie la conversation ; lève une Error dont le message est affichable, ou null. */
export const sendToAssistant = async ({ messages, language, conversationId, productId, image }) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        messages: messages.slice(-HISTORY_SENT).map(({ role, content, products, image: photo }) => ({
          role,
          content: (content || '').slice(0, 2000),
          productIds: (products || []).map(p => p.id),
          hasImage: Boolean(photo),
        })),
        language,
        conversationId,
        productId: productId || undefined,
        image: image || undefined,
      }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw Object.assign(new Error(typeof data?.detail === 'string' ? data.detail : ''), { handled: true });
    }
    return data;
  } catch (error) {
    throw error.handled && error.message ? error : new Error('');
  } finally {
    clearTimeout(timer);
  }
};

// Photo pour la recherche par image : réduite dans le navigateur avant l'envoi
// (réseau mobile), le serveur la vérifie et la réencode de toute façon.
const PHOTO_MAX_SIDE = 1024;
const THUMB_MAX_SIDE = 240;

const drawScaled = (picture, maxSide, quality) => {
  const scale = Math.min(1, maxSide / Math.max(picture.naturalWidth, picture.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(picture.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(picture.naturalHeight * scale));
  const context = canvas.getContext('2d');
  // Fond blanc : un PNG transparent ne devient pas noir en JPEG
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(picture, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
};

/** { photo, thumbnail } en data URL JPEG ; rejette si le fichier n'est pas une image lisible. */
export const preparePhoto = (file) => new Promise((resolve, reject) => {
  if (!file || !file.type.startsWith('image/')) {
    reject(new Error('not an image'));
    return;
  }
  const url = URL.createObjectURL(file);
  const picture = new Image();
  picture.onload = () => {
    try {
      resolve({
        photo: drawScaled(picture, PHOTO_MAX_SIDE, 0.85),
        // Seule la miniature est gardée dans la conversation (stockage de l'onglet limité)
        thumbnail: drawScaled(picture, THUMB_MAX_SIDE, 0.7),
      });
    } catch (error) {
      reject(error);
    } finally {
      URL.revokeObjectURL(url);
    }
  };
  picture.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('unreadable image'));
  };
  picture.src = url;
});

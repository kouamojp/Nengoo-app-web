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
export const sendToAssistant = async ({ messages, language, conversationId, productId }) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        messages: messages.slice(-HISTORY_SENT).map(({ role, content, products }) => ({
          role,
          content: content.slice(0, 2000),
          productIds: (products || []).map(p => p.id),
        })),
        language,
        conversationId,
        productId: productId || undefined,
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

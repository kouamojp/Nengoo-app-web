import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { translations } from '../../lib/translations';
import { newConversationId, preparePhoto, sendToAssistant } from '../../lib/assistant';
import { CameraIcon, SparkIcon } from '../ui/Icons';
import { numberFormat } from '../../lib/numberFormat';
import { imageFallback, NENGOO_IMAGE } from '../../lib/productImages';

const STORAGE_KEY = 'nengoo-assistant';
const MAX_LENGTH = 500;

const formatPrice = (price) => numberFormat('fr-FR', {
  style: 'currency',
  currency: 'XAF',
  minimumFractionDigits: 0,
}).format(price);

// Conversation gardée le temps de l'onglet : fermée avec lui, jamais sur le serveur
const loadSession = () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (saved?.conversationId && Array.isArray(saved.messages)) return saved;
  } catch {
    // Stockage indisponible : la conversation repart de zéro
  }
  return { conversationId: newConversationId(), messages: [] };
};

const saveSession = (session) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Sans stockage, la conversation vit jusqu'au rechargement de la page
  }
};

const ProductResult = ({ product, t, onOpen }) => (
  <Link
    to={`/product/${product.slug || product.id}`}
    onClick={onOpen}
    className="flex gap-3 p-2 rounded-xl bg-white border border-gray-200 hover:border-purple-400 transition-colors text-left text-gray-900"
  >
    {product.image ? (
      <img
        src={product.image || NENGOO_IMAGE}
        alt=""
        loading="lazy"
        className={`w-16 h-16 rounded-lg object-cover bg-gray-100 shrink-0 ${product.image ? '' : 'img-logo'}`}
        onError={imageFallback(null)}
      />
    ) : (
      <span className="w-16 h-16 rounded-lg bg-gray-100 shrink-0" aria-hidden="true" />
    )}
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-medium truncate">{product.name}</span>
      <span className="block text-sm">
        <span className="price text-purple-800">{formatPrice(product.paidPrice)}</span>
        {product.paidPrice < product.price && (
          <span className="ml-2 text-xs text-gray-500 line-through">{formatPrice(product.price)}</span>
        )}
      </span>
      <span className="block text-xs text-gray-600 truncate">
        {t.soldBy} {[product.sellerName, product.sellerCity].filter(Boolean).join(' · ')}
      </span>
    </span>
  </Link>
);

const AssistantPanel = ({ open, language, productId, prompt, onClose }) => {
  const t = translations[language].assistant;
  const [session, setSession] = useState(loadSession);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  // Photo choisie, pas encore envoyée : { photo, thumbnail }
  const [attachment, setAttachment] = useState(null);
  const listRef = useRef(null);
  const fileRef = useRef(null);
  // Photo du dernier envoi, gardée pour « Réessayer » (seule la miniature est dans la conversation)
  const lastPhotoRef = useRef(null);
  const inputRef = useRef(null);
  const closeRef = useRef(null);
  const pendingRef = useRef(false);

  useEffect(() => saveSession(session), [session]);

  useEffect(() => {
    if (open) (window.innerWidth >= 768 ? inputRef : closeRef).current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [session.messages, sending, open]);

  const send = useCallback(async (text, previous, photo = null) => {
    const content = text.trim().slice(0, MAX_LENGTH);
    if ((!content && !photo) || pendingRef.current) return;
    pendingRef.current = true;
    lastPhotoRef.current = photo;
    const userMessage = { role: 'user', content };
    if (photo) userMessage.image = photo.thumbnail;
    const messages = [...previous, userMessage];
    setSession(s => ({ ...s, messages }));
    setInput('');
    setAttachment(null);
    setError('');
    setSending(true);
    try {
      const data = await sendToAssistant({
        messages, language, conversationId: session.conversationId, productId, image: photo?.photo,
      });
      setSession(s => ({
        ...s,
        messages: [...s.messages, {
          role: 'assistant', content: data.reply, products: data.products, action: data.action,
        }],
      }));
    } catch (failure) {
      setError(failure.message || t.error);
    } finally {
      pendingRef.current = false;
      setSending(false);
    }
  }, [language, productId, session.conversationId, t.error]);

  // Message venu de la barre de recherche
  const lastPrompt = useRef(null);
  useEffect(() => {
    if (prompt && prompt !== lastPrompt.current) {
      lastPrompt.current = prompt;
      send(prompt.text, session.messages);
    }
  }, [prompt, send, session.messages]);

  const restart = () => {
    setSession({ conversationId: newConversationId(), messages: [] });
    setAttachment(null);
    setError('');
  };

  const choosePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setAttachment(await preparePhoto(file));
      setError('');
      inputRef.current?.focus();
    } catch {
      setError(t.photoError);
    }
  };

  // Plein écran sur téléphone : la fiche ouverte remplacerait la conversation
  const closeOnPhone = () => { if (window.innerWidth < 768) onClose(); };

  const lastUser = [...session.messages].reverse().find(m => m.role === 'user');
  const canRetry = error && session.messages.at(-1)?.role === 'user';
  const examples = productId ? [...t.productExamples, ...t.examples.slice(0, 1)] : t.examples;

  return (
    <section
      role="dialog"
      aria-label={t.title}
      hidden={!open}
      className="fixed z-[60] inset-0 md:inset-auto md:right-6 md:bottom-6 md:w-[26rem] md:h-[min(40rem,calc(100vh-3rem))] bg-gray-50 md:rounded-2xl md:shadow-2xl md:border md:border-gray-200 overflow-hidden text-left"
      style={open ? { display: 'flex', flexDirection: 'column' } : undefined}
    >
      <header className="on-dark safe-top bg-purple-800 text-white shrink-0">
        <div className="flex items-center gap-2 pl-4 pr-2 py-2">
          <SparkIcon className="w-5 h-5 text-yellow-300 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold leading-tight text-white">{t.title}</h2>
            <p className="text-xs text-purple-100 truncate">{t.subtitle}</p>
          </div>
          {session.messages.length > 0 && (
            <button type="button" onClick={restart} className="!min-h-0 h-9 px-3 rounded-full text-xs font-semibold text-purple-100 hover:bg-white/10">
              {t.restart}
            </button>
          )}
          <button ref={closeRef} type="button" onClick={onClose} aria-label={t.close} className="!min-h-0 !min-w-0 w-9 h-9 rounded-full text-xl leading-none hover:bg-white/10">
            ×
          </button>
        </div>
      </header>

      <div ref={listRef} role="log" aria-live="polite" className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-3">
        {session.messages.length === 0 && (
          <div>
            <p className="text-sm text-gray-800 bg-white border border-gray-200 rounded-2xl rounded-tl-md px-3 py-2">{t.welcome}</p>
            <div className="mt-3 flex flex-col items-start gap-2">
              {examples.map(example => (
                <button
                  key={example}
                  type="button"
                  onClick={() => send(example, session.messages)}
                  className="!min-h-0 text-left text-sm px-3 py-2 rounded-2xl border border-purple-200 bg-purple-50 text-purple-900 hover:border-purple-400"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {session.messages.map((message, index) => (
          message.role === 'user' ? (
            <div key={index} className="ml-auto w-fit max-w-[85%] flex flex-col items-end gap-1">
              {message.image && (
                <img src={message.image} alt={t.photoSent} className="max-w-[10rem] max-h-40 rounded-2xl rounded-tr-md object-cover border border-purple-200" />
              )}
              {message.content && (
                <p className="text-sm whitespace-pre-line break-words bg-purple-800 text-white rounded-2xl rounded-tr-md px-3 py-2">
                  {message.content}
                </p>
              )}
            </div>
          ) : (
            <div key={index} className="space-y-2">
              <p className="w-fit max-w-[92%] text-sm whitespace-pre-line break-words text-gray-800 bg-white border border-gray-200 rounded-2xl rounded-tl-md px-3 py-2">
                {message.content}
              </p>
              {(message.products || []).map(product => (
                <ProductResult key={product.id} product={product} t={t} onOpen={closeOnPhone} />
              ))}
              {message.action === 'track_order' && (
                <Link to="/suivi-commande" onClick={closeOnPhone} className="inline-block text-sm font-semibold text-purple-800 underline">
                  {t.trackOrder}
                </Link>
              )}
            </div>
          )
        ))}

        {sending && (
          <p role="status" className="w-fit text-sm text-gray-600 bg-white border border-gray-200 rounded-2xl rounded-tl-md px-3 py-2">
            {t.searching}
          </p>
        )}
        {error && (
          <div role="alert" className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            {error}
            {canRetry && (
              <button
                type="button"
                onClick={() => send(lastUser.content, session.messages.slice(0, -1), lastUser.image ? lastPhotoRef.current : null)}
                className="!min-h-0 ml-2 font-semibold underline"
              >
                {t.retry}
              </button>
            )}
          </div>
        )}
      </div>

      <form
        className="safe-bottom shrink-0 border-t border-gray-200 bg-white"
        onSubmit={(event) => { event.preventDefault(); send(input, session.messages, attachment); }}
      >
        {attachment && (
          <div className="flex items-center gap-2 px-3 pt-2">
            <img src={attachment.thumbnail} alt={t.photoAttached} className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
            <span className="flex-1 min-w-0 text-xs text-gray-600">{t.photoHint}</span>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              aria-label={t.photoRemove}
              className="!min-h-0 !min-w-0 w-8 h-8 rounded-full text-lg leading-none text-gray-600 hover:bg-gray-100"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 p-2">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={choosePhoto} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={sending}
            aria-label={t.photoAdd}
            title={t.photoAdd}
            className="!min-h-0 !min-w-0 w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-purple-800 bg-purple-50 hover:bg-purple-100 disabled:text-gray-400 disabled:bg-gray-100 transition-colors"
          >
            <CameraIcon className="w-5 h-5" />
          </button>
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            maxLength={MAX_LENGTH}
            placeholder={attachment ? t.photoPlaceholder : t.placeholder}
            aria-label={t.placeholder}
            enterKeyHint="send"
            className="flex-1 min-w-0 h-11 px-4 text-base md:text-sm text-gray-900 placeholder:text-gray-500 bg-gray-100 !rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            disabled={sending || (!input.trim() && !attachment)}
            className="!min-h-0 h-11 px-4 rounded-full bg-purple-800 hover:bg-purple-900 disabled:bg-gray-300 disabled:text-gray-600 text-white text-sm font-semibold transition-colors"
          >
            {t.send}
          </button>
        </div>
        <p className="px-4 pb-2 text-[0.7rem] text-gray-600">
          {t.notice}{' '}
          <Link to="/privacy-policy" onClick={closeOnPhone} className="underline underline-offset-2">{t.privacy}</Link>
        </p>
      </form>
    </section>
  );
};

export default AssistantPanel;

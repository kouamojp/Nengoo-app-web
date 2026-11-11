import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import { whatsappUrl } from '../../lib/utils';
import { numberFormat } from '../../lib/numberFormat';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const formatPrice = (price) => numberFormat('fr-FR', {
  style: 'currency', currency: 'XAF', minimumFractionDigits: 0,
}).format(price || 0);

// Page du livreur, ouverte par son lien personnel : ses livraisons en cours.
const CourierPage = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [codes, setCodes] = useState({});
  const [notes, setNotes] = useState({});
  const [busy, setBusy] = useState(null);
  const [messages, setMessages] = useState({});
  // Message qui reste visible quand la commande livrée quitte la liste
  const [flash, setFlash] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/courier/${encodeURIComponent(token)}/orders`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail || 'Lien invalide.');
      setData(body);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const act = async (orderId, action) => {
    setBusy(orderId);
    setMessages(m => ({ ...m, [orderId]: null }));
    try {
      const response = await fetch(`${API_BASE_URL}/courier/${encodeURIComponent(token)}/orders/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, code: codes[orderId] || null, note: notes[orderId] || null }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail || 'Action impossible.');
      const done = { start: 'Livraison commencée : le client est prévenu.', delivered: 'Commande livrée. Merci !', failed: 'Tentative notée.' };
      setMessages(m => ({ ...m, [orderId]: { ok: true, text: done[action] } }));
      if (action === 'delivered') setFlash(`${orderId} : ${done.delivered}`);
      await load();
    } catch (e) {
      setMessages(m => ({ ...m, [orderId]: { ok: false, text: e.message } }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-left">
      <Helmet>
        <title>Mes livraisons — Nengoo</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <header className="bg-purple-800 text-white px-4 py-4">
        <p className="text-sm text-purple-200">Nengoo · Livraisons</p>
        <h1 className="text-2xl font-bold">{data ? data.courierName : 'Mes livraisons'}</h1>
      </header>
      <main className="max-w-xl mx-auto px-4 py-6 space-y-4">
        {error && <p role="alert" className="p-4 rounded-lg bg-red-50 text-red-800">{error}</p>}
        {flash && <p role="status" className="p-4 rounded-lg bg-green-50 text-green-900 font-semibold">{flash}</p>}
        {data && data.orders.length === 0 && (
          <p className="p-6 rounded-xl bg-white border border-gray-200 text-gray-700">Aucune livraison en cours.</p>
        )}
        {data && data.orders.map(order => {
          const message = messages[order.id];
          const tel = whatsappUrl(order.phone);
          return (
            <article key={order.id} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-500">{order.id} · {order.sellerName}</p>
                  <h2 className="text-lg font-bold">{order.buyerName}</h2>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-900">{order.statusLabel}</span>
              </div>
              <p className="mt-2 font-semibold">{[order.neighborhood, order.city].filter(Boolean).join(', ')}</p>
              {order.landmark && <p className="text-gray-700">Repère : {order.landmark}</p>}
              {order.address && <p className="text-gray-700">{order.address}</p>}
              <ul className="mt-2 text-sm text-gray-700">
                {order.products.map((p, i) => <li key={i}>{p.quantity} × {p.name}</li>)}
              </ul>
              {order.amountToCollect > 0 && (
                <p className="mt-2 text-lg font-bold text-purple-900">À encaisser : {formatPrice(order.amountToCollect)}</p>
              )}
              {order.attempts > 0 && <p className="text-sm text-orange-700">{order.attempts} tentative(s) sans livraison</p>}

              <div className="mt-3 flex flex-wrap gap-2">
                <a href={`tel:${order.phone}`} className="px-4 py-2 rounded-lg border border-gray-300 font-semibold">Appeler</a>
                {tel && <a href={tel} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-lg bg-green-700 text-white font-semibold">WhatsApp</a>}
                {order.status !== 'out_for_delivery' && (
                  <button type="button" disabled={busy === order.id} onClick={() => act(order.id, 'start')} className="px-4 py-2 rounded-lg bg-purple-700 text-white font-semibold disabled:opacity-60">
                    Je pars livrer
                  </button>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 grid gap-2">
                <label className="text-sm font-semibold" htmlFor={`code-${order.id}`}>Code donné par le client</label>
                <div className="flex gap-2">
                  <input id={`code-${order.id}`} inputMode="numeric" maxLength={4} value={codes[order.id] || ''}
                    onChange={(e) => setCodes(c => ({ ...c, [order.id]: e.target.value.replace(/\D/g, '') }))}
                    className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-lg tracking-widest" />
                  <button type="button" disabled={busy === order.id || (codes[order.id] || '').length !== 4} onClick={() => act(order.id, 'delivered')}
                    className="flex-1 px-4 py-2 rounded-lg bg-green-700 text-white font-semibold disabled:opacity-50">
                    Livrée
                  </button>
                </div>
                <details>
                  <summary className="cursor-pointer text-sm text-gray-700">Livraison impossible ?</summary>
                  <div className="mt-2 flex gap-2">
                    <input value={notes[order.id] || ''} onChange={(e) => setNotes(n => ({ ...n, [order.id]: e.target.value }))}
                      placeholder="Ex. : client absent, injoignable" className="flex-1 border border-gray-300 rounded-lg px-3 py-2" />
                    <button type="button" disabled={busy === order.id} onClick={() => act(order.id, 'failed')} className="px-4 py-2 rounded-lg border border-orange-400 text-orange-800 font-semibold">
                      Noter
                    </button>
                  </div>
                </details>
                {message && <p role="status" className={message.ok ? 'text-green-800' : 'text-red-700'}>{message.text}</p>}
              </div>
            </article>
          );
        })}
      </main>
    </div>
  );
};

export default CourierPage;

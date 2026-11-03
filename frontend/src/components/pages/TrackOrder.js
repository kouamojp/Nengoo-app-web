import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { translations } from '../../lib/translations';
import { orderStatusLabel, orderStatusTone } from '../../lib/orderStatuses';
import Header from '../layout/Header';
import Footer from '../layout/Footer';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';
const inputClass = 'w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500';

const formatPrice = (price) => new Intl.NumberFormat('fr-FR', {
  style: 'currency', currency: 'XAF', minimumFractionDigits: 0,
}).format(price || 0);

// Les dates du serveur sont en UTC sans fuseau
const asDate = (value) => (value ? new Date(String(value).endsWith('Z') ? value : `${value}Z`) : null);

// Suivi d'une commande sans compte : numéro de commande + téléphone utilisé
const TrackOrder = (props) => {
  const { language } = props;
  const t = translations[language];
  const [searchParams, setSearchParams] = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get('commande') || '');
  const [phone, setPhone] = useState(searchParams.get('tel') || '');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const lookup = useCallback(async (id, tel) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/orders/track?orderId=${encodeURIComponent(id.trim())}&phone=${encodeURIComponent(tel.trim())}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(response.status === 404 ? t.orderNotFound : (data.detail || t.orderNotFound));
      setOrder(data);
    } catch (e) {
      setOrder(null);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Lien depuis la confirmation de commande : recherche immédiate
  useEffect(() => {
    const id = searchParams.get('commande');
    const tel = searchParams.get('tel');
    if (id && tel) lookup(id, tel);
  }, [searchParams, lookup]);

  const submit = (e) => {
    e.preventDefault();
    setSearchParams({ commande: orderId.trim(), tel: phone.trim() });
  };

  const fmtDate = (value) => asDate(value)?.toLocaleString(language === 'en' ? 'en-GB' : 'fr-FR', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>{t.trackOrderTitle} — Nengoo</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Header {...props} />
      <main className="container mx-auto px-4 py-10 max-w-xl text-left">
        <h1 className="text-3xl font-bold text-purple-950">{t.trackOrderTitle}</h1>
        <p className="mt-2 text-gray-700">{t.trackOrderIntro}</p>

        <form onSubmit={submit} className="mt-6 bg-white rounded-2xl border border-gray-200 p-5 grid gap-4">
          <label className="block">
            <span className="block text-sm font-semibold mb-1">{t.orderNumber}</span>
            <input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="ord_1a2b3c4d" required className={inputClass} />
          </label>
          <label className="block">
            <span className="block text-sm font-semibold mb-1">{t.phone}</span>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="+237 6XX XX XX XX" required className={inputClass} />
          </label>
          <button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white py-3 rounded-lg font-semibold">
            {loading ? '…' : t.trackButton}
          </button>
          {error && <p role="alert" className="text-red-700">{error}</p>}
        </form>

        {order && (
          <section className="mt-6 bg-white rounded-2xl border border-gray-200 p-5" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-gray-500">{t.orderNumber} · {order.sellerName}</p>
                <p className="text-lg font-bold">{order.id}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${orderStatusTone(order.status)}`}>
                {orderStatusLabel(order.status, language)}
              </span>
            </div>

            <ol className="mt-5 border-l-2 border-purple-200 ml-2 space-y-4">
              {order.history.map((step, i) => (
                <li key={i} className="pl-4 relative">
                  <span className={`absolute -left-[7px] top-1.5 w-3 h-3 rounded-full ${i === order.history.length - 1 ? 'bg-purple-700' : 'bg-purple-300'}`} aria-hidden="true" />
                  <p className="font-semibold">{orderStatusLabel(step.status, language)}</p>
                  {step.at && <p className="text-sm text-gray-500">{fmtDate(step.at)}</p>}
                </li>
              ))}
            </ol>

            <ul className="mt-5 pt-4 border-t border-gray-200 space-y-1 text-sm">
              {order.products.map((p, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>{p.quantity} × {p.name}</span>
                  <span className="tabular-nums">{formatPrice(p.price * p.quantity)}</span>
                </li>
              ))}
              <li className="flex justify-between gap-3 pt-2 font-bold">
                <span>{t.total}</span>
                <span className="tabular-nums">{formatPrice(order.totalAmount)}</span>
              </li>
            </ul>
          </section>
        )}
      </main>
      <Footer language={language} />
    </div>
  );
};

export default TrackOrder;

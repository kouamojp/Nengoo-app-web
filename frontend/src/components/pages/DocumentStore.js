import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import DocumentCard from '../documents/DocumentCard';
import { api, CATEGORY_LABELS_EN, TEXT } from '../../lib/documents';
import { BusyLabel } from '../ui/Spinner';

const PAGE_SIZE = 24;
const FILTERS = ['category', 'level', 'subject', 'year', 'q', 'sort'];

/** Bandeau du quota : documents offerts restants, ou invitation à créer un compte. */
export const QuotaBanner = ({ user, quota, freeDownloads, language }) => {
  const t = TEXT[language];
  if (user?.type === 'buyer' && quota) {
    return (
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 rounded-xl bg-yellow-100 text-purple-950 text-sm">
        <span className="font-semibold">
          {quota.remaining > 0 ? t.quotaLeft(quota.remaining, quota.limit) : t.quotaUsed(quota.limit)}
        </span>
        <Link to="/profile?tab=documents" className="font-semibold underline underline-offset-4">{t.myDocuments}</Link>
      </p>
    );
  }
  if (!user && freeDownloads) {
    return (
      <p className="px-4 py-3 rounded-xl bg-yellow-100 text-purple-950 text-sm">
        <Link to="/signup/buyer?next=/documents" className="font-semibold underline underline-offset-4">{t.quotaGuest(freeDownloads)}</Link>
      </p>
    );
  }
  return null;
};

const DocumentStore = (props) => {
  const { language, user } = props;
  const t = TEXT[language];
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quota, setQuota] = useState(null);
  const [search, setSearch] = useState(params.get('q') || '');
  const [reload, setReload] = useState(0);

  const query = Object.fromEntries(FILTERS.map(k => [k, params.get(k) || '']));

  useEffect(() => {
    api('/documents/filters').then(setFilters).catch(() => setFilters(null));
  }, []);

  useEffect(() => {
    if (user?.type !== 'buyer') return;
    api('/documents/me/library').then(d => setQuota(d.quota)).catch(() => {});
  }, [user]);

  // Une nouvelle recherche repart de la première page (setFilter)
  const loadError = t.loadError;
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const qs = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    FILTERS.forEach(k => params.get(k) && qs.set(k, params.get(k)));
    api(`/documents?${qs}`)
      .then(data => {
        if (cancelled) return;
        setItems(prev => (page === 1 ? data.items : [...prev, ...data.items]));
        setTotal(data.total);
      })
      .catch(() => !cancelled && setError(loadError))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [params, page, reload, loadError]);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setPage(1);
    setParams(next, { replace: true });
  };

  const submitSearch = (e) => {
    e.preventDefault();
    setFilter('q', search.trim());
  };

  const categories = filters?.categories || [];
  const selectClass = 'h-11 pl-3 pr-8 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500';

  return (
    <>
      <Helmet>
        <title>{t.pageTitle}</title>
        <meta name="description" content={t.pageDescription} />
        <link rel="canonical" href="https://www.nengoo.com/documents" />
      </Helmet>
      <div className="min-h-screen bg-gray-50 text-left">
        <Header {...props} />
        <main className="container mx-auto px-4 pt-6 sm:pt-10 pb-14">
          <h1 className="font-display text-4xl sm:text-5xl text-purple-950">{t.title}</h1>
          <p className="mt-2 max-w-2xl text-gray-700">{t.intro(filters?.freeDownloads || 10)}</p>

          <div className="mt-5">
            <QuotaBanner user={user} quota={quota} freeDownloads={filters?.freeDownloads} language={language} />
          </div>

          {/* Catégories */}
          <nav className="mt-6 -mx-4 px-4 flex gap-2 overflow-x-auto pb-1" aria-label={t.title}>
            {[{ id: '', label: t.allCategories }, ...categories].map(c => {
              const active = query.category === c.id;
              return (
                <button
                  key={c.id || 'all'}
                  type="button"
                  onClick={() => setFilter('category', c.id)}
                  aria-pressed={active}
                  className={`shrink-0 !min-h-0 h-10 px-4 rounded-full text-sm font-semibold border transition-colors ${
                    active ? 'bg-purple-800 border-purple-800 text-white' : 'bg-white border-gray-300 text-gray-800 hover:border-purple-400'
                  }`}
                >
                  {c.id && language === 'en' ? CATEGORY_LABELS_EN[c.id] || c.label : c.label}
                </button>
              );
            })}
          </nav>

          {/* Recherche et filtres */}
          <div className="mt-4 flex flex-wrap gap-3">
            <form onSubmit={submitSearch} className="flex-1 min-w-[14rem] max-w-md" role="search">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onBlur={() => search.trim() !== query.q && setFilter('q', search.trim())}
                placeholder={t.search}
                aria-label={t.search}
                className="w-full h-11 px-4 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </form>
            {[['level', filters?.levels], ['subject', filters?.subjects], ['year', filters?.years]].map(([key, values]) => (
              values?.length > 0 && (
                <select key={key} value={query[key]} onChange={(e) => setFilter(key, e.target.value)} aria-label={t[key]} className={selectClass}>
                  <option value="">{t[key]} : {t.any}</option>
                  {values.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              )
            ))}
            <select value={query.sort || 'recent'} onChange={(e) => setFilter('sort', e.target.value === 'recent' ? '' : e.target.value)} aria-label={t.sort} className={selectClass}>
              {Object.entries(t.sorts).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>

          <p className="mt-5 text-sm text-gray-600" aria-live="polite">{!loading || page > 1 ? t.results(total) : ' '}</p>

          {error ? (
            <div className="mt-4 p-6 bg-white rounded-xl border border-gray-200" role="alert">
              <p className="text-gray-800">{error}</p>
              <button type="button" onClick={() => setReload(r => r + 1)} className="mt-3 font-semibold text-purple-800 underline underline-offset-4">{t.retry}</button>
            </div>
          ) : (
            <>
              <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                {items.map(doc => <li key={doc.id} className="flex"><DocumentCard doc={doc} language={language} /></li>)}
                {loading && page === 1 && [...Array(8)].map((_, i) => (
                  <li key={`s${i}`} className="aspect-[3/4] rounded-xl loading-shimmer" aria-hidden="true" />
                ))}
              </ul>
              {!loading && items.length === 0 && (
                <p className="mt-6 p-6 bg-white rounded-xl border border-gray-200 text-gray-700">
                  {FILTERS.some(k => params.get(k)) ? t.empty : t.comingSoon}
                </p>
              )}
              {items.length > 0 && items.length < total && (
                <div className="mt-8 text-center">
                  <button type="button" onClick={() => setPage(p => p + 1)} disabled={loading} aria-busy={loading} className="h-11 px-6 rounded-full border border-purple-800 text-purple-800 font-semibold hover:bg-purple-50 disabled:opacity-70">
                    <BusyLabel busy={loading} busyText={t.loadingMore} tone="dark">{t.more}</BusyLabel>
                  </button>
                </div>
              )}
            </>
          )}
        </main>
        <Footer language={language} />
      </div>
    </>
  );
};

export default DocumentStore;

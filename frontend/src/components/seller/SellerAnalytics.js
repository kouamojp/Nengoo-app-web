import React, { useState, useEffect } from 'react';
import SellerHeader from './SellerHeader';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const formatXAF = (value) =>
  `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value || 0)} XAF`;

// 1 250 000 -> « 1,3 M » ; 85 000 -> « 85 k » (étiquettes courtes du graphique)
const compact = (value) =>
  new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);

const Stat = ({ label, value }) => (
  <div className="adm-card p-5">
    <p className="text-sm font-semibold text-gray-600">{label}</p>
    <p className="price mt-1 text-3xl text-purple-950 tabular-nums">{value}</p>
  </div>
);

/**
 * Revenus mensuels : une seule série, donc pas de légende (le titre la nomme).
 * Seuls le mois courant et le meilleur mois portent une étiquette ; les autres
 * valeurs sont au survol / au focus, et dans le tableau pour les lecteurs d'écran.
 */
const RevenueChart = ({ data }) => {
  const [active, setActive] = useState(null);
  const max = Math.max(...data.map(d => d.revenue), 0);
  const currentMonth = new Date().toLocaleString('en-US', { month: 'short' });
  const bestIndex = data.reduce((best, d, i) => (d.revenue > (data[best]?.revenue ?? -1) ? i : best), 0);

  if (max === 0) {
    return <p className="py-16 text-center text-gray-600">Pas encore de ventes sur la période.</p>;
  }

  return (
    <>
      <div className="relative h-56 flex items-end gap-1.5 sm:gap-3 border-b border-gray-300" aria-hidden="true">
        {data.map((d, i) => {
          const labelled = d.month === currentMonth || i === bestIndex;
          const height = Math.max((d.revenue / max) * 100, d.revenue > 0 ? 2 : 0);
          return (
            <div
              key={d.month}
              className="relative flex-1 h-full flex flex-col justify-end items-center"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            >
              {(labelled || active === i) && (
                <span className={`price mb-1 text-xs tabular-nums whitespace-nowrap ${active === i ? 'text-purple-950' : 'text-gray-700'}`}>
                  {active === i ? formatXAF(d.revenue) : compact(d.revenue)}
                </span>
              )}
              <div
                className={`w-full max-w-[2.5rem] rounded-t bg-purple-700 transition-opacity ${active !== null && active !== i ? 'opacity-40' : ''}`}
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5 sm:gap-3" aria-hidden="true">
        {data.map(d => (
          <span key={d.month} className={`flex-1 text-center text-xs ${d.month === currentMonth ? 'font-bold text-purple-950' : 'text-gray-600'}`}>
            {d.month}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>Revenus par mois</caption>
        <thead><tr><th>Mois</th><th>Revenus</th></tr></thead>
        <tbody>
          {data.map(d => <tr key={d.month}><td>{d.month}</td><td>{formatXAF(d.revenue)}</td></tr>)}
        </tbody>
      </table>
    </>
  );
};

const SellerAnalytics = (props) => {
  const { user } = props;
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/sellers/${user.id}/analytics`, {
          headers: { 'X-Seller-Id': user.id },
        });
        if (!response.ok) throw new Error('Failed to fetch analytics');
        setAnalyticsData(await response.json());
        setError(false);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [user]);

  const topProducts = analyticsData?.top_products || [];

  return (
    <div>
      <SellerHeader title="Statistiques" description="Vos ventes depuis l'ouverture de la boutique." />

      {error && (
        <p className="adm-card p-5 mb-6 text-red-700">Impossible de charger les statistiques. Rechargez la page pour réessayer.</p>
      )}

      <section aria-label="Chiffres clés" className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Stat label="Revenus" value={loading ? '…' : formatXAF(analyticsData?.total_revenue)} />
        <Stat label="Commandes" value={loading ? '…' : (analyticsData?.total_orders || 0)} />
        <Stat label="Clients" value={loading ? '…' : (analyticsData?.total_customers || 0)} />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <section className="adm-card p-5 sm:p-6 xl:col-span-3">
          <h2 className="text-lg font-extrabold text-purple-950 mb-5">Revenus par mois</h2>
          {loading
            ? <p className="py-16 text-center text-gray-600">Chargement…</p>
            : <RevenueChart data={analyticsData?.monthly_revenue || []} />}
        </section>

        <section className="adm-card p-5 sm:p-6 xl:col-span-2">
          <h2 className="text-lg font-extrabold text-purple-950 mb-4">Meilleures ventes</h2>
          {topProducts.length === 0 ? (
            <p className="py-10 text-center text-gray-600">{loading ? 'Chargement…' : 'Vos produits les plus vendus apparaîtront ici.'}</p>
          ) : (
            <ol className="divide-y divide-gray-100">
              {topProducts.map((product, index) => (
                <li key={product.name} className="flex items-center gap-3 py-3">
                  <span className="price w-6 text-lg text-gray-500 tabular-nums">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{product.name}</p>
                    <p className="text-sm text-gray-600">{product.sales} vente{product.sales > 1 ? 's' : ''}</p>
                  </div>
                  <p className="price text-purple-950 tabular-nums">{formatXAF(product.revenue)}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
};

export default SellerAnalytics;

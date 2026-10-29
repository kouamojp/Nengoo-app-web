
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { translations } from '../../lib/translations';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import { PinIcon, ClockIcon, PhoneIcon, RouteIcon, WhatsAppIcon } from '../ui/Icons';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

// Statuts qui retirent un point de la liste publique (le checkout propose tous les autres)
const HIDDEN_STATUSES = ['rejected', 'inactive', 'suspended'];

// "YAOUNDE " / "douala" → "Yaounde" / "Douala"
const formatCity = (city = '') => city
  .trim()
  .toLowerCase()
  .replace(/(^|[\s-])\S/g, (c) => c.toUpperCase());

const phoneHref = (number = '') => number.replace(/[^\d+]/g, '');

export const PickupPointsMap = (props) => {
  const { language } = props;
  const t = translations[language];
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedCity, setSelectedCity] = useState('all');

  useEffect(() => {
    const fetchPickupPoints = async () => {
      try {
        setLoading(true);
        setLoadError(false);
        const response = await fetch(`${API_BASE_URL}/pickup-points`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setPoints(data.filter(point => !HIDDEN_STATUSES.includes(point.status)));
      } catch (error) {
        console.error('Erreur lors de la récupération des points de retrait:', error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchPickupPoints();
  }, [reloadKey]);

  const pointsByCity = points.reduce((acc, point) => {
    const city = formatCity(point.city);
    (acc[city] = acc[city] || []).push(point);
    return acc;
  }, {});
  const cities = Object.keys(pointsByCity).sort((a, b) => a.localeCompare(b, 'fr'));
  const visiblePoints = (selectedCity === 'all' ? cities : [selectedCity])
    .flatMap(city => pointsByCity[city] || []);

  const chipClass = (active) => `shrink-0 inline-flex items-center gap-1.5 h-9 !min-h-0 px-4 rounded-full text-sm font-semibold border transition-colors ${
    active
      ? 'bg-purple-700 border-purple-700 text-white'
      : 'bg-white border-gray-300 text-gray-800 hover:border-purple-400'
  }`;

  return (
    <>
      <Helmet>
        <title>Points de retrait — Nengoo Marketplace Cameroun</title>
        <meta name="description" content="Trouvez un point de retrait Nengoo près de chez vous à Douala, Yaoundé, Bafoussam et ailleurs au Cameroun. Adresses, horaires et contacts." />
        <link rel="canonical" href="https://www.nengoo.com/pickup-points" />
      </Helmet>
      <div className="min-h-screen bg-gray-50 text-left">
        <Header {...props} />

        <main className="container mx-auto px-4 pt-6 sm:pt-10 pb-14">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-8 lg:gap-14 items-start">
            <div>
              <h1 className="font-display text-4xl sm:text-5xl text-purple-950">{t.pickupPoints}</h1>
              <p className="mt-3 text-lg text-gray-700 max-w-[46ch] leading-relaxed">{t.pickupIntro}</p>
            </div>

            {/* Étapes : une vraie séquence, d'où la numérotation */}
            <section aria-labelledby="how-it-works" className="bg-white rounded-xl border border-gray-200 p-5 sm:p-6">
              <h2 id="how-it-works" className="text-lg font-bold mb-4">{t.howItWorks}</h2>
              <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
                {t.pickupSteps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="price shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center" aria-hidden="true">{i + 1}</span>
                    <span className="text-sm text-gray-700 leading-snug pt-1.5">{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          {loading ? (
            <div className="mt-10 grid md:grid-cols-2 xl:grid-cols-3 gap-4" aria-busy="true">
              {[...Array(3)].map((_, i) => <div key={i} className="h-56 rounded-xl loading-shimmer" />)}
            </div>
          ) : loadError ? (
            <div className="mt-10 py-14 px-6 bg-white rounded-xl border border-gray-200 text-center" role="alert">
              <p className="text-gray-800 max-w-md mx-auto">{t.pickupError}</p>
              <button type="button" onClick={() => setReloadKey(k => k + 1)} className="mt-5 inline-flex items-center h-11 px-5 rounded-full bg-purple-700 text-white font-semibold hover:bg-purple-800">
                {t.retry}
              </button>
            </div>
          ) : points.length === 0 ? (
            <div className="mt-10 py-14 px-6 bg-white rounded-xl border border-dashed border-gray-300 text-center">
              <h2 className="text-xl font-bold mb-2">{t.pickupEmpty}</h2>
              <p className="text-gray-600 max-w-md mx-auto">{t.pickupEmptyText}</p>
            </div>
          ) : (
            <>
              <div className="mt-10 mb-6 flex flex-wrap items-center gap-x-4 gap-y-3">
                <p className="text-gray-600 font-semibold">{t.pickupCount(points.length)}</p>
                {cities.length > 1 && (
                  <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto hide-scrollbar max-w-full">
                    <button type="button" onClick={() => setSelectedCity('all')} aria-pressed={selectedCity === 'all'} className={chipClass(selectedCity === 'all')}>
                      {t.allCities}
                    </button>
                    {cities.map(city => (
                      <button key={city} type="button" onClick={() => setSelectedCity(city)} aria-pressed={selectedCity === city} className={chipClass(selectedCity === city)}>
                        {city}
                        <span className="tabular-nums opacity-70">{pointsByCity[city].length}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <ul className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {visiblePoints.map(point => {
                        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${point.address}, ${formatCity(point.city)}, Cameroun`)}`;
                        const whatsapp = phoneHref(point.managerWhatsApp).replace('+', '');
                        return (
                          <li key={point.id} className="flex flex-col bg-white rounded-xl border border-gray-200 p-5">
                            <h2 className="text-xl font-bold leading-tight">{point.name}</h2>
                            <p className="text-sm font-semibold text-purple-700 mt-0.5">
                              {[formatCity(point.city), point.region].filter(Boolean).join(', ')}
                            </p>

                            <dl className="mt-4 space-y-2.5 text-sm text-gray-800">
                              <div className="flex gap-2.5">
                                <dt className="sr-only">Adresse</dt>
                                <PinIcon className="w-5 h-5 shrink-0 text-purple-700" />
                                <dd>{point.address}</dd>
                              </div>
                              {point.hours && (
                                <div className="flex gap-2.5">
                                  <dt className="sr-only">Horaires</dt>
                                  <ClockIcon className="w-5 h-5 shrink-0 text-purple-700" />
                                  <dd>{point.hours}</dd>
                                </div>
                              )}
                            </dl>

                            {point.description && (
                              <p className="mt-3 text-sm text-gray-600">{point.description}</p>
                            )}
                            {point.managerName && (
                              <p className="mt-3 text-sm text-gray-500">{t.managedBy(point.managerName)}</p>
                            )}

                            <div className="mt-auto pt-5 flex flex-wrap gap-2">
                              {whatsapp && (
                                <a
                                  href={`https://wa.me/${whatsapp}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 min-w-[8rem] inline-flex items-center justify-center gap-2 h-10 px-3 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
                                >
                                  <WhatsAppIcon className="w-5 h-5" />
                                  WhatsApp
                                </a>
                              )}
                              {point.phone && (
                                <a
                                  href={`tel:${phoneHref(point.phone)}`}
                                  className="flex-1 min-w-[6rem] inline-flex items-center justify-center gap-2 h-10 px-3 rounded-lg border border-gray-300 text-gray-900 text-sm font-semibold hover:border-purple-400 transition-colors"
                                >
                                  <PhoneIcon className="w-4 h-4" />
                                  {t.call}
                                </a>
                              )}
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 min-w-[7rem] inline-flex items-center justify-center gap-2 h-10 px-3 rounded-lg border border-gray-300 text-gray-900 text-sm font-semibold hover:border-purple-400 transition-colors"
                              >
                                <RouteIcon className="w-4 h-4" />
                                {t.directions}
                              </a>
                            </div>
                          </li>
                        );
                      })}
              </ul>
            </>
          )}
        </main>

        <Footer language={language} />
      </div>
    </>
  );
};

export default PickupPointsMap;

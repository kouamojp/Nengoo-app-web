
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import Header from '../layout/Header';
import Footer from '../layout/Footer';
import { StoreIcon, WhatsAppIcon, PinIcon } from '../ui/Icons';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

const DEFAULT_IMAGE = "https://images.pexels.com/photos/13086663/pexels-photo-13086663.jpeg";

// Ce que la plateforme permet réellement de faire
const features = [
  {
    Icon: StoreIcon,
    title: 'Des vendeurs d\'ici',
    text: 'Chaque boutique est tenue par un commerçant ou un artisan installé au Cameroun, avec sa propre page et ses produits.',
  },
  {
    Icon: WhatsAppIcon,
    title: 'Un contact direct',
    text: 'Une question sur un article ? Écrivez au vendeur sur WhatsApp ou par message, depuis la fiche produit.',
  },
  {
    Icon: PinIcon,
    title: 'Livraison ou retrait',
    text: 'Faites-vous livrer chez vous ou récupérez votre commande dans un point de retrait près de chez vous.',
  },
];

export const About = (props) => {
  const { language } = props;
  const [aboutSettings, setAboutSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAboutSettings = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/about-page-settings`);
        if (response.ok) {
          const data = await response.json();
          setAboutSettings(data);
        }
      } catch (error) {
        console.error('Error fetching about page settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAboutSettings();
  }, []);

  // Default values if API fails
  const missionImage = aboutSettings?.mission_image_url || DEFAULT_IMAGE;
  const missionTitle = aboutSettings?.mission_title || "Notre Mission";
  const missionText1 = aboutSettings?.mission_text_1 || "Nengoo a été créé avec pour mission de connecter les consommateurs camerounais aux meilleurs produits locaux et internationaux, tout en soutenant l'économie locale et l'artisanat traditionnel.";
  const missionText2 = aboutSettings?.mission_text_2 || "Nous croyons fermement au potentiel du commerce électronique pour transformer l'économie camerounaise et offrir de nouvelles opportunités aux entrepreneurs locaux.";

  return (
    <>
      <Helmet>
        <title>À propos — Nengoo Marketplace Cameroun</title>
        <meta name="description" content="Nengoo réunit les vendeurs et artisans du Cameroun sur une seule marketplace : contact direct sur WhatsApp, livraison à domicile ou en point de retrait." />
        <link rel="canonical" href="https://www.nengoo.com/about" />
      </Helmet>
      <div className="min-h-screen bg-gray-50 text-left">
        <Header {...props} />

        <main>
          <section className="container mx-auto px-4 pt-8 sm:pt-14 pb-12 sm:pb-16">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10 lg:gap-16 items-center">
              <div>
                <h1 className="font-display text-5xl sm:text-6xl text-purple-950">À propos de Nengoo</h1>
                <p className="mt-4 text-xl text-gray-700">Votre marketplace camerounaise de confiance depuis 2025.</p>

                <h2 className="mt-10 text-2xl font-extrabold">{missionTitle}</h2>
                <div className="mt-3 space-y-4 text-gray-700 leading-relaxed max-w-[60ch]">
                  <p>{missionText1}</p>
                  <p>{missionText2}</p>
                </div>
              </div>

              {loading ? (
                <div className="aspect-[4/5] max-h-[34rem] w-full rounded-2xl loading-shimmer" />
              ) : (
                <img
                  src={missionImage}
                  alt=""
                  className="aspect-[4/5] max-h-[34rem] w-full rounded-2xl object-cover object-top"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = DEFAULT_IMAGE;
                  }}
                />
              )}
            </div>
          </section>

          <section className="bg-white border-y border-gray-200" aria-labelledby="about-features">
            <div className="container mx-auto px-4 py-12 sm:py-16">
              <h2 id="about-features" className="text-2xl sm:text-3xl font-extrabold mb-8">Ce que Nengoo vous apporte</h2>
              <ul className="grid md:grid-cols-3 gap-8 md:gap-10">
                {features.map(({ Icon, title, text }) => (
                  <li key={title}>
                    <span className="w-12 h-12 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center">
                      <Icon className="w-6 h-6" />
                    </span>
                    <h3 className="mt-4 text-xl font-bold">{title}</h3>
                    <p className="mt-2 text-gray-600 leading-relaxed">{text}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="container mx-auto px-4 py-12 sm:py-16">
            <div className="on-dark rounded-2xl bg-gradient-to-br from-purple-700 to-red-600 text-white p-8 sm:p-12 grid md:grid-cols-[minmax(0,1fr)_auto] gap-6 items-center">
              <div>
                <h2 className="font-display text-4xl sm:text-5xl">Rejoignez le marché</h2>
                <p className="mt-3 text-lg text-purple-100 max-w-[50ch]">
                  Achetez auprès des vendeurs du Cameroun, ou ouvrez votre boutique et vendez à vos clients partout dans le pays.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to="/catalog" className="inline-flex items-center h-12 px-6 rounded-full bg-white text-purple-800 font-bold hover:bg-yellow-300 hover:text-purple-950 transition-colors">
                  Voir le catalogue
                </Link>
                <Link to="/signup/seller" className="inline-flex items-center h-12 px-6 rounded-full border border-white/60 text-white font-semibold hover:bg-white/10 transition-colors">
                  Devenir vendeur
                </Link>
              </div>
            </div>
          </section>
        </main>

        <Footer language={language} />
      </div>
    </>
  );
};

export default About;


import React, { useState, useEffect } from 'react';

const InstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Fallback for iOS or already installed
      alert('Pour installer Nengoo:\n\niOS: Cliquez sur le bouton Partager puis "Ajouter à l\'écran d\'accueil"\n\nAndroid: Utilisez le menu du navigateur "Ajouter à l\'écran d\'accueil"');
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
  };

  if (isInstalled) return null;

  return (
    <button
      onClick={handleInstall}
      className="hidden sm:flex items-center space-x-2 bg-yellow-400 hover:bg-yellow-500 text-black px-4 py-2 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl"
      title="Installer l\'application Nengoo"
    >
      <span className="text-lg">📱</span>
      <span className="text-sm">Installer l\'App</span>
    </button>
  );
};

export default InstallButton;

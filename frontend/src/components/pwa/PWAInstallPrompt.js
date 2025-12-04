
import React, { useState, useEffect } from 'react';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    setShowInstall(false);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    
    setDeferredPrompt(null);
  };

  if (!showInstall) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-gradient-to-r from-purple-600 to-red-600 text-white p-4 rounded-lg shadow-xl z-50 animate-bounce">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">📱</span>
          <div>
            <p className="font-semibold text-sm">Installer Nengoo</p>
            <p className="text-xs opacity-90">Accès rapide depuis votre écran d'accueil</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleInstall}
            className="bg-white text-purple-600 px-3 py-1 rounded text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            Installer
          </button>
          <button
            onClick={() => setShowInstall(false)}
            className="text-white hover:text-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;

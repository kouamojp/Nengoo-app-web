
import React, { useState, useEffect } from 'react';

// Install App Button Component (Homepage - Large)
const InstallAppButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

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
      // Show manual installation instructions
      setShowInstructions(true);
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <div className="bg-green-50 border-2 border-green-500 rounded-xl p-6 text-center">
        <span className="text-5xl mb-3 block">✅</span>
        <h3 className="text-xl font-bold text-green-800 mb-2">Application Installée!</h3>
        <p className="text-green-700">Nengoo est maintenant sur votre écran d'accueil</p>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleInstall}
        className="w-full bg-gradient-to-r from-purple-600 to-red-600 hover:from-purple-700 hover:to-red-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-xl hover:shadow-2xl hover:scale-105 flex items-center justify-center space-x-3"
      >
        <span className="text-3xl">📱</span>
        <span>Installer l'Application</span>
      </button>

      {/* Manual Installation Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <span className="text-6xl mb-4 block">📱</span>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Comment Installer Nengoo
              </h3>
            </div>

            <div className="space-y-6 text-left">
              {/* iOS Instructions */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-bold text-blue-900 mb-3 flex items-center">
                  <span className="text-2xl mr-2">🍎</span>
                  Sur iPhone/iPad (Safari):
                </h4>
                <ol className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start">
                    <span className="font-bold mr-2">1.</span>
                    <span>Appuyez sur le bouton <strong>Partager</strong> (□↑) en bas</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">2.</span>
                    <span>Faites défiler et choisissez <strong>"Sur l'écran d'accueil"</strong></span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">3.</span>
                    <span>Appuyez sur <strong>"Ajouter"</strong></span>
                  </li>
                </ol>
              </div>

              {/* Android Instructions */}
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-bold text-green-900 mb-3 flex items-center">
                  <span className="text-2xl mr-2">🤖</span>
                  Sur Android (Chrome):
                </h4>
                <ol className="space-y-2 text-sm text-green-800">
                  <li className="flex items-start">
                    <span className="font-bold mr-2">1.</span>
                    <span>Appuyez sur le menu <strong>(⋮)</strong> en haut à droite</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">2.</span>
                    <span>Sélectionnez <strong>"Installer l'application"</strong></span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-bold mr-2">3.</span>
                    <span>Appuyez sur <strong>"Installer"</strong></span>
                  </li>
                </ol>
              </div>
            </div>

            <button
              onClick={() => setShowInstructions(false)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold mt-6 transition-colors"
            >
              Compris!
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallAppButton;

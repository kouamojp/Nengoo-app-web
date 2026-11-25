import React, { useState, useEffect } from "react";
import { CloseIcon, SmartphoneIcon } from "../ui/Icons";

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setShowInstall(false);
    };

    // Événement arrivé avant l'affichage de l'accueil (public/index.html)
    if (window.__nengooInstallPrompt) handler(window.__nengooInstallPrompt);

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Installé ou fermé : ne pas reproposer au prochain passage sur l'accueil
  const dismiss = () => {
    window.__nengooInstallPrompt = null;
    setShowInstall(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    dismiss();
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      // User accepted the install prompt
    }

    setDeferredPrompt(null);
  };

  if (!showInstall) return null;

  return (
    <div className="fixed bottom-16 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-gradient-to-r from-purple-600 to-red-600 text-white p-4 rounded-lg shadow-xl z-50 animate-bounce">
      <div className="flex items-center justify-between">
        <div className="flex items-start space-x-3">
          <SmartphoneIcon className="w-7 h-7 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">Installer Nengoo</p>
            <p className="text-xs opacity-90">
              Accès rapide depuis votre écran d'accueil
            </p>
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
            onClick={dismiss}
            aria-label="Fermer"
            className="text-white hover:text-gray-200 transition-colors"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;

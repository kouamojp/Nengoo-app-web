import React, { useState } from 'react';
import Swal from 'sweetalert2';
import {
  signInWithGoogle,
  signInWithFacebook,
  signInWithApple,
  getFirebaseIdToken,
  authenticateWithBackend,
  getUserProviderData,
  getOAuthErrorMessage,
} from '../../lib/authService';

/**
 * Social Login Buttons Component
 * Provides Google, Facebook, and Apple Sign-In buttons
 *
 * @param {string} userType - 'buyer' or 'seller'
 * @param {Function} setUser - Function to set user in parent component
 * @param {string} mode - 'signup' or 'login' (optional, default 'both')
 */
const SocialLoginButtons = ({ userType = 'buyer', setUser, mode = 'both' }) => {
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(null);

  /**
   * Handle social sign-in flow
   * @param {Function} signInMethod - The OAuth sign-in function
   * @param {string} providerName - Name for display (Google, Facebook, Apple)
   */
  const handleSocialSignIn = async (signInMethod, providerName) => {
    setLoading(true);
    setLoadingProvider(providerName);

    try {
      // Step 1: Sign in with OAuth provider
      const user = await signInMethod();

      // If null, it means redirect flow was triggered (will complete on redirect)
      if (!user) {
        console.log(`${providerName} redirect flow initiated...`);
        return;
      }

      console.log(`✅ ${providerName} Sign-In successful:`, user);

      // Step 2: Get Firebase ID token
      const idToken = await getFirebaseIdToken();
      console.log('✅ Firebase ID token obtained');

      // Step 3: Authenticate with Nengoo backend
      const userData = await authenticateWithBackend(idToken, userType);
      console.log('✅ Backend authentication successful:', userData);

      // Step 4: Save user data and redirect
      setUser(userData);
      localStorage.setItem('nengoo-user', JSON.stringify(userData));

      // Success message
      Swal.fire({
        icon: 'success',
        title: 'Connexion réussie!',
        text: `Bienvenue ${userData.name || 'sur Nengoo'}!`,
        showConfirmButton: false,
        timer: 1500,
      });

      // Redirect based on user type
      setTimeout(() => {
        if (userType === 'seller') {
          window.location.href = '/seller';
        } else {
          window.location.href = '/';
        }
      }, 1500);

    } catch (error) {
      console.error(`${providerName} Sign-In error:`, error);

      // Handle specific error: seller not approved
      if (error.message.includes('approuvé') || error.message.includes('approved')) {
        Swal.fire({
          icon: 'warning',
          title: 'Compte vendeur non approuvé',
          html: `
            <p>Aucun compte vendeur approuvé n'a été trouvé avec cette adresse e-mail.</p>
            <p><strong>Veuillez d'abord vous inscrire en tant que vendeur et attendre l'approbation de l'administrateur.</strong></p>
          `,
          confirmButtonText: 'Compris',
        });
      } else if (error.message.includes('account-exists-with-different-credential')) {
        // Handle account exists with different provider
        Swal.fire({
          icon: 'error',
          title: 'Compte existant',
          html: `
            <p>Un compte existe déjà avec cette adresse e-mail via une autre méthode de connexion.</p>
            <p>Veuillez utiliser la méthode de connexion originale.</p>
          `,
        });
      } else {
        // Generic error
        const errorMessage = getOAuthErrorMessage(error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur de connexion',
          text: errorMessage,
        });
      }
    } finally {
      setLoading(false);
      setLoadingProvider(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">
            {mode === 'signup' ? 'Ou inscrivez-vous avec' : 'Ou connectez-vous avec'}
          </span>
        </div>
      </div>

      {/* Social Buttons */}
      <div className="space-y-3">
        {/* Google Sign-In */}
        <button
          type="button"
          onClick={() => handleSocialSignIn(signInWithGoogle, 'Google')}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingProvider === 'Google' ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          <span className="font-medium text-gray-700">
            Continuer avec Google
          </span>
        </button>

        {/* Facebook Login */}
        <button
          type="button"
          onClick={() => handleSocialSignIn(signInWithFacebook, 'Facebook')}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingProvider === 'Facebook' ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          )}
          <span className="font-medium text-gray-700">
            Continuer avec Facebook
          </span>
        </button>

        {/* Apple Sign-In */}
        <button
          type="button"
          onClick={() => handleSocialSignIn(signInWithApple, 'Apple')}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingProvider === 'Apple' ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-black rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5" fill="#000000" viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
          )}
          <span className="font-medium text-gray-700">
            Continuer avec Apple
          </span>
        </button>
      </div>

      {/* Warning for sellers */}
      {userType === 'seller' && mode !== 'login' && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <p className="font-semibold">📌 Note pour les vendeurs:</p>
          <p className="mt-1">
            Les boutons sociaux sont disponibles uniquement pour la <strong>connexion</strong>.
            Pour créer un compte vendeur, veuillez remplir le formulaire d'inscription ci-dessus.
          </p>
        </div>
      )}
    </div>
  );
};

export default SocialLoginButtons;

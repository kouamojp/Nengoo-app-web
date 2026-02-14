import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { auth } from './firebaseConfig';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Browser } from '@capacitor/browser';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

/**
 * Check if running on native mobile platform
 */
const isNative = () => Capacitor.isNativePlatform();

/**
 * Sign in with Google
 * Supports both web (popup/redirect) and native (Capacitor)
 */
export const signInWithGoogle = async () => {
  try {
    if (isNative()) {
      // Native mobile flow using Capacitor Firebase Authentication
      const result = await FirebaseAuthentication.signInWithGoogle();
      return result.user;
    } else {
      // Web flow using Firebase Web SDK
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');

      // Try popup first, fallback to redirect on mobile browsers
      try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
      } catch (popupError) {
        // If popup blocked, use redirect
        if (popupError.code === 'auth/popup-blocked') {
          await signInWithRedirect(auth, provider);
          return null; // Will complete on redirect
        }
        throw popupError;
      }
    }
  } catch (error) {
    console.error('Google Sign-In error:', error);
    throw error;
  }
};

/**
 * Sign in with Facebook
 * Supports both web and native platforms
 */
export const signInWithFacebook = async () => {
  try {
    if (isNative()) {
      // Native mobile flow
      const result = await FirebaseAuthentication.signInWithFacebook();
      return result.user;
    } else {
      // Web flow
      const provider = new FacebookAuthProvider();
      provider.addScope('email');
      provider.addScope('public_profile');

      try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
      } catch (popupError) {
        if (popupError.code === 'auth/popup-blocked') {
          await signInWithRedirect(auth, provider);
          return null;
        }
        throw popupError;
      }
    }
  } catch (error) {
    console.error('Facebook Sign-In error:', error);
    throw error;
  }
};

/**
 * Sign in with Apple
 * Supports both web and native platforms
 */
export const signInWithApple = async () => {
  try {
    if (isNative()) {
      // Native mobile flow
      const result = await FirebaseAuthentication.signInWithApple();
      return result.user;
    } else {
      // Web flow
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');

      try {
        const result = await signInWithPopup(auth, provider);
        return result.user;
      } catch (popupError) {
        if (popupError.code === 'auth/popup-blocked') {
          await signInWithRedirect(auth, provider);
          return null;
        }
        throw popupError;
      }
    }
  } catch (error) {
    console.error('Apple Sign-In error:', error);
    throw error;
  }
};

/**
 * Check for redirect result on page load (web only)
 * Call this in App.js on mount
 */
export const checkRedirectResult = async () => {
  try {
    if (!isNative()) {
      const result = await getRedirectResult(auth);
      return result;
    }
    return null;
  } catch (error) {
    console.error('Redirect result error:', error);
    throw error;
  }
};

/**
 * Get Firebase ID token for the current user
 */
export const getFirebaseIdToken = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No user is currently signed in');
    }

    const idToken = await currentUser.getIdToken();
    return idToken;
  } catch (error) {
    console.error('Error getting Firebase ID token:', error);
    throw error;
  }
};

/**
 * Authenticate with Nengoo backend using Firebase ID token
 * @param {string} idToken - Firebase ID token
 * @param {string} userType - 'buyer' or 'seller'
 * @returns {Object} User object from backend
 */
export const authenticateWithBackend = async (idToken, userType = 'buyer') => {
  try {
    const endpoint = userType === 'buyer'
      ? `${API_BASE_URL}/buyers/oauth-login`
      : `${API_BASE_URL}/sellers/oauth-login`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Backend authentication failed');
    }

    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error('Backend authentication error:', error);
    throw error;
  }
};

/**
 * Sign out from Firebase
 */
export const signOutFromFirebase = async () => {
  try {
    if (isNative()) {
      await FirebaseAuthentication.signOut();
    } else {
      await firebaseSignOut(auth);
    }
    console.log('✅ User signed out from Firebase');
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

/**
 * Setup authentication state listener
 * @param {Function} callback - Called when auth state changes
 * @returns {Function} Unsubscribe function
 */
export const setupAuthListener = (callback) => {
  if (isNative()) {
    // Native: Use Capacitor listener
    FirebaseAuthentication.addListener('authStateChange', (result) => {
      callback(result.user);
    });
    return () => {
      FirebaseAuthentication.removeAllListeners();
    };
  } else {
    // Web: Use Firebase auth state observer
    return auth.onAuthStateChanged(callback);
  }
};

/**
 * Get user provider data (email, name, photo, etc.)
 * @param {Object} user - Firebase user object
 * @returns {Object} Formatted user data
 */
export const getUserProviderData = (user) => {
  if (!user) return null;

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    providerId: user.providerData[0]?.providerId || 'unknown',
    emailVerified: user.emailVerified,
  };
};

/**
 * Handle OAuth errors and return user-friendly messages
 * @param {Error} error - Firebase error
 * @returns {string} User-friendly error message
 */
export const getOAuthErrorMessage = (error) => {
  const errorMessages = {
    'auth/popup-blocked': 'La fenêtre popup a été bloquée. Veuillez autoriser les popups pour ce site.',
    'auth/popup-closed-by-user': 'Vous avez fermé la fenêtre de connexion. Veuillez réessayer.',
    'auth/cancelled-popup-request': 'Une autre demande de connexion est en cours.',
    'auth/account-exists-with-different-credential': 'Un compte existe déjà avec cette adresse e-mail via une autre méthode de connexion.',
    'auth/invalid-credential': 'Les informations d\'identification sont invalides.',
    'auth/operation-not-allowed': 'Cette méthode de connexion n\'est pas activée.',
    'auth/user-disabled': 'Ce compte a été désactivé.',
    'auth/user-not-found': 'Aucun compte trouvé.',
    'auth/wrong-password': 'Mot de passe incorrect.',
    'auth/network-request-failed': 'Erreur de connexion réseau. Vérifiez votre connexion Internet.',
    'auth/too-many-requests': 'Trop de tentatives. Veuillez réessayer plus tard.',
  };

  return errorMessages[error.code] || error.message || 'Une erreur est survenue lors de la connexion.';
};

export default {
  signInWithGoogle,
  signInWithFacebook,
  signInWithApple,
  checkRedirectResult,
  getFirebaseIdToken,
  authenticateWithBackend,
  signOutFromFirebase,
  setupAuthListener,
  getUserProviderData,
  getOAuthErrorMessage,
};

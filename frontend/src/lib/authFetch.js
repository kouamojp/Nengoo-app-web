import axios from 'axios';

/**
 * Joint le jeton d'accès (JWT) à toutes les requêtes vers l'API Nengoo.
 *
 * Les écrans envoient encore les anciens en-têtes d'identité (X-Seller-Id,
 * X-Admin-Role…) : le backend les vérifie désormais contre le jeton. Le jeton
 * est celui renvoyé par la connexion, stocké avec l'utilisateur dans
 * localStorage['nengoo-user'].accessToken.
 */
const API_ORIGIN = (() => {
  try {
    return new URL(process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api').origin;
  } catch {
    return null;
  }
})();

const readToken = () => {
  try {
    return JSON.parse(localStorage.getItem('nengoo-user') || 'null')?.accessToken || null;
  } catch {
    return null;
  }
};

// Seules les requêtes vers l'API reçoivent le jeton (jamais S3, Firebase…)
const isApiUrl = (url) => {
  if (!API_ORIGIN || !url) return false;
  try {
    return new URL(url, window.location.href).origin === API_ORIGIN;
  } catch {
    return false;
  }
};

// Session expirée ou invalide : on déconnecte et on renvoie vers la connexion
const handleAuthFailure = async (response) => {
  if (response.status !== 401) return;
  let code;
  try {
    code = (await response.clone().json())?.code;
  } catch {
    return;
  }
  if (code !== 'token_expired' && code !== 'token_invalid' && code !== 'auth_required') return;

  let type;
  try {
    type = JSON.parse(localStorage.getItem('nengoo-user') || 'null')?.type;
  } catch {
    type = null;
  }
  localStorage.removeItem('nengoo-user');
  const target = type === 'admin' ? '/admin/login' : '/login';
  if (window.location.pathname !== target) window.location.assign(target);
};

let installed = false;

export const installAuthFetch = () => {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url;
    const token = readToken();
    if (!token || !isApiUrl(url)) return nativeFetch(input, init);

    const headers = new Headers(init.headers || (typeof input === 'string' ? undefined : input.headers));
    // Remplace aussi l'ancien « Bearer <id> » envoyé par certains écrans
    headers.set('Authorization', `Bearer ${token}`);
    const response = await nativeFetch(input, { ...init, headers });
    handleAuthFailure(response);
    return response;
  };

  axios.interceptors.request.use((config) => {
    const token = readToken();
    const url = config.baseURL ? new URL(config.url || '', config.baseURL).href : config.url;
    if (token && isApiUrl(url)) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  axios.interceptors.response.use(undefined, (error) => {
    const res = error?.response;
    if (res?.status === 401 && ['token_expired', 'token_invalid', 'auth_required'].includes(res.data?.code)) {
      handleAuthFailure(new Response(JSON.stringify(res.data), { status: 401 }));
    }
    return Promise.reject(error);
  });
};

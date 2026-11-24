import axios from 'axios';
import { handleAuthFailure, isApiUrl, readToken } from './authFetch';

/**
 * axios avec le jeton d'accès, comme fetch (lib/authFetch.js). À importer à la
 * place de « axios » : les intercepteurs sont posés avant le premier appel, et
 * axios n'est chargé qu'avec les écrans qui s'en servent.
 */
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

export default axios;

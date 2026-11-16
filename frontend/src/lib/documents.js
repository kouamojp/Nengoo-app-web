// Documents numériques (cours, guides, fiches, recherches…) : appels à l'API et textes.
// Principe et routes : docs/DOCUMENTS_NUMERIQUES.md
import { numberFormat } from './numberFormat';

export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8001/api';

export const formatFCFA = (value) => `${numberFormat('fr-FR').format(value || 0)} FCFA`;

export const formatSize = (bytes) => {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1).replace('.', ',')} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`;
};

/** Message lisible d'une réponse d'erreur FastAPI ({detail: texte | {message} | [erreurs]}). */
export const errorMessage = (data, fallback) => {
  const detail = data?.detail;
  if (typeof detail === 'string') return detail;
  if (detail?.message) return detail.message;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg.replace(/^Value error, /, '');
  return fallback;
};

/** Appel JSON à l'API ; lève une Error portant status, code et message lisible. */
export const api = async (path, { method = 'GET', body, fallback = 'Une erreur est survenue. Réessayez.' } = {}) => {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw Object.assign(new Error('Connexion impossible. Vérifiez votre connexion internet.'), { status: 0 });
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(errorMessage(data, fallback));
    error.status = response.status;
    error.code = data?.detail?.code || data?.code;
    throw error;
  }
  return data;
};

/** Chemin interne sûr pour revenir après la connexion (jamais un autre site). */
export const safeNext = (next) => (
  typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : null
);

export const loginLink = (path) => `/login/buyer?next=${encodeURIComponent(path)}`;

/** Ouvre le lien de téléchargement signé (valable quelques minutes). */
export const startDownload = async (documentId) => {
  const { url, downloadsLeft } = await api(`/documents/${documentId}/download`, {
    fallback: 'Téléchargement impossible pour le moment. Réessayez.',
  });
  const link = document.createElement('a');
  link.href = url;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  return downloadsLeft;
};

/** Envoi direct d'un PDF vers le stockage privé (formulaire signé par le serveur). */
export const uploadPdf = async (file, onProgress) => {
  const form = await api('/admin/documents/upload', {
    method: 'POST',
    body: { fileName: file.name, fileSize: file.size },
    fallback: "Impossible de préparer l'envoi du fichier.",
  });
  const data = new FormData();
  Object.entries(form.fields).forEach(([key, value]) => data.append(key, value));
  data.append('file', file);
  await new Promise((resolve, reject) => {
    // XMLHttpRequest pour suivre la progression (fetch ne le permet pas)
    const xhr = new XMLHttpRequest();
    xhr.open('POST', form.url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("L'envoi du fichier a échoué.")));
    xhr.onerror = () => reject(new Error("L'envoi du fichier a échoué. Vérifiez votre connexion."));
    xhr.send(data);
  });
  return form.fileKey;
};

/** Image de couverture : même envoi que les photos produits (bucket public). */
export const uploadImage = async (file) => {
  const { uploadUrl, publicUrl } = await api('/generate-presigned-url', {
    method: 'POST',
    body: { fileName: file.name, fileType: file.type },
    fallback: "Impossible d'envoyer l'image.",
  });
  const response = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  if (!response.ok) throw new Error("Impossible d'envoyer l'image.");
  return publicUrl;
};

export const OPERATOR_STYLE = {
  orange: 'bg-orange-500 text-white',
  mtn: 'bg-yellow-300 text-gray-900',
};

export const TEXT = {
  fr: {
    title: 'Documents numériques',
    label: 'Documents numériques téléchargeables',
    pageTitle: 'Documents numériques téléchargeables | Nengoo',
    pageDescription: "Cours, guides, fiches, recherches, documentation et bien d'autres documents en PDF. Vos premiers documents sont offerts avec un compte Nengoo.",
    intro: (n) => `Cours, guides, fiches, recherches, documentation et bien d'autres documents en PDF. Vos ${n} premiers documents sont offerts avec un compte Nengoo.`,
    search: 'Rechercher un document',
    allCategories: 'Tout',
    level: 'Niveau',
    subject: 'Matière',
    year: 'Année',
    any: 'Tous',
    sort: 'Trier',
    sorts: { recent: 'Plus récents', popular: 'Plus téléchargés', price_asc: 'Prix croissant', price_desc: 'Prix décroissant' },
    free: 'Gratuit',
    pages: (n) => `${n} page${n > 1 ? 's' : ''}`,
    results: (n) => `${n} document${n > 1 ? 's' : ''}`,
    empty: 'Aucun document ne correspond à ces critères.',
    comingSoon: 'Les premiers documents arrivent bientôt.',
    loadError: 'Impossible de charger les documents. Réessayez.',
    retry: 'Réessayer',
    more: 'Afficher plus',
    quotaLeft: (r, l) => `Il vous reste ${r} document${r > 1 ? 's' : ''} offert${r > 1 ? 's' : ''} sur ${l}.`,
    quotaUsed: (l) => `Vos ${l} documents offerts sont utilisés : les suivants sont payants.`,
    quotaGuest: (l) => `Créez un compte pour obtenir ${l} documents offerts.`,
    myDocuments: 'Mes documents',
    preview: 'Voir l\'aperçu',
    previewPages: (n) => `Aperçu gratuit : ${n} page${n > 1 ? 's' : ''}`,
    back: 'Tous les documents',
    notFound: 'Ce document n\'existe pas ou n\'est plus en vente.',
    loginToDownload: 'Se connecter pour télécharger',
    accountRequired: 'Un compte client Nengoo est nécessaire pour télécharger.',
    sellerAccount: 'Les téléchargements se font avec un compte client. Connectez-vous avec votre compte client.',
    getFree: 'Obtenir gratuitement',
    useFree: 'Utiliser un document offert',
    useFreeConfirm: (r) => `Ce document utilisera l'un de vos documents offerts (il vous en reste ${r}). Continuer ?`,
    confirm: 'Confirmer',
    cancel: 'Annuler',
    buy: (p) => `Acheter, ${p}`,
    download: 'Télécharger',
    downloading: 'Préparation…',
    prepSteps: ['Préparation de votre exemplaire…', 'Ajout de votre nom sur chaque page…', 'Le téléchargement va commencer…'],
    loadingMore: 'Chargement…',
    cancelling: 'Annulation…',
    downloadsLeft: (n) => `Encore ${n} téléchargement${n > 1 ? 's' : ''} possible${n > 1 ? 's' : ''}.`,
    personalCopy: 'Votre exemplaire porte votre nom et votre numéro : merci de ne pas le partager.',
    pendingTitle: 'Paiement en cours de vérification',
    pendingText: 'Nous vérifions votre paiement. Vous serez prévenu dès que le document sera disponible.',
    cancelRequest: 'Annuler la demande',
    payTitle: 'Payer par Mobile Money',
    payStep1: (p) => `Envoyez exactement ${p} à ce numéro :`,
    payHolder: 'Titulaire',
    payStep2: 'Saisissez ensuite la référence de la transaction, reçue par SMS de votre opérateur.',
    operator: 'Moyen de paiement',
    payerPhone: 'Numéro qui a payé',
    reference: 'Référence de la transaction',
    referenceHint: 'Exemple : PP261116.1530.A12345 ou MP261116.1530.B12345',
    sendPayment: 'J\'ai payé, envoyer',
    sending: 'Envoi…',
    paySent: 'Demande envoyée. Nous vérifions votre paiement.',
    payUnavailable: 'Le paiement n\'est pas encore disponible. Réessayez plus tard.',
    noRefund: 'Aucun remboursement après téléchargement, sauf fichier défectueux.',
    obtained: 'Document ajouté à « Mes documents ».',
    details: 'Détails',
    category: 'Catégorie',
    language: 'Langue',
    languages: { fr: 'Français', en: 'Anglais' },
    size: 'Taille',
    downloads: (n) => `${n} téléchargement${n > 1 ? 's' : ''}`,
    libraryEmpty: 'Vous n\'avez encore aucun document.',
    browse: 'Parcourir les documents',
    payments: 'Mes paiements',
    paymentStatus: {
      pending: 'En vérification', approved: 'Validé', rejected: 'Refusé', expired: 'Expiré', cancelled: 'Annulé',
    },
    rejectedBecause: 'Motif',
    source: { free_document: 'Gratuit', free_quota: 'Offert', payment: 'Acheté', admin: 'Offert par Nengoo' },
  },
  en: {
    title: 'Digital documents',
    label: 'Downloadable digital documents',
    pageTitle: 'Downloadable digital documents | Nengoo',
    pageDescription: 'Courses, guides, fact sheets, research, documentation and more as PDF. Your first documents are free with a Nengoo account.',
    intro: (n) => `Courses, guides, fact sheets, research, documentation and more as PDF. Your first ${n} documents are free with a Nengoo account.`,
    search: 'Search documents',
    allCategories: 'All',
    level: 'Level',
    subject: 'Subject',
    year: 'Year',
    any: 'All',
    sort: 'Sort',
    sorts: { recent: 'Newest', popular: 'Most downloaded', price_asc: 'Price: low to high', price_desc: 'Price: high to low' },
    free: 'Free',
    pages: (n) => `${n} page${n > 1 ? 's' : ''}`,
    results: (n) => `${n} document${n > 1 ? 's' : ''}`,
    empty: 'No document matches these filters.',
    comingSoon: 'The first documents are coming soon.',
    loadError: 'Documents could not be loaded. Please try again.',
    retry: 'Try again',
    more: 'Show more',
    quotaLeft: (r, l) => `You have ${r} of ${l} free documents left.`,
    quotaUsed: (l) => `Your ${l} free documents are used: the next ones must be paid for.`,
    quotaGuest: (l) => `Create an account to get ${l} free documents.`,
    myDocuments: 'My documents',
    preview: 'See preview',
    previewPages: (n) => `Free preview: ${n} page${n > 1 ? 's' : ''}`,
    back: 'All documents',
    notFound: 'This document does not exist or is no longer available.',
    loginToDownload: 'Sign in to download',
    accountRequired: 'You need a Nengoo customer account to download.',
    sellerAccount: 'Downloads use a customer account. Please sign in with your customer account.',
    getFree: 'Get it for free',
    useFree: 'Use a free document',
    useFreeConfirm: (r) => `This document will use one of your free documents (${r} left). Continue?`,
    confirm: 'Confirm',
    cancel: 'Cancel',
    buy: (p) => `Buy for ${p}`,
    download: 'Download',
    downloading: 'Preparing…',
    prepSteps: ['Preparing your copy…', 'Adding your name to every page…', 'Your download is about to start…'],
    loadingMore: 'Loading…',
    cancelling: 'Cancelling…',
    downloadsLeft: (n) => `${n} more download${n > 1 ? 's' : ''} allowed.`,
    personalCopy: 'Your copy carries your name and number: please do not share it.',
    pendingTitle: 'Payment being checked',
    pendingText: 'We are checking your payment. You will be notified as soon as the document is available.',
    cancelRequest: 'Cancel request',
    payTitle: 'Pay with Mobile Money',
    payStep1: (p) => `Send exactly ${p} to this number:`,
    payHolder: 'Account holder',
    payStep2: 'Then enter the transaction reference from your operator\'s SMS.',
    operator: 'Payment method',
    payerPhone: 'Number that paid',
    reference: 'Transaction reference',
    referenceHint: 'Example: PP261116.1530.A12345 or MP261116.1530.B12345',
    sendPayment: 'I have paid, send',
    sending: 'Sending…',
    paySent: 'Request sent. We are checking your payment.',
    payUnavailable: 'Payment is not available yet. Please try again later.',
    noRefund: 'No refund after download, unless the file is faulty.',
    obtained: 'Document added to “My documents”.',
    details: 'Details',
    category: 'Category',
    language: 'Language',
    languages: { fr: 'French', en: 'English' },
    size: 'Size',
    downloads: (n) => `${n} download${n > 1 ? 's' : ''}`,
    libraryEmpty: 'You have no documents yet.',
    browse: 'Browse documents',
    payments: 'My payments',
    paymentStatus: {
      pending: 'Being checked', approved: 'Approved', rejected: 'Rejected', expired: 'Expired', cancelled: 'Cancelled',
    },
    rejectedBecause: 'Reason',
    source: { free_document: 'Free', free_quota: 'Free credit', payment: 'Bought', admin: 'Gift from Nengoo' },
  },
};

export const CATEGORY_LABELS_EN = {
  cours: 'Courses', examens: 'Exam papers', corriges: 'Answer keys',
  exercices: 'Exercises', fiches: 'Fact sheets', guides: 'Guides and tutorials',
  documentation: 'Documentation', recherches: 'Research and studies',
  memoires: 'Theses and reports', autres: 'Other documents',
};

export const categoryLabel = (doc, language) => (
  language === 'en' ? CATEGORY_LABELS_EN[doc.category] || doc.categoryLabel : doc.categoryLabel
);

// Accueil : la première image du carrousel passe avant le reste.
//
// Sur un téléphone en 3G/4G lente, les listes (produits, catégories, « À la
// une », documents, bannières) se disputaient la bande passante avec l'image
// du haut de page, la plus grande à l'écran. Elles attendent donc qu'elle soit
// peinte à l'écran, 2,5 s au plus. Sur toute autre page d'arrivée, rien n'attend.

const MAX_WAIT_MS = 2500;
// Image chargée mais peinture non signalée (navigateur sans l'API LCP…)
const AFTER_LOAD_MS = 600;

let release;
const gate = new Promise((resolve) => { release = resolve; });
let armed = false;

/** Promesse résolue une fois la première image du carrousel affichée. */
export const afterHero = () => {
  if (!armed) {
    armed = true;
    if (typeof window === 'undefined' || window.location.pathname !== '/') release();
    else setTimeout(release, MAX_WAIT_MS);
  }
  return gate;
};

/**
 * Première image chargée (img), en échec ou carrousel vide (sans argument) :
 * la suite de la page charge dès que l'image est peinte à l'écran.
 */
export const heroDone = (img) => {
  if (!img || typeof PerformanceObserver === 'undefined'
    || !(PerformanceObserver.supportedEntryTypes || []).includes('largest-contentful-paint')) {
    release();
    return;
  }
  const observer = new PerformanceObserver((list) => {
    if (list.getEntries().some((entry) => entry.element === img)) {
      observer.disconnect();
      release();
    }
  });
  observer.observe({ type: 'largest-contentful-paint', buffered: true });
  setTimeout(() => {
    observer.disconnect();
    release();
  }, AFTER_LOAD_MS);
};

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../../lib/analytics';

// À chaque changement de page : retour en haut, et une vue de page Google
const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    trackPageView();
  }, [pathname, search]);

  return null;
};

export default ScrollToTop;

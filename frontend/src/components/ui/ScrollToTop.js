import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from "react-ga4"; // Import ReactGA

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    ReactGA.send({ hitType: "pageview", page: pathname }); // Send pageview on route change
  }, [pathname]);

  return null;
};

export default ScrollToTop;

import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function SplashScreen() {
  const [hidden, setHidden] = useState(false);
  const [removed, setRemoved] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const fadeTimer = setTimeout(() => setHidden(true), 2000);
    const removeTimer = setTimeout(() => setRemoved(true), 2600);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (removed || location.pathname.startsWith('/admin')) return null;

  return (
    <div className={`splash-screen ${hidden ? 'splash-screen--hidden' : ''}`}>
      <img
        src="/Assets/logo2.gif"
        alt="IJT Logo"
        className="splash-screen__logo"
      />
      <span className="splash-screen__text">Loading...</span>
    </div>
  );
}

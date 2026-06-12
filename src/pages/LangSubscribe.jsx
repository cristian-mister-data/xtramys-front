import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * LangSubscribe: switches the app language and redirects to /subscribe,
 * preserving all existing query parameters (e.g. ?plan=club&quantity=5).
 */
export default function LangSubscribe({ lang }) {
  const { i18n } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    if (lang === 'en') {
      i18n.changeLanguage('en');
    } else {
      i18n.changeLanguage('es');
    }
  }, [lang, i18n]);

  // Preserve any existing search params when redirecting
  const to = `/subscribe${location.search}`;
  return <Navigate to={to} replace />;
}
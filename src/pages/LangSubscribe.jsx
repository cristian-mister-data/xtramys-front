import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';

export default function LangSubscribe({ lang }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    if (lang === 'en') {
      i18n.changeLanguage('en');
    } else {
      i18n.changeLanguage('es');
    }
  }, [lang, i18n]);

  return <Navigate to="/subscribe" replace />;
}
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function LangSubscribe({ lang, children }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    i18n.changeLanguage(lang === 'en' ? 'en' : 'es');
  }, [lang, i18n]);

  return children;
}

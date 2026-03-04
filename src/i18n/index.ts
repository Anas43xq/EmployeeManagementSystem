import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './en.json';
import ar from './ar.json';

// Suppress i18next's promotional "maintained with support from Locize" console message.
// This is a no-op logger plugin — all i18next internal log/warn/error calls become silent.
const noopLogger = {
  type: 'logger' as const,
  log: () => {},
  warn: () => {},
  error: () => {},
};

i18n
  .use(noopLogger)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

i18n.on('languageChanged', (lng) => {
  const dir = lng === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
});

const initDir = i18n.language === 'ar' ? 'rtl' : 'ltr';
document.documentElement.dir = initDir;
document.documentElement.lang = i18n.language || 'en';

export default i18n;

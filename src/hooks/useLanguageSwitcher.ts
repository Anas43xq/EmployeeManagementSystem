

import { useTranslation } from 'react-i18next';

export interface LanguageSwitcherState {
  isRTL: boolean;
  currentLanguage: string;
  toggleLanguage: () => void;
  languageLabel: string;
}


export function useLanguageSwitcher(): LanguageSwitcherState {
  const { i18n } = useTranslation();

  const isRTL = i18n.language === 'ar';
  const currentLanguage = i18n.language;

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
  };

  const languageLabel = isRTL ? 'EN' : 'ع';

  return {
    isRTL,
    currentLanguage,
    toggleLanguage,
    languageLabel,
  };
}

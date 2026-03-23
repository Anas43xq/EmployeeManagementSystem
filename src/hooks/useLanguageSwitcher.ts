/**
 * useLanguageSwitcher hook
 * Priority 3: SOLID - Extract Login.tsx complexity
 * Handles language switching logic in isolation
 */

import { useTranslation } from 'react-i18next';

export interface LanguageSwitcherState {
  isRTL: boolean;
  currentLanguage: string;
  toggleLanguage: () => void;
  languageLabel: string;
}

/**
 * Encapsulates language switching logic
 * Separates i18n concerns from component rendering
 */
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

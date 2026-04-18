/**
 * pages/FAQ/index.tsx
 * Public FAQ page with search and category filter
 */

import { useState } from 'react';
import { useFAQ } from './useFAQ';
import { Search, ChevronDown, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const FAQPage = () => {
  const { t, i18n } = useTranslation();
  const { faqs, categories, loading, error, searchQuery, selectedCategory, handleSearch, handleFilterCategory } = useFAQ();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const isArabic = i18n.language === 'ar';

  const filteredFAQs = faqs.filter(faq => {
    if (selectedCategory && faq.category !== selectedCategory) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" dir={isArabic ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-50">{t('faq.title')}</h1>
        <p className="text-gray-700 dark:text-gray-300 mt-2">
          {t('faq.description')}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className={`absolute ${isArabic ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400`} />
        <input
          type="text"
          placeholder={t('faq.searchFaq')}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className={`w-full ${isArabic ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-50 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary transition-colors`}
        />
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-start">
          <button
            onClick={() => handleFilterCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border-2 ${
              !selectedCategory
                ? 'bg-primary text-white shadow-lg border-primary'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 border-transparent hover:border-gray-400'
            }`}
          >
            {t('faq.allCategories')}
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleFilterCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border-2 ${
                selectedCategory === category
                  ? 'bg-primary text-white shadow-lg border-primary scale-105'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 border-transparent hover:border-gray-400'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* FAQ Accordion */}
      <div className="space-y-3">
        {filteredFAQs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {searchQuery ? t('faq.noResultsSearch') : t('faq.noFaqs')}
            </p>
          </div>
        ) : (
          filteredFAQs.map((faq) => (
            <div
              key={faq.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <button
                onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-50 text-base leading-snug">{faq.question}</h3>
                  {faq.category && (
                    <p className="text-xs text-primary font-medium mt-1 inline-block">{faq.category}</p>
                  )}
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-gray-600 dark:text-gray-400 flex-shrink-0 transition-transform ${isArabic ? 'mr-4' : 'ml-4'} ${
                    expandedId === faq.id ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {expandedId === faq.id && (
                <div className="px-6 py-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{faq.answer}</p>
                  {faq.updated_at && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                      Last updated: {new Date(faq.updated_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Results Count */}
      {filteredFAQs.length > 0 && (
        <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
          {t('faq.showing')} {filteredFAQs.length} {t('faq.of')} {faqs.length} {t('faq.faqs')}
        </div>
      )}
    </div>
  );
};

export default FAQPage;

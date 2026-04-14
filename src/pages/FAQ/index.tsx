/**
 * pages/FAQ/index.tsx
 * Public FAQ page with search and category filter
 */

import { useState } from 'react';
import { useFAQ } from './useFAQ';
import { Search, ChevronDown, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const FAQPage = () => {
  const { t } = useTranslation();
  const { faqs, categories, loading, error, searchQuery, selectedCategory, handleSearch, handleFilterCategory } = useFAQ();
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('faq') || 'Frequently Asked Questions'}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('faq_description') || 'Find answers to common questions about our system'}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-800 dark:text-red-300">{error}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder={t('search_faq') || 'Search FAQs...'}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Category Filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleFilterCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !selectedCategory
                ? 'bg-primary text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {t('all_categories') || 'All'}
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleFilterCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
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
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery ? t('no_results_search') || 'No FAQs found matching your search' : t('no_faqs') || 'No FAQs available'}
            </p>
          </div>
        ) : (
          filteredFAQs.map((faq) => (
            <div
              key={faq.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors text-left"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{faq.question}</h3>
                  {faq.category && (
                    <p className="text-xs text-primary-600 dark:text-primary-400 mt-1 font-medium">{faq.category}</p>
                  )}
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-gray-600 dark:text-gray-400 flex-shrink-0 transition-transform ml-4 ${
                    expandedId === faq.id ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {expandedId === faq.id && (
                <div className="px-6 py-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{faq.answer}</p>
                  {faq.updated_at && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
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
          {t('showing') || 'Showing'} {filteredFAQs.length} {t('of') || 'of'} {faqs.length} {t('faqs') || 'FAQs'}
        </div>
      )}
    </div>
  );
};

export default FAQPage;

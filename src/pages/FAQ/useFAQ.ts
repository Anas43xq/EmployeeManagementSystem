/**
 * useFAQ.ts
 * Hook for fetching and managing FAQ data with search and filters
 * Supports bilingual content (English & Arabic) via i18n
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { getFAQsByRole, searchFAQs, getFAQCategories, type FAQ } from '../../services/faq';

export function useFAQ() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const [faqs, setFAQs] = useState<FAQ[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get current language (en or ar) - memoized to prevent unnecessary re-renders
  const currentLanguage = useMemo(() => {
    return (i18n.language === 'ar' ? 'ar' : 'en') as 'en' | 'ar';
  }, [i18n.language]);

  // Load initial FAQs and categories
  useEffect(() => {
    if (!user?.role) return;

    const loadFAQs = async () => {
      try {
        setLoading(true);
        const data = await getFAQsByRole(user.role as any, currentLanguage); // eslint-disable-line @typescript-eslint/no-explicit-any
        setFAQs(data);

        const cats = await getFAQCategories(user.role as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        setCategories(cats);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load FAQs');
        console.error('Error loading FAQs:', err);
      } finally {
        setLoading(false);
      }
    };

    loadFAQs();
  }, [user?.role, currentLanguage]);

  // Search FAQs
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!user?.role) return;

    try {
      const results = await searchFAQs(query, user.role as any, currentLanguage); // eslint-disable-line @typescript-eslint/no-explicit-any
      setFAQs(results);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      console.error('Search error:', err);
    }
  }, [user?.role, currentLanguage]);

  // Filter by category
  const handleFilterCategory = useCallback(async (category: string | null) => {
    setSelectedCategory(category);
    setSearchQuery(''); // Clear search when filtering by category

    if (!user?.role) return;

    try {
      if (category) {
        const filtered = faqs.filter(faq => faq.category === category);
        console.log('[handleFilterCategory] Filtering:', { category, totalFAQs: faqs.length, matchedFAQs: filtered.length, faqCategories: faqs.map(f => f.category) });
        setFAQs(filtered);
      } else {
        // Reload all FAQs
        const data = await getFAQsByRole(user.role as any, currentLanguage); // eslint-disable-line @typescript-eslint/no-explicit-any
        console.log('[handleFilterCategory] Reset to all FAQs:', data.length);
        setFAQs(data);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Filter failed');
      console.error('[handleFilterCategory] Error:', err);
    }
  }, [faqs, user?.role, currentLanguage]);

  return {
    faqs,
    categories,
    loading,
    error,
    searchQuery,
    selectedCategory,
    handleSearch,
    handleFilterCategory,
  };
}

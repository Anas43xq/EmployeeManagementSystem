

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

  
  const currentLanguage = useMemo(() => {
    return (i18n.language === 'ar' ? 'ar' : 'en') as 'en' | 'ar';
  }, [i18n.language]);

  
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

  
  const handleFilterCategory = useCallback((category: string | null) => {
    setSelectedCategory(category);
    setSearchQuery(''); 
    setError(null);
  }, []);

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

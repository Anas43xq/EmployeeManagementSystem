/**
 * useFAQ.ts
 * Hook for fetching and managing FAQ data with search and filters
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getFAQsByRole, searchFAQs, getFAQCategories, type FAQ } from '../../services/faq';

export function useFAQ() {
  const { user } = useAuth();
  const [faqs, setFAQs] = useState<FAQ[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load initial FAQs and categories
  useEffect(() => {
    if (!user?.role) return;

    const loadFAQs = async () => {
      try {
        setLoading(true);
        const data = await getFAQsByRole(user.role as any); // eslint-disable-line @typescript-eslint/no-explicit-any
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
  }, [user?.role]);

  // Search FAQs
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!user?.role) return;

    try {
      const results = await searchFAQs(query, user.role as any); // eslint-disable-line @typescript-eslint/no-explicit-any
      setFAQs(results);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      console.error('Search error:', err);
    }
  }, [user?.role]);

  // Filter by category
  const handleFilterCategory = useCallback(async (category: string | null) => {
    setSelectedCategory(category);
    setSearchQuery(''); // Clear search when filtering by category

    if (!user?.role) return;

    try {
      if (category) {
        const filtered = faqs.filter(faq => faq.category === category);
        setFAQs(filtered);
      } else {
        // Reload all FAQs
        const data = await getFAQsByRole(user.role as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        setFAQs(data);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Filter failed');
    }
  }, [user?.role, faqs]);

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

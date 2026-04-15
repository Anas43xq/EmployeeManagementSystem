/**
 * faqQueries.ts
 * Public FAQ queries - for all authenticated users
 * Supports bilingual content with JSONB storage (English & Arabic)
 */

import { db } from '../supabase';
import type { UserRole } from '../auth/authHelpers';
import i18n from '../../i18n';

/**
 * Bilingual content structure for FAQs
 * Each language stores question and answer separately
 */
export interface BilingualContent {
  en: {
    question: string;
    answer: string;
  };
  ar: {
    question: string;
    answer: string;
  };
}

/**
 * FAQ model with flattened language-specific content
 * (Language extraction happens in the service layer)
 */
export interface FAQ {
  id: string;
  question: string; // Extracted from content based on current language
  answer: string; // Extracted from content based on current language
  category: string;
  visible_to: string[];
  faq_order: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  content?: BilingualContent; // Raw JSONB content (for admin)
}

/**
 * Get language code from i18n (en or ar)
 */
function getLanguageCode(): 'en' | 'ar' {
  const lang = i18n.language || 'en';
  return lang === 'ar' ? 'ar' : 'en';
}

/**
 * Extract language-specific content from JSONB and flatten it
 */
function extractLanguageContent(faq: any, language: 'en' | 'ar'): FAQ {
  const content = faq.content as BilingualContent;
  return {
    ...faq,
    question: content[language]?.question || '',
    answer: content[language]?.answer || '',
  };
}

/**
 * Get all FAQs visible to a specific role, organized by category
 * Returns FAQs with language-specific content extracted
 */
export async function getFAQsByRole(role: UserRole, language?: 'en' | 'ar'): Promise<FAQ[]> {
  const lang = language || getLanguageCode();
  
  const { data, error } = await db
    .from('faqs')
    .select('*')
    .contains('visible_to', [role])
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('faq_order', { ascending: true });

  if (error) {
    console.error('[getFAQsByRole] Error:', error);
    return [];
  }

  return (data || []).map(faq => extractLanguageContent(faq, lang));
}

/**
 * Get FAQs by category for a specific role
 */
export async function getFAQsByCategory(category: string, role: UserRole, language?: 'en' | 'ar'): Promise<FAQ[]> {
  const lang = language || getLanguageCode();
  
  const { data, error } = await db
    .from('faqs')
    .select('*')
    .eq('category', category)
    .contains('visible_to', [role])
    .eq('is_active', true)
    .order('faq_order', { ascending: true });

  if (error) {
    console.error('[getFAQsByCategory] Error:', error);
    return [];
  }

  return (data || []).map(faq => extractLanguageContent(faq, lang));
}

/**
 * Search FAQs by question and answer text, filtered by role
 * Searches in the specified language
 */
export async function searchFAQs(searchQuery: string, role: UserRole, language?: 'en' | 'ar'): Promise<FAQ[]> {
  if (!searchQuery || searchQuery.trim().length === 0) {
    return getFAQsByRole(role, language);
  }

  const lang = language || getLanguageCode();
  const query = searchQuery.toLowerCase();

  // Get all FAQs for the role, then filter client-side
  // (JSONB search with ilike requires PostgREST v11+ with proper text search)
  const { data, error } = await db
    .from('faqs')
    .select('*')
    .contains('visible_to', [role])
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('faq_order', { ascending: true });

  if (error) {
    console.error('[searchFAQs] Error:', error);
    return [];
  }

  // Filter FAQs client-side based on language-specific content
  const faqs = (data || []).map(faq => extractLanguageContent(faq, lang));
  return faqs.filter(faq =>
    faq.question.toLowerCase().includes(query) ||
    faq.answer.toLowerCase().includes(query)
  );
}

/**
 * Get all unique categories for a specific role
 */
export async function getFAQCategories(role: UserRole): Promise<string[]> {
  const { data, error } = await db
    .from('faqs')
    .select('category')
    .contains('visible_to', [role])
    .eq('is_active', true)
    .order('category', { ascending: true });

  if (error) {
    console.error('[getFAQCategories] Error:', error);
    return [];
  }

  // Extract unique categories
  const categories = [...new Set((data || []).map(item => item.category))];
  return categories;
}

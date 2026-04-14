/**
 * faqQueries.ts
 * Public FAQ queries - for all authenticated users
 */

import { db } from '../supabase';
import type { UserRole } from '../auth/authHelpers';

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  visible_to: string[];
  faq_order: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

/**
 * Get all FAQs visible to a specific role, organized by category
 */
export async function getFAQsByRole(role: UserRole): Promise<FAQ[]> {
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

  return (data as FAQ[]) || [];
}

/**
 * Get FAQs by category for a specific role
 */
export async function getFAQsByCategory(category: string, role: UserRole): Promise<FAQ[]> {
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

  return (data as FAQ[]) || [];
}

/**
 * Search FAQs by question and answer text, filtered by role
 */
export async function searchFAQs(searchQuery: string, role: UserRole): Promise<FAQ[]> {
  if (!searchQuery || searchQuery.trim().length === 0) {
    return getFAQsByRole(role);
  }

  const query = searchQuery.toLowerCase();
  const { data, error } = await db
    .from('faqs')
    .select('*')
    .contains('visible_to', [role])
    .eq('is_active', true)
    .or(`question.ilike.%${query}%,answer.ilike.%${query}%`)
    .order('category', { ascending: true })
    .order('faq_order', { ascending: true });

  if (error) {
    console.error('[searchFAQs] Error:', error);
    return [];
  }

  return (data as FAQ[]) || [];
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

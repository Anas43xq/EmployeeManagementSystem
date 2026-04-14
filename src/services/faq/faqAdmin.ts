/**
 * faqAdmin.ts
 * Admin-only FAQ management - CRUD operations
 * Only admin users can call these functions
 */

import { db } from '../supabase';
import type { FAQ } from './faqQueries';

export interface CreateFAQInput {
  question: string;
  answer: string;
  category: string;
  visible_to: string[]; // Array of roles: ['staff', 'hr', 'admin']
  faq_order?: number;
}

export interface UpdateFAQInput extends Partial<CreateFAQInput> {
  id: string;
}

/**
 * Get all FAQs (admin view - no filtering)
 */
export async function getAllFAQs(): Promise<FAQ[]> {
  const { data, error } = await db
    .from('faqs')
    .select('*')
    .order('category', { ascending: true })
    .order('faq_order', { ascending: true });

  if (error) {
    console.error('[getAllFAQs] Error:', error);
    throw new Error(`Failed to fetch FAQs: ${error.message}`);
  }

  return (data as FAQ[]) || [];
}

/**
 * Create a new FAQ (admin only)
 */
export async function createFAQ(input: CreateFAQInput): Promise<FAQ> {
  // Get current user ID from auth
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to create FAQs');
  }

  const { data, error } = await db
    .from('faqs')
    .insert([
      {
        question: input.question.trim(),
        answer: input.answer.trim(),
        category: input.category,
        visible_to: input.visible_to,
        faq_order: input.faq_order || 999,
        is_active: true,
        created_by: user.id,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('[createFAQ] Error:', error);
    throw new Error(`Failed to create FAQ: ${error.message}`);
  }

  return data as FAQ;
}

/**
 * Update an existing FAQ (admin only)
 */
export async function updateFAQ(input: UpdateFAQInput): Promise<FAQ> {
  // Get current user ID from auth
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to update FAQs');
  }

  const { id, ...updates } = input;

  const updateData: Record<string, unknown> = {
    updated_by: user.id,
  };
  if (updates.question !== undefined) updateData.question = updates.question.trim();
  if (updates.answer !== undefined) updateData.answer = updates.answer.trim();
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.visible_to !== undefined) updateData.visible_to = updates.visible_to;
  if (updates.faq_order !== undefined) updateData.faq_order = updates.faq_order;

  const { data, error } = await db
    .from('faqs')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[updateFAQ] Error:', error);
    throw new Error(`Failed to update FAQ: ${error.message}`);
  }

  return data as FAQ;
}

/**
 * Soft delete a FAQ (mark as inactive instead of removing)
 */
export async function deleteFAQ(id: string): Promise<void> {
  const { error } = await db
    .from('faqs')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    console.error('[deleteFAQ] Error:', error);
    throw new Error(`Failed to delete FAQ: ${error.message}`);
  }
}

/**
 * Permanently delete a FAQ (hard delete - use cautiously)
 */
export async function permanentlyDeleteFAQ(id: string): Promise<void> {
  const { error } = await db
    .from('faqs')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[permanentlyDeleteFAQ] Error:', error);
    throw new Error(`Failed to permanently delete FAQ: ${error.message}`);
  }
}

/**
 * Reorder FAQs within a category
 */
export async function reorderFAQs(updates: Array<{ id: string; faq_order: number }>): Promise<void> {
  const errors: string[] = [];

  for (const update of updates) {
    const { error } = await db
      .from('faqs')
      .update({ faq_order: update.faq_order })
      .eq('id', update.id);

    if (error) {
      errors.push(`FAQ ${update.id}: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Failed to reorder FAQs:\n${errors.join('\n')}`);
  }
}

/**
 * Bulk update FAQ visibility
 */
export async function updateFAQVisibility(faqIds: string[], visibleTo: string[]): Promise<void> {
  const { error } = await db
    .from('faqs')
    .update({ visible_to: visibleTo })
    .in('id', faqIds);

  if (error) {
    console.error('[updateFAQVisibility] Error:', error);
    throw new Error(`Failed to update FAQ visibility: ${error.message}`);
  }
}

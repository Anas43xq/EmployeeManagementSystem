/**
 * faqAdmin.ts
 * Admin-only FAQ management - CRUD operations with bilingual support
 * Only admin users can call these functions
 */

import { db } from '../supabase';
import type { FAQ, BilingualContent } from './faqQueries';

// Re-export BilingualContent for use in components
export type { BilingualContent };

/**
 * Input for creating a new FAQ with bilingual content
 */
export interface CreateFAQInput {
  content: BilingualContent; // {en: {question, answer}, ar: {question, answer}}
  category: string;
  visible_to: string[]; // Array of roles: ['staff', 'hr', 'admin']
  faq_order?: number;
}

/**
 * Input for updating an existing FAQ with bilingual content
 */
export interface UpdateFAQInput extends Partial<CreateFAQInput> {
  id: string;
}

/**
 * Get all FAQs (admin view - no filtering, returns bilingual raw content)
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

  return (data as unknown as FAQ[]) || [];
}

/**
 * Create a new FAQ with bilingual content (admin only)
 */
export async function createFAQ(input: CreateFAQInput): Promise<FAQ> {
  // Validate bilingual content
  if (!input.content.en.question?.trim()) {
    throw new Error('English question is required');
  }
  if (!input.content.en.answer?.trim()) {
    throw new Error('English answer is required');
  }
  if (!input.content.ar.question?.trim()) {
    throw new Error('Arabic question is required');
  }
  if (!input.content.ar.answer?.trim()) {
    throw new Error('Arabic answer is required');
  }

  // Get current user ID from auth
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to create FAQs');
  }

  const { data, error } = await db
    .from('faqs')
    .insert([
      {
        content: {
          en: {
            question: input.content.en.question.trim(),
            answer: input.content.en.answer.trim(),
          },
          ar: {
            question: input.content.ar.question.trim(),
            answer: input.content.ar.answer.trim(),
          },
        },
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

  return data as unknown as FAQ;
}

/**
 * Update an existing FAQ with bilingual content (admin only)
 */
export async function updateFAQ(input: UpdateFAQInput): Promise<FAQ> {
  const { id, ...updates } = input;

  // Get current FAQ first to preserve existing content
  const { data: existingFAQ, error: fetchError } = await db
    .from('faqs')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existingFAQ) {
    throw new Error(`FAQ not found: ${fetchError?.message}`);
  }

  // Get current user ID from auth
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to update FAQs');
  }

  // Prepare update data
  const updateData: Record<string, unknown> = {
    updated_by: user.id,
  };

  // Handle content update (bilingual)
  if (updates.content) {
    // Validate new content
    if (!updates.content.en.question?.trim()) {
      throw new Error('English question is required');
    }
    if (!updates.content.en.answer?.trim()) {
      throw new Error('English answer is required');
    }
    if (!updates.content.ar.question?.trim()) {
      throw new Error('Arabic question is required');
    }
    if (!updates.content.ar.answer?.trim()) {
      throw new Error('Arabic answer is required');
    }

    updateData.content = {
      en: {
        question: updates.content.en.question.trim(),
        answer: updates.content.en.answer.trim(),
      },
      ar: {
        question: updates.content.ar.question.trim(),
        answer: updates.content.ar.answer.trim(),
      },
    };
  }

  // Handle other updates
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

  return data as unknown as FAQ;
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

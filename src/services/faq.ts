import { db } from '../lib/db';
import type { UserRole } from './auth';
import i18n from '../i18n';

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
  updated_by?: string | null;
  content?: BilingualContent; 
}


export interface CreateFAQInput {
  content: BilingualContent; 
  category: string;
  visible_to: string[]; 
  faq_order?: number;
}


export interface UpdateFAQInput extends Partial<CreateFAQInput> {
  id: string;
}


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


export async function createFAQ(input: CreateFAQInput): Promise<FAQ> {
  
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


export async function updateFAQ(input: UpdateFAQInput): Promise<FAQ> {
  const { id, ...updates } = input;

  
  const { data: existingFAQ, error: fetchError } = await db
    .from('faqs')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existingFAQ) {
    throw new Error(`FAQ not found: ${fetchError?.message}`);
  }

  
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    throw new Error('User must be authenticated to update FAQs');
  }

  
  const updateData: Record<string, unknown> = {
    updated_by: user.id,
  };

  
  if (updates.content) {
    
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


export async function deleteFAQ(id: string): Promise<void> {
  const { error } = await db
    .from('faqs')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[deleteFAQ] Error:', error);
    throw new Error(`Failed to delete FAQ: ${error.message}`);
  }
}


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





function getLanguageCode(): 'en' | 'ar' {
  const lang = i18n.language || 'en';
  return lang === 'ar' ? 'ar' : 'en';
}


function extractLanguageContent(faq: Record<string, unknown>, language: 'en' | 'ar'): FAQ {
  const content = faq.content as BilingualContent;
  return {
    id: faq.id as string,
    category: faq.category as string,
    visible_to: faq.visible_to as string[],
    faq_order: faq.faq_order as number,
    is_active: faq.is_active as boolean,
    created_by: faq.created_by as string,
    created_at: faq.created_at as string,
    updated_at: faq.updated_at as string,
    updated_by: faq.updated_by as string | null | undefined,
    content: content,
    question: content[language]?.question || '',
    answer: content[language]?.answer || '',
  };
}


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


export async function searchFAQs(searchQuery: string, role: UserRole, language?: 'en' | 'ar'): Promise<FAQ[]> {
  if (!searchQuery || searchQuery.trim().length === 0) {
    return getFAQsByRole(role, language);
  }

  const lang = language || getLanguageCode();
  const query = searchQuery.toLowerCase();

  
  
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

  
  const faqs = (data || []).map(faq => extractLanguageContent(faq, lang));
  return faqs.filter(faq =>
    faq.question.toLowerCase().includes(query) ||
    faq.answer.toLowerCase().includes(query)
  );
}


export async function getFAQCategories(role: UserRole): Promise<string[]> {
  const { data, error } = await db
    .from('faqs')
    .select('category, visible_to, is_active')
    .eq('is_active', true)
    .contains('visible_to', [role])
    .order('category', { ascending: true });

  if (error) {
    console.error('[getFAQCategories] Error:', error);
    return [];
  }

  
  const categories = [
    ...new Set(
      (data || [])
        .map(item => item.category)
        .filter(cat => cat && typeof cat === 'string' && cat.trim().length > 0)
    )
  ];
  return categories;
}


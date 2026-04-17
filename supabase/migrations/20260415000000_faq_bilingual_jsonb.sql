-- Migration: Add bilingual JSONB content to FAQs
-- Purpose: Support both English and Arabic FAQ content in a single JSONB column
-- Date: 2026-04-15

-- Step 1: Add new JSONB content column
ALTER TABLE public.faqs
ADD COLUMN content JSONB NOT NULL DEFAULT '{"en": {"question": "", "answer": ""}, "ar": {"question": "", "answer": ""}}';

-- Step 2: Migrate existing question and answer data to the new JSONB structure
-- This moves all existing data (which is in English) to the 'en' language key
UPDATE public.faqs
SET content = jsonb_build_object(
  'en', jsonb_build_object(
    'question', question,
    'answer', answer
  ),
  'ar', jsonb_build_object(
    'question', '',
    'answer', ''
  )
)
WHERE question IS NOT NULL OR answer IS NOT NULL;

-- Step 3: Drop the old question and answer columns (data is now in JSONB)
ALTER TABLE public.faqs
DROP COLUMN question,
DROP COLUMN answer;

-- Step 4: Add constraint to ensure JSONB structure is valid
-- This validates that required language keys exist
ALTER TABLE public.faqs
ADD CONSTRAINT check_content_structure CHECK (
  content ? 'en' AND
  content ? 'ar' AND
  content->'en' ? 'question' AND
  content->'en' ? 'answer' AND
  content->'ar' ? 'question' AND
  content->'ar' ? 'answer'
);

-- Step 5: Create indexes for better performance on JSONB columns
CREATE INDEX idx_faqs_content_en_question ON public.faqs USING GIN (((content -> 'en' -> 'question')));
CREATE INDEX idx_faqs_content_en_answer ON public.faqs USING GIN (((content -> 'en' -> 'answer')));
CREATE INDEX idx_faqs_content_ar_question ON public.faqs USING GIN (((content -> 'ar' -> 'question')));
CREATE INDEX idx_faqs_content_ar_answer ON public.faqs USING GIN (((content -> 'ar' -> 'answer')));

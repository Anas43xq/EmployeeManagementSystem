-- Fix redundant faqs trigger function
-- Replace duplicate update_faqs_updated_at() with shared update_updated_at_column()

DROP FUNCTION IF EXISTS public.update_faqs_updated_at() CASCADE;

DROP TRIGGER IF EXISTS faqs_updated_at_trigger ON public.faqs;
CREATE TRIGGER faqs_updated_at_trigger
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

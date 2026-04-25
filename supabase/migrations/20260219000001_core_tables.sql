-- Migration File 01: Core Tables
-- Purpose: Create core tables (departments, employees, users, preferences, faqs)
-- Dependencies: File 00 (uses generate_employee_number function)
-- Note: Cleanup is handled by 20260218999999_cleanup_all.sql
-- Created by: Migration Split Plan


-- ============================================================
-- CORE TABLES
-- ============================================================

CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('academic', 'administrative')),
  head_id UUID,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_number TEXT UNIQUE NOT NULL DEFAULT generate_employee_number(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  position TEXT NOT NULL,
  employment_type TEXT NOT NULL DEFAULT 'full-time' CHECK (employment_type IN ('full-time', 'part-time', 'contract')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on-leave')),
  hire_date DATE NOT NULL,
  termination_date DATE,
  salary NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.employee_profiles (
  employee_id UUID PRIMARY KEY REFERENCES public.employees(id) ON DELETE CASCADE,
  phone TEXT DEFAULT '',
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female')),
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  postal_code TEXT DEFAULT '',
  photo_url TEXT,
  qualifications JSONB DEFAULT '[]'::jsonb,
  emergency_contact_name TEXT DEFAULT '',
  emergency_contact_phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE VIEW public.employee_full WITH (security_invoker = true) AS
SELECT 
  e.id,
  e.employee_number,
  e.first_name,
  e.last_name,
  e.email,
  e.department_id,
  e.position,
  e.employment_type,
  e.status,
  e.hire_date,
  e.termination_date,
  e.salary,
  e.created_at,
  e.updated_at,
  p.phone,
  p.date_of_birth,
  p.gender,
  p.address,
  p.city,
  p.state,
  p.postal_code,
  p.photo_url,
  p.qualifications,
  p.emergency_contact_name,
  p.emergency_contact_phone,
  p.updated_at AS profile_updated_at,
  GREATEST(e.updated_at, p.updated_at) AS last_updated
FROM public.employees e
LEFT JOIN public.employee_profiles p ON e.id = p.employee_id;

CREATE OR REPLACE FUNCTION public.sync_employee_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.employees
  SET updated_at = now()
  WHERE id = COALESCE(NEW.employee_id, OLD.employee_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_employee_updated_at
AFTER INSERT OR UPDATE OR DELETE
ON public.employee_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_employee_updated_at();

ALTER TABLE public.departments ADD CONSTRAINT fk_department_head 
  FOREIGN KEY (head_id) REFERENCES public.employees(id) ON DELETE SET NULL;

CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'hr', 'staff')),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  banned_at TIMESTAMPTZ DEFAULT NULL,
  ban_reason TEXT DEFAULT NULL,
  current_session_token TEXT DEFAULT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  email_leave_approvals BOOLEAN DEFAULT true,
  email_attendance_reminders BOOLEAN DEFAULT true,
  email_warnings BOOLEAN DEFAULT true,
  email_tasks BOOLEAN DEFAULT true,
  email_complaints BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content JSONB NOT NULL DEFAULT '{"en": {"question": "", "answer": ""}, "ar": {"question": "", "answer": ""}}',
  category TEXT NOT NULL,
  visible_to TEXT[] NOT NULL DEFAULT ARRAY['staff', 'hr', 'admin'],
  faq_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT check_content_structure CHECK (
    content ? 'en' AND
    content ? 'ar' AND
    content->'en' ? 'question' AND
    content->'en' ? 'answer' AND
    content->'ar' ? 'question' AND
    content->'ar' ? 'answer'
  )
);

-- FAQ content indexes for bilingual search performance
CREATE INDEX idx_faqs_content_en_question ON public.faqs USING GIN (((content -> 'en' -> 'question')));
CREATE INDEX idx_faqs_content_en_answer ON public.faqs USING GIN (((content -> 'en' -> 'answer')));
CREATE INDEX idx_faqs_content_ar_question ON public.faqs USING GIN (((content -> 'ar' -> 'question')));
CREATE INDEX idx_faqs_content_ar_answer ON public.faqs USING GIN (((content -> 'ar' -> 'answer')));

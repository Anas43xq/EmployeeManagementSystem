-- Migration File 01: Core Tables
-- Purpose: Create core tables (departments, employees, users, preferences, faqs)
-- Dependencies: File 00 (uses generate_employee_number function)
-- Created by: Migration Split Plan

-- ============================================================
-- CLEANUP (Run this first to ensure idempotency)
-- ============================================================

DO $$
BEGIN
  -- Drop tables in reverse order of creation (reverse FK dependency)
  DROP TABLE IF EXISTS public.faqs CASCADE;
  DROP TABLE IF EXISTS public.user_preferences CASCADE;
  DROP TABLE IF EXISTS public.users CASCADE;
  DROP TABLE IF EXISTS public.employees CASCADE;
  DROP TABLE IF EXISTS public.departments CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


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
  phone TEXT DEFAULT '',
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female')),
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  postal_code TEXT DEFAULT '',
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  position TEXT NOT NULL,
  employment_type TEXT NOT NULL DEFAULT 'full-time' CHECK (employment_type IN ('full-time', 'part-time', 'contract')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on-leave')),
  hire_date DATE NOT NULL,
  termination_date DATE,
  salary NUMERIC(12,2) DEFAULT 0,
  photo_url TEXT,
  qualifications JSONB DEFAULT '[]'::jsonb,
  emergency_contact_name TEXT DEFAULT '',
  emergency_contact_phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

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

-- Migration File 03: Payroll Tables
-- Purpose: Create payroll, bonuses, and deductions tables
-- Dependencies: File 01 (employees, users must exist)
-- Created by: Migration Split Plan

-- ============================================================
-- CLEANUP
-- ============================================================

DO $$
BEGIN
  DROP TABLE IF EXISTS public.deductions CASCADE;
  DROP TABLE IF EXISTS public.bonuses CASCADE;
  DROP TABLE IF EXISTS public.payrolls CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- ============================================================
-- PAYROLL
-- ============================================================

CREATE TABLE public.payrolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL CHECK (period_year >= 2020),
  base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_bonuses NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  gross_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
  notes TEXT DEFAULT '',
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  generated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, period_month, period_year)
);

CREATE TABLE public.bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  payroll_id UUID REFERENCES public.payrolls(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('overtime', 'performance', 'allowance', 'commission', 'bonus', 'holiday')),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL CHECK (period_year >= 2020),
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  payroll_id UUID REFERENCES public.payrolls(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('tax', 'insurance', 'retirement', 'late', 'absence', 'unpaid_leave', 'penalty', 'loan')),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL CHECK (period_year >= 2020),
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SEED DATA
-- WARNING: This file is for development/demo only.
-- DO NOT run in production.
-- Loaded automatically by: supabase db reset
-- ============================================================

-- =============================================
-- SEED DATA
-- =============================================

DO $$
DECLARE
  dept_tech UUID := gen_random_uuid();
  dept_business UUID := gen_random_uuid();
  dept_eng UUID := gen_random_uuid();
  dept_hr UUID := gen_random_uuid();
  dept_admin UUID := gen_random_uuid();
  emp_id UUID;
BEGIN
  -- Departments
  INSERT INTO public.departments (id, name, type, description) VALUES
    (dept_tech, 'Technology', 'administrative', 'Technology and IT Services'),
    (dept_business, 'Business Operations', 'administrative', 'Business Operations and Management'),
    (dept_eng, 'Engineering', 'administrative', 'Engineering and Development'),
    (dept_hr, 'Human Resources', 'administrative', 'Human Resources and Recruitment'),
    (dept_admin, 'Administration', 'administrative', 'General Administration and Support');

  -- Admin employee
  INSERT INTO public.employees (first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES ('John', 'Smith', 'anas.essam.work@gmail.com', '555-0101', '1975-03-15', 'male', '123 Admin St', 'Boston', 'MA', '02101', dept_admin, 'System Administrator', 'full-time', 'active', '2010-01-15', 95000, '[{"degree": "MBA", "institution": "Harvard University"}]', 'Jane Smith', '555-0102');

  -- HR employee
  INSERT INTO public.employees (first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES ('Sarah', 'Johnson', 'essamanas86@gmail.com', '555-0103', '1982-07-22', 'female', '456 HR Ave', 'Boston', 'MA', '02102', dept_admin, 'HR Manager', 'full-time', 'active', '2015-03-20', 75000, '[{"degree": "MS Human Resources", "institution": "Boston College"}]', 'Mike Johnson', '555-0104');

  -- Staff employee
  INSERT INTO public.employees (first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone)
  VALUES ('Michael', 'Davis', 'tvissam96@gmail.com', '555-0105', '1988-11-10', 'male', '789 Faculty Rd', 'Boston', 'MA', '02103', dept_tech, 'Senior Analyst', 'full-time', 'active', '2018-09-01', 68000, '[{"degree": "PhD Computer Science", "institution": "MIT"}]', 'Emily Davis', '555-0106');

  -- Additional employees
  INSERT INTO public.employees (first_name, last_name, email, phone, date_of_birth, gender, address, city, state, postal_code, department_id, position, employment_type, status, hire_date, salary, qualifications, emergency_contact_name, emergency_contact_phone) VALUES
    ('Emily', 'Wilson', 'e.wilson@DevTeamHub.com', '555-0107', '1985-05-18', 'female', '321 Academic Ln', 'Boston', 'MA', '02104', dept_tech, 'Director', 'full-time', 'active', '2012-08-15', 85000, '[{"degree": "PhD Computer Science", "institution": "Stanford University"}]', 'Robert Wilson', '555-0108'),
    ('David', 'Brown', 'd.brown@DevTeamHub.com', '555-0109', '1990-02-28', 'male', '654 Tech Blvd', 'Boston', 'MA', '02105', dept_tech, 'Lecturer', 'full-time', 'active', '2019-01-10', 62000, '[{"degree": "MS Computer Science", "institution": "Boston University"}]', 'Lisa Brown', '555-0110'),
    ('Jennifer', 'Martinez', 'j.martinez@DevTeamHub.com', '555-0111', '1987-09-05', 'female', '987 Business Dr', 'Boston', 'MA', '02106', dept_business, 'Team Lead', 'full-time', 'active', '2014-07-01', 78000, '[{"degree": "PhD Business Administration", "institution": "Wharton"}]', 'Carlos Martinez', '555-0112'),
    ('Robert', 'Garcia', 'r.garcia@DevTeamHub.com', '555-0113', '1983-12-20', 'male', '147 Commerce St', 'Boston', 'MA', '02107', dept_business, 'Director', 'full-time', 'active', '2011-09-15', 88000, '[{"degree": "PhD Economics", "institution": "Yale University"}]', 'Maria Garcia', '555-0114'),
    ('Linda', 'Rodriguez', 'l.rodriguez@DevTeamHub.com', '555-0115', '1992-04-12', 'female', '258 Finance Way', 'Boston', 'MA', '02108', dept_business, 'Senior Analyst', 'full-time', 'active', '2020-01-15', 65000, '[{"degree": "PhD Finance", "institution": "NYU"}]', 'Jose Rodriguez', '555-0116'),
    ('James', 'Lee', 'j.lee@DevTeamHub.com', '555-0117', '1986-08-30', 'male', '369 Engineering Ct', 'Boston', 'MA', '02109', dept_eng, 'Director', 'full-time', 'active', '2013-06-01', 90000, '[{"degree": "PhD Mechanical Engineering", "institution": "MIT"}]', 'Susan Lee', '555-0118'),
    ('Mary', 'Anderson', 'm.anderson@DevTeamHub.com', '555-0119', '1989-01-25', 'female', '741 Tech Plaza', 'Boston', 'MA', '02110', dept_eng, 'Team Lead', 'full-time', 'active', '2016-03-10', 76000, '[{"degree": "PhD Electrical Engineering", "institution": "Caltech"}]', 'Tom Anderson', '555-0120'),
    ('William', 'Taylor', 'w.taylor@DevTeamHub.com', '555-0121', '1991-06-14', 'male', '852 Innovation Dr', 'Boston', 'MA', '02111', dept_eng, 'Lecturer', 'part-time', 'active', '2021-09-01', 45000, '[{"degree": "MS Civil Engineering", "institution": "Georgia Tech"}]', 'Ann Taylor', '555-0122'),
    ('Patricia', 'Thomas', 'p.thomas@DevTeamHub.com', '555-0123', '1984-10-08', 'female', '963 Liberal Arts Ave', 'Boston', 'MA', '02112', dept_hr, 'Director', 'full-time', 'active', '2012-08-20', 82000, '[{"degree": "PhD English Literature", "institution": "Columbia"}]', 'George Thomas', '555-0124'),
    ('Richard', 'Jackson', 'r.jackson@DevTeamHub.com', '555-0125', '1987-03-17', 'male', '159 History Ln', 'Boston', 'MA', '02113', dept_hr, 'Team Lead', 'full-time', 'active', '2015-01-12', 74000, '[{"degree": "PhD History", "institution": "Princeton"}]', 'Barbara Jackson', '555-0126'),
    ('Charles', 'Harris', 'c.harris@DevTeamHub.com', '555-0129', '1988-11-03', 'male', '468 Support St', 'Boston', 'MA', '02115', dept_admin, 'IT Manager', 'full-time', 'active', '2016-05-15', 72000, '[{"degree": "BS Information Systems", "institution": "Northeastern"}]', 'Nancy Harris', '555-0130'),
    ('Joseph', 'Lewis', 'j.lewis@DevTeamHub.com', '555-0133', '1986-12-07', 'male', '680 Data Science Blvd', 'Boston', 'MA', '02117', dept_tech, 'Senior Analyst', 'full-time', 'active', '2017-08-01', 70000, '[{"degree": "PhD Data Science", "institution": "Carnegie Mellon"}]', 'Karen Lewis', '555-0134'),
    ('Karen', 'Walker', 'k.walker@DevTeamHub.com', '555-0135', '1991-05-23', 'female', '791 AI Research Ct', 'Boston', 'MA', '02118', dept_tech, 'Research Associate', 'contract', 'active', '2022-01-10', 58000, '[{"degree": "MS Artificial Intelligence", "institution": "Stanford"}]', 'Mark Walker', '555-0136'),
    ('Nancy', 'Hall', 'n.hall@DevTeamHub.com', '555-0137', '1985-09-16', 'female', '892 Marketing Plaza', 'Boston', 'MA', '02119', dept_business, 'Lecturer', 'part-time', 'active', '2020-09-01', 42000, '[{"degree": "MBA Marketing", "institution": "Babson College"}]', 'Daniel Hall', '555-0138'),
    ('Betty', 'Young', 'b.young@DevTeamHub.com', '555-0141', '1992-08-26', 'female', '124 Robotics Way', 'Boston', 'MA', '02121', dept_eng, 'Senior Analyst', 'full-time', 'active', '2020-08-15', 69000, '[{"degree": "PhD Robotics", "institution": "CMU"}]', 'Frank Young', '555-0142'),
    ('Brian', 'Scott', 'b.scott@DevTeamHub.com', '555-0151', '1986-05-27', 'male', '679 Facilities Dr', 'Boston', 'MA', '02126', dept_admin, 'Facilities Manager', 'full-time', 'active', '2015-03-15', 60000, '[{"degree": "BS Facilities Management", "institution": "UMass"}]', 'Carol Scott', '555-0152'),
    ('Carol', 'Green', 'c.green@DevTeamHub.com', '555-0153', '1993-01-08', 'female', '780 Finance Office St', 'Boston', 'MA', '02127', dept_admin, 'Financial Analyst', 'full-time', 'active', '2020-06-01', 58000, '[{"degree": "MS Finance", "institution": "Boston College"}]', 'Eric Green', '555-0154'),
    ('Ryan', 'Nelson', 'r.nelson@DevTeamHub.com', '555-0159', '1987-04-04', 'male', '113 people Services Rd', 'Boston', 'MA', '02130', dept_admin, 'Student Services Advisor', 'full-time', 'inactive', '2017-09-01', 56000, '[{"degree": "MS Counseling", "institution": "Lesley"}]', 'Jessica Nelson', '555-0160'),
    ('Sandra', 'Wright', 's.wright@DevTeamHub.com', '555-0161', '1990-07-19', 'female', '225 Research Park', 'Boston', 'MA', '02131', dept_tech, 'Research Associate', 'contract', 'on-leave', '2019-11-01', 55000, '[{"degree": "MS Biochemistry", "institution": "Tufts"}]', 'Kevin Wright', '555-0162');

  -- Update department heads
  UPDATE public.departments SET head_id = (SELECT id FROM public.employees WHERE email = 'e.wilson@DevTeamHub.com') WHERE id = dept_tech;
  UPDATE public.departments SET head_id = (SELECT id FROM public.employees WHERE email = 'r.garcia@DevTeamHub.com') WHERE id = dept_business;
  UPDATE public.departments SET head_id = (SELECT id FROM public.employees WHERE email = 'j.lee@DevTeamHub.com') WHERE id = dept_eng;
  UPDATE public.departments SET head_id = (SELECT id FROM public.employees WHERE email = 'p.thomas@DevTeamHub.com') WHERE id = dept_hr;
  UPDATE public.departments SET head_id = (SELECT id FROM public.employees WHERE email = 'anas.essam.work@gmail.com') WHERE id = dept_admin;
END $$;

-- Leave Balances for 2026 (with partial usage to reflect approved leaves)
INSERT INTO public.leave_balances (employee_id, year, annual_total, annual_used, sick_total, sick_used, casual_total, casual_used)
SELECT id, 2026,
  20,
  CASE WHEN email = 'e.wilson@DevTeamHub.com' THEN 0 WHEN email = 'j.martinez@DevTeamHub.com' THEN 5 WHEN email = 'r.garcia@DevTeamHub.com' THEN 3 ELSE 0 END,
  10,
  CASE WHEN email = 'e.wilson@DevTeamHub.com' THEN 2 WHEN email = 'l.rodriguez@DevTeamHub.com' THEN 3 ELSE 0 END,
  10,
  CASE WHEN email = 'd.brown@DevTeamHub.com' THEN 1 WHEN email = 'm.anderson@DevTeamHub.com' THEN 2 ELSE 0 END
FROM public.employees;

-- ============================================================================
-- LEAVE REQUESTS - All statuses and types
-- ============================================================================
-- Pending leaves
INSERT INTO public.leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status)
SELECT id, 'annual', '2026-02-22', '2026-02-26', 5, 'Family vacation - need time off to travel', 'pending' FROM public.employees WHERE email = 'tvissam96@gmail.com';
INSERT INTO public.leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status)
SELECT id, 'sabbatical', '2026-03-01', '2026-03-14', 14, 'Research sabbatical for academic paper', 'pending' FROM public.employees WHERE email = 'j.lee@DevTeamHub.com';
INSERT INTO public.leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status)
SELECT id, 'casual', '2026-02-25', '2026-02-25', 1, 'Personal errand', 'pending' FROM public.employees WHERE email = 'c.harris@DevTeamHub.com';

-- Approved leaves
INSERT INTO public.leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status, approved_by)
SELECT e.id, 'sick', '2026-02-10', '2026-02-11', 2, 'Medical appointment and recovery', 'approved',
  (SELECT u.id FROM public.users u WHERE u.role = 'hr' LIMIT 1)
FROM public.employees e WHERE e.email = 'e.wilson@DevTeamHub.com';
INSERT INTO public.leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status, approved_by)
SELECT e.id, 'casual', '2026-02-15', '2026-02-15', 1, 'Personal work - bank appointment', 'approved',
  (SELECT u.id FROM public.users u WHERE u.role = 'hr' LIMIT 1)
FROM public.employees e WHERE e.email = 'd.brown@DevTeamHub.com';
INSERT INTO public.leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status, approved_by)
SELECT e.id, 'annual', '2026-02-03', '2026-02-07', 5, 'Winter holiday trip', 'approved',
  (SELECT u.id FROM public.users u WHERE u.role = 'admin' LIMIT 1)
FROM public.employees e WHERE e.email = 'j.martinez@DevTeamHub.com';
INSERT INTO public.leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status, approved_by)
SELECT e.id, 'annual', '2026-01-20', '2026-01-22', 3, 'Family event', 'approved',
  (SELECT u.id FROM public.users u WHERE u.role = 'admin' LIMIT 1)
FROM public.employees e WHERE e.email = 'r.garcia@DevTeamHub.com';

-- Rejected leaves
INSERT INTO public.leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status)
SELECT id, 'sick', '2026-01-25', '2026-01-26', 2, 'Cold and flu symptoms', 'rejected' FROM public.employees WHERE email = 'l.rodriguez@DevTeamHub.com';
INSERT INTO public.leaves (employee_id, leave_type, start_date, end_date, days_count, reason, status)
SELECT id, 'annual', '2026-02-14', '2026-02-14', 1, 'Valentine day off', 'rejected' FROM public.employees WHERE email = 'w.taylor@DevTeamHub.com';

-- ============================================================================
-- ATTENDANCE - Mixed statuses
-- ============================================================================

-- Past 7 days attendance for most employees (present)
INSERT INTO public.attendance (employee_id, date, check_in, check_out, status)
SELECT e.id, d::date, '09:00', '17:00', 'present'
FROM public.employees e
CROSS JOIN generate_series(CURRENT_DATE - 7, CURRENT_DATE - 1, '1 day') d
WHERE e.status = 'active' AND e.email NOT IN (
  'anas.essam.work@gmail.com', 'essamanas86@gmail.com', 'tvissam96@gmail.com',
  'l.rodriguez@DevTeamHub.com', 'w.taylor@DevTeamHub.com', 'k.walker@DevTeamHub.com'
)
ON CONFLICT (employee_id, date) DO NOTHING;

-- Auth user attendance (past 5 days - present)
INSERT INTO public.attendance (employee_id, date, check_in, check_out, status)
SELECT e.id, d::date, '08:45', '17:15', 'present'
FROM public.employees e
CROSS JOIN generate_series(CURRENT_DATE - 5, CURRENT_DATE - 1, '1 day') d
WHERE e.email IN ('anas.essam.work@gmail.com', 'essamanas86@gmail.com', 'tvissam96@gmail.com')
ON CONFLICT (employee_id, date) DO NOTHING;

-- Today's attendance for some employees (so dashboard shows > 0)
INSERT INTO public.attendance (employee_id, date, check_in, check_out, status)
SELECT e.id, CURRENT_DATE, '08:55', '17:00', 'present'
FROM public.employees e
WHERE e.email IN ('anas.essam.work@gmail.com', 'essamanas86@gmail.com', 'tvissam96@gmail.com',
  'e.wilson@DevTeamHub.com', 'j.lee@DevTeamHub.com', 'r.garcia@DevTeamHub.com',
  'p.thomas@DevTeamHub.com', 'c.harris@DevTeamHub.com', 'j.martinez@DevTeamHub.com',
  'd.brown@DevTeamHub.com', 'j.lewis@DevTeamHub.com', 'b.young@DevTeamHub.com')
ON CONFLICT (employee_id, date) DO NOTHING;

-- Late arrivals (multiple days)
INSERT INTO public.attendance (employee_id, date, check_in, check_out, status)
SELECT e.id, d::date, '10:15', '17:30', 'late'
FROM public.employees e
CROSS JOIN generate_series(CURRENT_DATE - 7, CURRENT_DATE - 1, '1 day') d
WHERE e.email = 'l.rodriguez@DevTeamHub.com'
ON CONFLICT (employee_id, date) DO NOTHING;

-- Late arrivals for w.taylor
INSERT INTO public.attendance (employee_id, date, check_in, check_out, status)
SELECT e.id, d::date, '09:45', '17:00', 'late'
FROM public.employees e
CROSS JOIN generate_series(CURRENT_DATE - 4, CURRENT_DATE - 2, '1 day') d
WHERE e.email = 'w.taylor@DevTeamHub.com'
ON CONFLICT (employee_id, date) DO NOTHING;

-- Absent records
INSERT INTO public.attendance (employee_id, date, check_in, check_out, status)
SELECT e.id, (CURRENT_DATE - 3)::date, NULL, NULL, 'absent'
FROM public.employees e WHERE e.email = 'k.walker@DevTeamHub.com'
ON CONFLICT (employee_id, date) DO NOTHING;
INSERT INTO public.attendance (employee_id, date, check_in, check_out, status)
SELECT e.id, (CURRENT_DATE - 5)::date, NULL, NULL, 'absent'
FROM public.employees e WHERE e.email = 'w.taylor@DevTeamHub.com'
ON CONFLICT (employee_id, date) DO NOTHING;

-- Half-day records
INSERT INTO public.attendance (employee_id, date, check_in, check_out, status)
SELECT e.id, (CURRENT_DATE - 2)::date, '09:00', '13:00', 'half-day'
FROM public.employees e WHERE e.email = 'k.walker@DevTeamHub.com'
ON CONFLICT (employee_id, date) DO NOTHING;

-- ============================================================================
-- AUTH USERS SETUP (GoTrue compatible)
-- Uses fixed UUIDs + pre-computed $2a$ bcrypt hashes + auth.identities
-- Credentials: admin123, Hr1234, emp123
-- ============================================================================

-- Clean slate
DELETE FROM auth.identities WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('anas.essam.work@gmail.com', 'essamanas86@gmail.com', 'tvissam96@gmail.com')
);
DELETE FROM auth.users WHERE email IN ('anas.essam.work@gmail.com', 'essamanas86@gmail.com', 'tvissam96@gmail.com');

-- Insert auth.users with fixed UUIDs and native pgcrypto bcrypt hashes
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) VALUES 
  -- Admin: anas.essam.work@gmail.com / admin123
  ('00000000-0000-0000-0000-000000000000', 'a1b2c3d4-e5f6-4a5b-8c7d-1234567890ab',
   'authenticated', 'authenticated', 'anas.essam.work@gmail.com',
   extensions.crypt('admin123', extensions.gen_salt('bf')),  
   now(), '{"provider":"email","providers":["email"],"role":"admin"}',
   '{}', now(), now(), '', '', '', ''),
  -- HR: essamanas86@gmail.com / Hr1234
  ('00000000-0000-0000-0000-000000000000', 'b2c3d4e5-f6a7-4b5c-9d8e-234567890abc',
   'authenticated', 'authenticated', 'essamanas86@gmail.com',
   extensions.crypt('Hr1234', extensions.gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"],"role":"hr"}',
   '{}', now(), now(), '', '', '', ''),
  -- Staff: tvissam96@gmail.com / emp123
  ('00000000-0000-0000-0000-000000000000', 'c3d4e5f6-a7b8-4c5d-ae9f-34567890abcd',
   'authenticated', 'authenticated', 'tvissam96@gmail.com',
   extensions.crypt('emp123', extensions.gen_salt('bf')),
   now(), '{"provider":"email","providers":["email"],"role":"staff"}',
   '{}', now(), now(), '', '', '', '');

DO $$
DECLARE
  _row_count INT;
BEGIN
  EXECUTE 'GRANT ALL ON TABLE auth.identities TO postgres';
  
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES
    ('a1b2c3d4-e5f6-4a5b-8c7d-1234567890ab',
     'a1b2c3d4-e5f6-4a5b-8c7d-1234567890ab',
     '{"sub":"a1b2c3d4-e5f6-4a5b-8c7d-1234567890ab","email":"anas.essam.work@gmail.com","email_verified":true}',
     'email', 'a1b2c3d4-e5f6-4a5b-8c7d-1234567890ab',
     now(), now(), now()),
    ('b2c3d4e5-f6a7-4b5c-9d8e-234567890abc',
     'b2c3d4e5-f6a7-4b5c-9d8e-234567890abc',
     '{"sub":"b2c3d4e5-f6a7-4b5c-9d8e-234567890abc","email":"essamanas86@gmail.com","email_verified":true}',
     'email', 'b2c3d4e5-f6a7-4b5c-9d8e-234567890abc',
     now(), now(), now()),
    ('c3d4e5f6-a7b8-4c5d-ae9f-34567890abcd',
     'c3d4e5f6-a7b8-4c5d-ae9f-34567890abcd',
     '{"sub":"c3d4e5f6-a7b8-4c5d-ae9f-34567890abcd","email":"tvissam96@gmail.com","email_verified":true}',
     'email', 'c3d4e5f6-a7b8-4c5d-ae9f-34567890abcd',
     now(), now(), now());

  GET DIAGNOSTICS _row_count = ROW_COUNT;
  
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================================================
-- PAYROLL
-- ============================================================================

-- January 2026 Payroll (ALL PAID - historical)
INSERT INTO public.payrolls (employee_id, period_month, period_year, base_salary, total_bonuses, total_deductions, gross_salary, net_salary, status, notes, generated_at)
SELECT e.id, 1, 2026, e.salary,
  CASE WHEN e.position IN ('Director', 'System Administrator') THEN 1500 WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 1000 WHEN e.position LIKE 'Senior%' THEN 750 ELSE 500 END,
  ROUND(e.salary * 0.08, 2),
  e.salary + CASE WHEN e.position IN ('Director', 'System Administrator') THEN 1500 WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 1000 WHEN e.position LIKE 'Senior%' THEN 750 ELSE 500 END,
  e.salary + CASE WHEN e.position IN ('Director', 'System Administrator') THEN 1500 WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 1000 WHEN e.position LIKE 'Senior%' THEN 750 ELSE 500 END - ROUND(e.salary * 0.08, 2),
  'paid', 'January 2026 payroll - processed and paid', '2026-01-31'::TIMESTAMPTZ
FROM public.employees e WHERE e.status = 'active'
ON CONFLICT (employee_id, period_month, period_year) DO NOTHING;

-- February 2026 Payroll - DRAFT (most employees) for testing approve workflow
INSERT INTO public.payrolls (employee_id, period_month, period_year, base_salary, total_bonuses, total_deductions, gross_salary, net_salary, status, notes, generated_at)
SELECT e.id, 2, 2026, e.salary,
  CASE WHEN e.position IN ('Director', 'System Administrator') THEN 1500 WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 1000 WHEN e.position LIKE 'Senior%' THEN 750 ELSE 500 END,
  ROUND(e.salary * 0.08, 2),
  e.salary + CASE WHEN e.position IN ('Director', 'System Administrator') THEN 1500 WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 1000 WHEN e.position LIKE 'Senior%' THEN 750 ELSE 500 END,
  e.salary + CASE WHEN e.position IN ('Director', 'System Administrator') THEN 1500 WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 1000 WHEN e.position LIKE 'Senior%' THEN 750 ELSE 500 END - ROUND(e.salary * 0.08, 2),
  'draft', 'February 2026 payroll - pending approval', now()
FROM public.employees e
WHERE e.status = 'active'
  AND e.email NOT IN ('e.wilson@DevTeamHub.com', 'r.garcia@DevTeamHub.com', 'j.lee@DevTeamHub.com', 'p.thomas@DevTeamHub.com', 'j.martinez@DevTeamHub.com')
ON CONFLICT (employee_id, period_month, period_year) DO NOTHING;

-- February 2026 Payroll - APPROVED (5 department heads) for testing pay workflow
INSERT INTO public.payrolls (employee_id, period_month, period_year, base_salary, total_bonuses, total_deductions, gross_salary, net_salary, status, notes, generated_at, approved_by, approved_at)
SELECT e.id, 2, 2026, e.salary,
  CASE WHEN e.position IN ('Director', 'System Administrator') THEN 1500 WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 1000 WHEN e.position LIKE 'Senior%' THEN 750 ELSE 500 END,
  ROUND(e.salary * 0.08, 2),
  e.salary + CASE WHEN e.position IN ('Director', 'System Administrator') THEN 1500 WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 1000 WHEN e.position LIKE 'Senior%' THEN 750 ELSE 500 END,
  e.salary + CASE WHEN e.position IN ('Director', 'System Administrator') THEN 1500 WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 1000 WHEN e.position LIKE 'Senior%' THEN 750 ELSE 500 END - ROUND(e.salary * 0.08, 2),
  'approved', 'February 2026 payroll - approved, ready for payment', now(),
  (SELECT u.id FROM public.users u WHERE u.role = 'admin' LIMIT 1), now()
FROM public.employees e
WHERE e.email IN ('e.wilson@DevTeamHub.com', 'r.garcia@DevTeamHub.com', 'j.lee@DevTeamHub.com', 'p.thomas@DevTeamHub.com', 'j.martinez@DevTeamHub.com')
ON CONFLICT (employee_id, period_month, period_year) DO NOTHING;

-- Bonuses for January 2026 (housing allowance)
INSERT INTO public.bonuses (employee_id, payroll_id, type, amount, description, period_month, period_year)
SELECT e.id, p.id, 'allowance',
  CASE WHEN e.position IN ('Director', 'System Administrator') THEN 1000 WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 700 WHEN e.position LIKE 'Senior%' THEN 500 ELSE 300 END,
  'Monthly housing allowance', 1, 2026
FROM public.employees e
JOIN public.payrolls p ON p.employee_id = e.id AND p.period_month = 1 AND p.period_year = 2026
WHERE e.status = 'active';

-- Performance bonuses for January (Directors & leads)
INSERT INTO public.bonuses (employee_id, payroll_id, type, amount, description, period_month, period_year)
SELECT e.id, p.id, 'performance',
  CASE WHEN e.position LIKE 'Director%' THEN 500 ELSE 300 END,
  'Q4 2025 performance bonus', 1, 2026
FROM public.employees e
JOIN public.payrolls p ON p.employee_id = e.id AND p.period_month = 1 AND p.period_year = 2026
WHERE e.position IN ('Director', 'Team Lead', 'System Administrator');

-- Bonuses for February 2026 (housing allowance for all February payrolls)
INSERT INTO public.bonuses (employee_id, payroll_id, type, amount, description, period_month, period_year)
SELECT e.id, p.id, 'allowance',
  CASE WHEN e.position IN ('Director', 'System Administrator') THEN 1000 WHEN e.position IN ('Team Lead', 'HR Manager', 'IT Manager') THEN 700 WHEN e.position LIKE 'Senior%' THEN 500 ELSE 300 END,
  'Monthly housing allowance', 2, 2026
FROM public.employees e
JOIN public.payrolls p ON p.employee_id = e.id AND p.period_month = 2 AND p.period_year = 2026
WHERE e.status = 'active';

-- Overtime bonus for Feb (a few employees)
INSERT INTO public.bonuses (employee_id, payroll_id, type, amount, description, period_month, period_year)
SELECT e.id, p.id, 'overtime', 450, 'Overtime hours - system migration project', 2, 2026
FROM public.employees e
JOIN public.payrolls p ON p.employee_id = e.id AND p.period_month = 2 AND p.period_year = 2026
WHERE e.email IN ('c.harris@DevTeamHub.com', 'j.lewis@DevTeamHub.com', 'tvissam96@gmail.com');

-- Deductions for January 2026 (tax + insurance)
INSERT INTO public.deductions (employee_id, payroll_id, type, amount, description, period_month, period_year)
SELECT e.id, p.id, 'tax', ROUND(e.salary * 0.05, 2), 'Income tax - 5%', 1, 2026
FROM public.employees e
JOIN public.payrolls p ON p.employee_id = e.id AND p.period_month = 1 AND p.period_year = 2026
WHERE e.status = 'active';

INSERT INTO public.deductions (employee_id, payroll_id, type, amount, description, period_month, period_year)
SELECT e.id, p.id, 'insurance', ROUND(e.salary * 0.02, 2), 'Health insurance premium', 1, 2026
FROM public.employees e
JOIN public.payrolls p ON p.employee_id = e.id AND p.period_month = 1 AND p.period_year = 2026
WHERE e.status = 'active';

-- Deductions for February 2026 (tax + insurance + penalties for some)
INSERT INTO public.deductions (employee_id, payroll_id, type, amount, description, period_month, period_year)
SELECT e.id, p.id, 'tax', ROUND(e.salary * 0.05, 2), 'Income tax - 5%', 2, 2026
FROM public.employees e
JOIN public.payrolls p ON p.employee_id = e.id AND p.period_month = 2 AND p.period_year = 2026
WHERE e.status = 'active';

INSERT INTO public.deductions (employee_id, payroll_id, type, amount, description, period_month, period_year)
SELECT e.id, p.id, 'insurance', ROUND(e.salary * 0.02, 2), 'Health insurance premium', 2, 2026
FROM public.employees e
JOIN public.payrolls p ON p.employee_id = e.id AND p.period_month = 2 AND p.period_year = 2026
WHERE e.status = 'active';

-- Penalty deductions for late employees (February)
INSERT INTO public.deductions (employee_id, payroll_id, type, amount, description, period_month, period_year)
SELECT e.id, p.id, 'penalty', 200, 'Late attendance penalty - 5 occurrences', 2, 2026
FROM public.employees e
JOIN public.payrolls p ON p.employee_id = e.id AND p.period_month = 2 AND p.period_year = 2026
WHERE e.email = 'l.rodriguez@DevTeamHub.com';

INSERT INTO public.deductions (employee_id, payroll_id, type, amount, description, period_month, period_year)
SELECT e.id, p.id, 'penalty', 150, 'Late attendance penalty - 3 occurrences', 2, 2026
FROM public.employees e
JOIN public.payrolls p ON p.employee_id = e.id AND p.period_month = 2 AND p.period_year = 2026
WHERE e.email = 'w.taylor@DevTeamHub.com';

-- ============================================================================
-- TASKS - All statuses, all priorities
-- ============================================================================
DO $$
DECLARE
  v_admin_id UUID;
  v_hr_id UUID;
BEGIN
  SELECT u.id INTO v_admin_id FROM public.users u WHERE u.role = 'admin' LIMIT 1;
  SELECT u.id INTO v_hr_id FROM public.users u WHERE u.role = 'hr' LIMIT 1;
  
  IF v_admin_id IS NOT NULL THEN
    -- Pending tasks (different priorities)
    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, points, penalty_points, assigned_by)
    SELECT e.id, 'Complete Q1 Performance Review', 'Submit self-assessment form and schedule meeting with supervisor.', 'high', 'pending', '2026-02-28', 20, 10, v_admin_id
    FROM public.employees e WHERE e.email = 'tvissam96@gmail.com';

    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, points, penalty_points, assigned_by)
    SELECT e.id, 'System Security Audit', 'Conduct comprehensive security audit of all internal systems.', 'urgent', 'pending', '2026-02-25', 30, 20, v_admin_id
    FROM public.employees e WHERE e.email = 'c.harris@DevTeamHub.com';

    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, points, penalty_points, assigned_by)
    SELECT e.id, 'Organize Team Building Event', 'Plan and arrange the quarterly team building activity.', 'low', 'pending', '2026-03-20', 5, 2, v_admin_id
    FROM public.employees e WHERE e.email = 'n.hall@DevTeamHub.com';

    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, points, penalty_points, assigned_by)
    SELECT e.id, 'Review Vendor Contracts', 'Review all vendor contracts expiring in Q1 and prepare renewal recommendations.', 'normal', 'pending', '2026-03-01', 15, 5, v_admin_id
    FROM public.employees e WHERE e.email = 'r.garcia@DevTeamHub.com';

    -- In-progress tasks
    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, points, penalty_points, assigned_by)
    SELECT e.id, 'Update Department Documentation', 'Review and update all department procedures and SOPs.', 'normal', 'in_progress', '2026-03-15', 15, 5, v_admin_id
    FROM public.employees e WHERE e.email = 'e.wilson@DevTeamHub.com';

    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, points, penalty_points, assigned_by)
    SELECT e.id, 'Develop New Onboarding Module', 'Create training module for new employee onboarding process.', 'high', 'in_progress', '2026-03-10', 25, 15, v_admin_id
    FROM public.employees e WHERE e.email = 'r.jackson@DevTeamHub.com';

    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, points, penalty_points, assigned_by)
    SELECT e.id, 'Database Migration Planning', 'Plan and document the database migration to new infrastructure.', 'urgent', 'in_progress', '2026-02-28', 30, 20, v_admin_id
    FROM public.employees e WHERE e.email = 'tvissam96@gmail.com';

    -- Completed tasks
    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, completed_at, points, penalty_points, assigned_by)
    SELECT e.id, 'Submit Monthly Report', 'Compile and submit the monthly department activity report.', 'normal', 'completed', '2026-02-10', '2026-02-09 14:30:00+00', 10, 5, v_admin_id
    FROM public.employees e WHERE e.email = 'd.brown@DevTeamHub.com';

    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, completed_at, points, penalty_points, assigned_by)
    SELECT e.id, 'Annual Budget Proposal', 'Prepare department annual budget proposal for FY2026.', 'high', 'completed', '2026-02-05', '2026-02-04 16:00:00+00', 25, 15, v_admin_id
    FROM public.employees e WHERE e.email = 'j.lee@DevTeamHub.com';

    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, completed_at, points, penalty_points, assigned_by)
    SELECT e.id, 'IT Inventory Audit', 'Complete inventory of all IT assets and update tracking system.', 'normal', 'completed', '2026-02-12', '2026-02-11 11:00:00+00', 10, 5, v_admin_id
    FROM public.employees e WHERE e.email = 'c.harris@DevTeamHub.com';

    -- Overdue tasks (deadline in the past, not completed)
    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, points, penalty_points, assigned_by)
    SELECT e.id, 'Submit Research Proposal', 'Draft and submit research grant proposal for spring semester.', 'high', 'overdue', '2026-02-10', 20, 15, v_admin_id
    FROM public.employees e WHERE e.email = 'k.walker@DevTeamHub.com';

    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, points, penalty_points, assigned_by)
    SELECT e.id, 'Complete Safety Training', 'Finish the mandatory online safety training module.', 'normal', 'overdue', '2026-02-15', 10, 10, v_admin_id
    FROM public.employees e WHERE e.email = 'w.taylor@DevTeamHub.com';

    -- Cancelled task
    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, points, penalty_points, assigned_by)
    SELECT e.id, 'Legacy System Documentation', 'Document the legacy payroll system before decommission. (Cancelled - system already decommissioned)', 'low', 'cancelled', '2026-02-20', 10, 5, v_admin_id
    FROM public.employees e WHERE e.email = 'b.scott@DevTeamHub.com';

    -- ============================================================================
    -- THIS WEEK'S TASKS (Feb 16-22) - For performance calculation variety
    -- ============================================================================
    
    -- Completed tasks THIS WEEK (deadline this week, completed this week)
    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, completed_at, points, penalty_points, assigned_by)
    SELECT e.id, 'Weekly Team Sync', 'Lead weekly team synchronization meeting.', 'normal', 'completed', '2026-02-18', '2026-02-18 10:00:00+00', 15, 5, v_admin_id
    FROM public.employees e WHERE e.email = 'anas.essam.work@gmail.com';

    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, completed_at, points, penalty_points, assigned_by)
    SELECT e.id, 'Code Review Sprint Tasks', 'Review all sprint pull requests and provide feedback.', 'high', 'completed', '2026-02-19', '2026-02-19 15:30:00+00', 20, 10, v_admin_id
    FROM public.employees e WHERE e.email = 'anas.essam.work@gmail.com';

    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, completed_at, points, penalty_points, assigned_by)
    SELECT e.id, 'Engineering Team Report', 'Submit weekly engineering progress report.', 'normal', 'completed', '2026-02-20', '2026-02-20 09:00:00+00', 10, 5, v_admin_id
    FROM public.employees e WHERE e.email = 'j.lee@DevTeamHub.com';

    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, completed_at, points, penalty_points, assigned_by)
    SELECT e.id, 'Review Hiring Candidates', 'Review resumes for open positions and schedule interviews.', 'high', 'completed', '2026-02-19', '2026-02-19 14:00:00+00', 20, 10, v_admin_id
    FROM public.employees e WHERE e.email = 'j.lee@DevTeamHub.com';

    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, completed_at, points, penalty_points, assigned_by)
    SELECT e.id, 'Business Unit Planning', 'Prepare Q1 business unit planning document.', 'normal', 'completed', '2026-02-17', '2026-02-17 16:00:00+00', 15, 5, v_admin_id
    FROM public.employees e WHERE e.email = 'e.wilson@DevTeamHub.com';

    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, completed_at, points, penalty_points, assigned_by)
    SELECT e.id, 'Financial Report Review', 'Review and approve weekly financial reports.', 'normal', 'completed', '2026-02-18', '2026-02-18 11:00:00+00', 10, 5, v_admin_id
    FROM public.employees e WHERE e.email = 'r.garcia@DevTeamHub.com';

    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, completed_at, points, penalty_points, assigned_by)
    SELECT e.id, 'Update Training Materials', 'Update orientation training materials for new hires.', 'normal', 'completed', '2026-02-19', '2026-02-19 13:00:00+00', 10, 5, v_admin_id
    FROM public.employees e WHERE e.email = 'j.martinez@DevTeamHub.com';

    INSERT INTO public.employee_tasks (employee_id, title, description, priority, status, deadline, completed_at, points, penalty_points, assigned_by)
    SELECT e.id, 'Staff Schedule Coordination', 'Coordinate next week staff schedule and coverage.', 'normal', 'completed', '2026-02-17', '2026-02-17 10:00:00+00', 10, 5, v_admin_id
    FROM public.employees e WHERE e.email = 'p.thomas@DevTeamHub.com';

    -- ============================================================================
    -- WARNINGS - All severities, all statuses
    -- ============================================================================
    
    -- Minor / Acknowledged
    INSERT INTO public.employee_warnings (employee_id, issued_by, reason, description, severity, status, acknowledged_at)
    SELECT e.id, v_admin_id, 'Excessive Tardiness', 'Employee has been late 5 times in the past month. Verbal warning issued.', 'minor', 'acknowledged', '2026-02-12 10:00:00+00'
    FROM public.employees e WHERE e.email = 'l.rodriguez@DevTeamHub.com';

    -- Moderate / Active
    INSERT INTO public.employee_warnings (employee_id, issued_by, reason, description, severity, status)
    SELECT e.id, v_admin_id, 'Missed Project Deadline', 'Failed to deliver the assigned project by the agreed-upon deadline without prior notice.', 'moderate', 'active'
    FROM public.employees e WHERE e.email = 'w.taylor@DevTeamHub.com';

    -- Major / Resolved
    INSERT INTO public.employee_warnings (employee_id, issued_by, reason, description, severity, status, resolution_notes, resolved_at)
    SELECT e.id, v_admin_id, 'Unauthorized System Access', 'Attempted to access restricted admin panel without authorization. Employee counseled and access privileges reviewed.',
      'major', 'resolved', 'Employee attended security training. Access protocols reviewed and updated. No further incidents.', '2026-02-15 14:00:00+00'
    FROM public.employees e WHERE e.email = 'k.walker@DevTeamHub.com';

    -- Critical / Appealed
    INSERT INTO public.employee_warnings (employee_id, issued_by, reason, description, severity, status)
    SELECT e.id, v_admin_id, 'Policy Violation - Data Handling', 'Sent sensitive employee data via unencrypted email. Employee has filed an appeal claiming it was accidental.',
      'critical', 'appealed'
    FROM public.employees e WHERE e.email = 'n.hall@DevTeamHub.com';

    -- Another minor / Active (for more variety)
    INSERT INTO public.employee_warnings (employee_id, issued_by, reason, description, severity, status)
    SELECT e.id, v_admin_id, 'Dress Code Violation', 'Repeated failure to follow office dress code policy.', 'minor', 'active'
    FROM public.employees e WHERE e.email = 'b.young@DevTeamHub.com';

    -- ============================================================================
    -- ANNOUNCEMENTS - All priorities, active/inactive/expired
    -- ============================================================================
    INSERT INTO public.announcements (title, content, priority, created_by, is_active, expires_at) VALUES
      ('Welcome to DevTeamHub 3.0', 'DevTeamHub has been updated with new features including payroll management, task tracking, employee complaints, and performance dashboards. Explore all the new capabilities!', 'high', v_admin_id, true, NULL),
      ('Office Closure Notice', 'The office will be closed on February 28th for annual maintenance. Please plan your work accordingly and ensure all pending tasks are completed before the closure.', 'urgent', v_admin_id, true, '2026-02-28 23:59:59+00'),
      ('New Health Benefits Package', 'We are pleased to announce improved health benefits starting March 2026. This includes dental coverage and extended mental health support. Details will be shared via email.', 'normal', v_admin_id, true, '2026-03-31 23:59:59+00'),
      ('Quarterly Town Hall Meeting', 'Join us for the Q1 town hall meeting on March 5th at 2:00 PM in the main conference hall. Topics include company performance, upcoming projects, and open Q&A.', 'low', v_admin_id, true, '2026-03-05 23:59:59+00'),
      ('Holiday Schedule Updated', 'The company holiday schedule for 2026 has been finalized. Please check the HR portal for the complete list of holidays and plan your leaves accordingly.', 'normal', v_admin_id, true, NULL),
      ('Old Parking Policy', 'Previous parking allocation policy - superseded by new policy.', 'low', v_admin_id, false, NULL),
      ('Expired: January Newsletter', 'Monthly newsletter for January 2026 with company updates and achievements.', 'normal', v_admin_id, true, '2026-01-31 23:59:59+00');

    -- ============================================================================
    -- ACTIVITY LOGS - Diverse entity types
    -- ============================================================================
    INSERT INTO public.activity_logs (user_id, action, entity_type, details) VALUES
      (v_admin_id, 'System initialized with comprehensive seed data', 'system', '{"version": "3.0", "date": "2026-02-19"}'::jsonb),
      (v_admin_id, 'Generated January 2026 payroll for all employees', 'payroll', '{"month": 1, "year": 2026, "count": 21}'::jsonb),
      (v_admin_id, 'Approved and paid January 2026 payroll', 'payroll', '{"month": 1, "year": 2026, "status": "paid"}'::jsonb),
      (v_admin_id, 'Generated February 2026 payroll draft', 'payroll', '{"month": 2, "year": 2026, "count": 21}'::jsonb),
      (v_admin_id, 'Issued warning to Karen Walker - Major severity', 'warning', '{"employee": "Karen Walker", "severity": "major"}'::jsonb);

    IF v_hr_id IS NOT NULL THEN
      INSERT INTO public.activity_logs (user_id, action, entity_type, details) VALUES
        (v_hr_id, 'Approved leave request for Emily Wilson - Sick leave', 'leave', '{"employee": "Emily Wilson", "type": "sick", "days": 2}'::jsonb),
        (v_hr_id, 'Approved leave request for David Brown - Casual leave', 'leave', '{"employee": "David Brown", "type": "casual", "days": 1}'::jsonb),
        (v_hr_id, 'Rejected leave request for Linda Rodriguez - Sick leave', 'leave', '{"employee": "Linda Rodriguez", "type": "sick"}'::jsonb),
        (v_hr_id, 'Reviewed complaint - Office Temperature Issues', 'complaint', '{"status": "under_review", "category": "workplace"}'::jsonb);
    END IF;
  END IF;
END $$;

-- ============================================================================
-- COMPLAINTS - All categories, statuses, priorities
-- ============================================================================
DO $$
DECLARE
  v_hr_id UUID;
  v_admin_id UUID;
BEGIN
  SELECT u.id INTO v_hr_id FROM public.users u WHERE u.role = 'hr' LIMIT 1;
  SELECT u.id INTO v_admin_id FROM public.users u WHERE u.role = 'admin' LIMIT 1;
  
  IF v_hr_id IS NOT NULL THEN
    -- Workplace / Under Review / Normal
    INSERT INTO public.employee_complaints (employee_id, subject, description, category, status, priority, assigned_to)
    SELECT e.id, 'Office Temperature Issues', 'The AC in our office area has not been working properly for the past 2 weeks. Temperature frequently exceeds comfortable levels.', 'workplace', 'under_review', 'normal', v_hr_id
    FROM public.employees e WHERE e.email = 'd.brown@DevTeamHub.com';

    -- Policy / Pending / Low
    INSERT INTO public.employee_complaints (employee_id, subject, description, category, status, priority)
    SELECT e.id, 'Parking Space Allocation', 'Request for review of parking allocation policy. Current system unfairly prioritizes seniority over need.', 'policy', 'pending', 'low'
    FROM public.employees e WHERE e.email = 'm.anderson@DevTeamHub.com';

    -- Safety / Pending / Urgent
    INSERT INTO public.employee_complaints (employee_id, subject, description, category, status, priority)
    SELECT e.id, 'Safety Concern - Emergency Exit', 'The emergency exit on 3rd floor is often blocked by storage boxes. This is a serious fire hazard.', 'safety', 'pending', 'urgent'
    FROM public.employees e WHERE e.email = 'b.scott@DevTeamHub.com';

    -- General / Resolved / Normal (with resolution)
    INSERT INTO public.employee_complaints (employee_id, subject, description, category, status, priority, assigned_to, resolved_by, resolved_at, resolution_notes)
    SELECT e.id, 'Printer Not Working', 'The shared printer on floor 2 has been out of order for a week.', 'general', 'resolved', 'normal', v_hr_id, v_admin_id, '2026-02-15 11:00:00+00',
      'New printer installed. Old unit sent for repair. Backup printer placed on floor 2.'
    FROM public.employees e WHERE e.email = 'c.green@DevTeamHub.com';

    -- Harassment / Pending / High
    INSERT INTO public.employee_complaints (employee_id, subject, description, category, status, priority, assigned_to)
    SELECT e.id, 'Inappropriate Comments by Colleague', 'A colleague has been making repeated inappropriate comments during meetings. This has been ongoing for 3 weeks.', 'harassment', 'pending', 'high', v_hr_id
    FROM public.employees e WHERE e.email = 'b.young@DevTeamHub.com';

    -- Other / Dismissed / Low
    INSERT INTO public.employee_complaints (employee_id, subject, description, category, status, priority, resolved_by, resolved_at, resolution_notes)
    SELECT e.id, 'Cafeteria Food Quality', 'The quality of food in the cafeteria has declined significantly.', 'other', 'dismissed', 'low', v_hr_id, '2026-02-10 09:00:00+00',
      'Cafeteria is managed by external vendor. Feedback passed to vendor management. Not within HR purview.'
    FROM public.employees e WHERE e.email = 'r.nelson@DevTeamHub.com';

    -- Staff user complaint (so staff can see their own)
    INSERT INTO public.employee_complaints (employee_id, subject, description, category, status, priority)
    SELECT e.id, 'Software License Request', 'Need access to data analysis software for project work. Current free tools are insufficient.', 'policy', 'pending', 'normal'
    FROM public.employees e WHERE e.email = 'tvissam96@gmail.com';
  END IF;
END $$;

-- ============================================================================
-- NOTIFICATIONS - Sample for each type for all 3 auth users
-- ============================================================================
DO $$
DECLARE
  v_admin_uid UUID;
  v_hr_uid UUID;
  v_staff_uid UUID;
BEGIN
  SELECT u.id INTO v_admin_uid FROM public.users u WHERE u.role = 'admin' LIMIT 1;
  SELECT u.id INTO v_hr_uid FROM public.users u WHERE u.role = 'hr' LIMIT 1;
  SELECT u.id INTO v_staff_uid FROM public.users u WHERE u.role = 'staff' LIMIT 1;

  IF v_admin_uid IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, is_read, created_at) VALUES
      -- Admin notifications
      (v_admin_uid, 'New Leave Request', 'Michael Davis has submitted a leave request for Feb 22-26.', 'leave', false, now() - interval '1 hour'),
      (v_admin_uid, 'Payroll Generated', 'February 2026 payroll draft has been generated for 21 employees.', 'system', false, now() - interval '2 hours'),
      (v_admin_uid, 'New Complaint Filed', 'A new safety complaint has been filed regarding emergency exits.', 'complaint', false, now() - interval '4 hours'),
      (v_admin_uid, 'Task Overdue', 'Karen Walker has an overdue task: Submit Research Proposal.', 'task', true, now() - interval '1 day'),
      (v_admin_uid, 'Performance Alert', 'Weekly performance scores calculated. 2 employees below threshold.', 'performance', true, now() - interval '2 days'),
      (v_admin_uid, 'Warning Issued', 'Warning issued to Nancy Hall for policy violation - data handling.', 'warning', true, now() - interval '3 days'),
      -- HR notifications
      (v_hr_uid, 'Leave Approved', 'Emily Wilson sick leave (Feb 10-11) has been processed.', 'leave', true, now() - interval '5 hours'),
      (v_hr_uid, 'New Complaint', 'Betty Young has filed a harassment complaint requiring immediate attention.', 'complaint', false, now() - interval '3 hours'),
      (v_hr_uid, 'Attendance Alert', 'Linda Rodriguez has been late 5 times this month.', 'attendance', false, now() - interval '6 hours'),
      (v_hr_uid, 'Payroll Ready for Review', 'February 2026 payroll records are ready for approval.', 'system', false, now() - interval '1 day'),
      (v_hr_uid, 'New Leave Request', 'Sabbatical leave request from James Lee requires review.', 'leave', false, now() - interval '4 hours'),
      -- Staff notifications
      (v_staff_uid, 'Task Assigned', 'You have been assigned a new task: Complete Q1 Performance Review.', 'task', false, now() - interval '2 hours'),
      (v_staff_uid, 'Task Assigned', 'New task: Database Migration Planning - urgent priority.', 'task', false, now() - interval '1 day'),
      (v_staff_uid, 'Leave Status', 'Your annual leave request (Feb 22-26) is pending approval.', 'leave', true, now() - interval '3 hours'),
      (v_staff_uid, 'Performance Update', 'Your weekly performance score has been calculated: 55 points.', 'performance', false, now() - interval '1 day'),
      (v_staff_uid, 'System Update', 'DevTeamHub has been updated to version 3.0 with new features.', 'system', true, now() - interval '5 days');
  END IF;
END $$;

-- ============================================================================
-- PERFORMANCE & EMPLOYEE OF THE WEEK
-- Automatically calculated based on attendance, tasks, and warnings
-- ============================================================================

-- Calculate weekly performance and select Employee of the Week automatically
DO $$
DECLARE
  v_current_week DATE := (date_trunc('week', CURRENT_DATE))::DATE;
  v_last_week DATE := (date_trunc('week', CURRENT_DATE) - INTERVAL '7 days')::DATE;
BEGIN
  PERFORM select_employee_of_week(v_last_week);
  PERFORM select_employee_of_week(v_current_week);
END $$;

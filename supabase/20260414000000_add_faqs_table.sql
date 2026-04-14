-- =============================================
-- FAQ MANAGEMENT SYSTEM
-- =============================================

-- Create faqs table
CREATE TABLE IF NOT EXISTS public.faqs (
  id                 UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  question           TEXT          NOT NULL,
  answer             TEXT          NOT NULL,  -- Supports markdown
  category           TEXT          NOT NULL,  -- 'general', 'leaves', 'attendance', 'employees', 'settings'
  visible_to         TEXT[]        NOT NULL DEFAULT ARRAY['staff', 'hr', 'admin'],  -- Array of roles
  faq_order          INT           NOT NULL DEFAULT 0,  -- For sorting within category
  is_active          BOOLEAN       NOT NULL DEFAULT true,
  created_by         UUID          NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_by         UUID          REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Add comment for table
COMMENT ON TABLE public.faqs IS 'Frequently Asked Questions with role-based visibility for admin, hr, and staff users';
COMMENT ON COLUMN public.faqs.visible_to IS 'Array of user roles who can see this FAQ: e.g., [''staff'', ''hr'', ''admin'']';
COMMENT ON COLUMN public.faqs.faq_order IS 'Display order within category (ascending)';

-- Create indexes for faster queries
CREATE INDEX idx_faqs_category ON public.faqs(category) WHERE is_active = true;
CREATE INDEX idx_faqs_active ON public.faqs(is_active);
CREATE INDEX idx_faqs_created_by ON public.faqs(created_by);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT - Users can see FAQs where their role is in visible_to array
CREATE POLICY "faq_select_by_role" ON public.faqs
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND visible_to @> ARRAY[(SELECT role FROM public.users WHERE id = auth.uid()) :: TEXT]
  );

-- Policy 2: INSERT - Only admin can create FAQs
CREATE POLICY "faq_insert_admin_only" ON public.faqs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    AND created_by = auth.uid()
  );

-- Policy 3: UPDATE - Only admin can update FAQs (only their own or any as admin)
CREATE POLICY "faq_update_admin_only" ON public.faqs
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    AND updated_by = auth.uid()
  );

-- Policy 4: DELETE - Only admin can delete FAQs
CREATE POLICY "faq_delete_admin_only" ON public.faqs
  FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- =============================================
-- SEED INITIAL FAQs
-- =============================================

INSERT INTO public.faqs (question, answer, category, visible_to, faq_order, created_by) VALUES
-- General FAQs (all roles)
(
  'What is the Employee Management System?',
  'The Employee Management System (EMS) is a comprehensive platform for managing employee data, leave requests, attendance tracking, performance management, and more. It helps streamline HR operations and enables employees to manage their work-related information.',
  'general',
  ARRAY['staff', 'hr', 'admin'],
  1,
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'How do I reset my password?',
  'You can reset your password by clicking the "Forgot Password" link on the login page. Enter your email address and follow the instructions sent to your email to set a new password. The reset link expires after 24 hours.',
  'general',
  ARRAY['staff', 'hr', 'admin'],
  2,
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'How do I update my profile information?',
  'Navigate to **Settings** → **Profile** to view and edit your personal information. You can update your name, contact details, and profile photo. Click "Save" to confirm changes.',
  'settings',
  ARRAY['staff', 'hr', 'admin'],
  1,
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'Where can I see my notifications?',
  'Notifications appear in the **Notification Center** (bell icon in the top navigation). You can view, mark as read, or delete notifications. Enable notifications in your browser for push alerts.',
  'general',
  ARRAY['staff', 'hr', 'admin'],
  3,
  (SELECT id FROM auth.users LIMIT 1)
),

-- Leave Management FAQs (staff, hr, admin)
(
  'How do I apply for leave?',
  'To apply for leave:\n1. Go to **Leaves** from the sidebar\n2. Click **Apply Leave**\n3. Select leave type (sick, casual, annual, etc.)\n4. Choose start and end dates\n5. Add any comments (optional)\n6. Click **Submit**\n\nYour manager will review and approve/reject within 2-3 business days.',
  'leaves',
  ARRAY['staff', 'hr', 'admin'],
  1,
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'Can I cancel a leave request after applying?',
  'Yes, you can cancel a pending leave request. Go to **Leaves**, find your request with **Pending** status, and click **Cancel**. Note: You cannot cancel approved or rejected requests.',
  'leaves',
  ARRAY['staff', 'hr', 'admin'],
  2,
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'What is the leave approval process?',
  'Leave requests go through these statuses:\n- **Pending**: Waiting for manager review\n- **Approved**: Manager approved, leave confirmed\n- **Rejected**: Manager denied the request\n\nStaff typically hear back within 2-3 business days. HR and Managers can expedite approvals.',
  'leaves',
  ARRAY['staff', 'hr', 'admin'],
  3,
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'How many leave days do I have?',
  'Check your leave balance in the **Leave Balance** section on **Leaves** page. It shows:\n- Annual leave balance\n- Sick leave balance\n- Other leave types\n\nYour balance resets on January 1st each year.',
  'leaves',
  ARRAY['staff', 'hr', 'admin'],
  4,
  (SELECT id FROM auth.users LIMIT 1)
),

-- Attendance FAQs (staff, hr, admin)
(
  'How do I mark my attendance?',
  'You can mark attendance in two ways:\n1. **Quick Mark**: Click **Mark Attendance** on Dashboard\n2. **Attendance Page**: Go to **Attendance** → **Mark Now**\n\nAttendance must be marked between 8:00 AM and 11:59 PM. Early/late markers are tracked.',
  'attendance',
  ARRAY['staff', 'hr', 'admin'],
  1,
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'What if I forget to mark attendance?',
  'If you forget to mark attendance:\n1. Go to **Attendance** → **Request Correction**\n2. Select the date and provide a reason\n3. Submit for manager review\n\nManagers can approve corrections within 48 hours. Repeated missed marks may affect your record.',
  'attendance',
  ARRAY['staff', 'hr', 'admin'],
  2,
  (SELECT id FROM auth.users LIMIT 1)
),

-- Employee Management FAQs (hr, admin only)
(
  'How do I add a new employee?',
  'To add a new employee (HR/Admin only):\n1. Go to **Employees** → **Add Employee**\n2. Fill in employee details (name, email, position, department, etc.)\n3. Set user role (staff, hr, admin)\n4. Click **Create**\n\nThe employee will receive an invitation email to set up their account.',
  'employees',
  ARRAY['hr', 'admin'],
  1,
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'How do I edit employee information?',
  'To edit employee details:\n1. Go to **Employees**\n2. Find the employee and click their name\n3. Click **Edit** button\n4. Update information as needed\n5. Click **Save**\n\nChanges are logged for audit purposes.',
  'employees',
  ARRAY['hr', 'admin'],
  2,
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'Can I deactivate an employee without deleting them?',
  'Yes, you should **deactivate** rather than delete employees:\n1. Go to **Employees** → find employee\n2. Click **Deactivate**\n3. Deactivated employees cannot log in but their records remain (audit trail)\n4. To reactivate: Click **Activate** on deactivated employee profile',
  'employees',
  ARRAY['hr', 'admin'],
  3,
  (SELECT id FROM auth.users LIMIT 1)
),

-- Admin-only FAQs
(
  'How do I manage FAQs?',
  'To manage FAQs (admin only):\n1. Go to **Settings** → **Help & FAQ Management**\n2. View all FAQs\n3. Click **Edit** to modify\n4. Click **Delete** to remove\n5. Click **Create New** to add FAQ\n\nYou can control which roles see each FAQ (staff/hr/admin).',
  'settings',
  ARRAY['admin'],
  2,
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'How do I manage user roles and permissions?',
  'User role management is in **Settings** → **User Management** (admin only):\n- **Staff**: Regular employees with basic access\n- **HR**: Can manage employees, approve leaves, view reports\n- **Admin**: Full access to all features and settings\n\nAssign roles when creating employees or edit existing user roles in User Management.',
  'employees',
  ARRAY['admin'],
  4,
  (SELECT id FROM auth.users LIMIT 1)
);

-- Update timestamps trigger (optional, creates audit trail)
CREATE OR REPLACE FUNCTION public.update_faqs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER faqs_updated_at_trigger
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_faqs_updated_at();

GRANT SELECT ON public.faqs TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.faqs TO authenticated;

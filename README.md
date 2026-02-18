# StaffHub — Al-Mustaqbal Group

A modern, production-ready **HR & Staff Management System** built with React, TypeScript, and Supabase — featuring role-based access, bilingual support (English/Arabic with RTL), real-time notifications, and passkey authentication.

---

## Features

### Core Modules
- **Dashboard** — Real-time statistics, department/leave charts, quick actions, recent activity feed, announcements widget
- **Employee Management** — Full directory with search, filtering, photo upload, detailed profiles, emergency contacts, education history
- **Department Management** — Create/edit departments, assign heads, track employee count per department
- **Leave Management** — Apply for leave, approval workflows (admin/HR), leave balance tracking per year, status filtering
- **Attendance** — Manual check-in/out, passkey-based biometric attendance, daily records with hours calculation
- **Payroll** — Monthly payroll generation, bonuses & deductions management, PDF payslip export
- **Reports** — Pre-built report templates (employee, leave, attendance, department, payroll), custom date-range reports, CSV export
- **Announcements** — Create/manage company-wide announcements with priority levels, dashboard widget

### Platform Features
- **Role-Based Access Control** — Three roles with granular permissions
- **Bilingual (EN/AR)** — Full English & Arabic support with automatic RTL layout
- **Passkey Authentication** — WebAuthn/FIDO2 login via Windows Hello, Face ID, or fingerprint
- **Real-Time Notifications** — In-app notification center with email notification support
- **Activity Logging** — Full audit trail of user actions across the system
- **Photo Upload** — Employee profile photos with Supabase Storage
- **Responsive Design** — Collapsible sidebar, mobile-friendly layout

---

## User Roles

| Role | Access |
|------|--------|
| **Admin** | Full system access — employee/department/user management, payroll, reports, announcements, settings |
| **HR** | Employee & department management, leave approvals, attendance, payroll, reports, announcements |
| **Staff** | Own profile, leave applications, attendance check-in/out, payslips, settings |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS, Vite |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions, Realtime, Storage) |
| Auth | Supabase Auth + WebAuthn/SimpleWebAuthn (passkeys) |
| i18n | react-i18next (English & Arabic) |
| Charts | Recharts |
| PDF | jsPDF + jspdf-autotable |
| Icons | Lucide React |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project with the migration applied

### Installation

```bash
# Clone the repository
git clone https://github.com/Anas43xq/EmployeeManagementSystem.git
cd EmployeeManagementSystem/project

# Install dependencies
npm install

# Set up environment variables
# Create a .env file with:
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Start development server
npm run dev
```

### Database Setup

Apply the migration to your Supabase project:

```bash
npx supabase db reset --linked
```

This creates all tables, RLS policies, triggers, seed data, and demo accounts.

### Deploy Edge Functions

```bash
npx supabase functions deploy webauthn-register --no-verify-jwt
npx supabase functions deploy webauthn-authenticate --no-verify-jwt
npx supabase functions deploy verify-passkey-attendance --no-verify-jwt
npx supabase functions deploy send-notification-email --no-verify-jwt
npx supabase functions deploy generate-monthly-payroll --no-verify-jwt
```

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@staffhub.com | admin123 |
| HR | hr@staffhub.com | hr123 |
| Staff | employee@staffhub.com | emp123 |

---

## Project Structure

```
src/
├── components/       # Shared UI components (Layout, Login, modals, etc.)
│   └── ui/           # Reusable primitives (Button, Card, Modal, etc.)
├── contexts/         # React contexts (Auth, Notifications)
├── hooks/            # Custom hooks (activity logger, form modal)
├── i18n/             # Translation files (en.json, ar.json)
├── lib/              # Utilities (Supabase client, types, queries, passkeys)
└── pages/            # Page modules
    ├── Dashboard/
    ├── Attendance/
    ├── Leaves/
    ├── Departments/
    ├── EmployeeEdit/
    ├── Announcements/
    ├── Reports/
    ├── Settings/
    ├── UserManagement/
    └── ...
supabase/
├── functions/        # Edge Functions (WebAuthn, email, payroll)
└── migrations/       # Database schema + seed data
```

---

## Deployment

1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
4. Deploy — Vercel auto-builds on push

---

## License

This project is private and proprietary to Al-Mustaqbal Group.

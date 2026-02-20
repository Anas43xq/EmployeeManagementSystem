<p align="center">
  <h1 align="center">StaffHub</h1>
  <p align="center">
    <strong>Employee Management System</strong>
    <br />
    <em>Senior Project - Al-Mustaqbal Group</em>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.x-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Vite-Build-646CFF?logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/Vercel-Deployed-000000?logo=vercel" alt="Vercel" />
</p>

---

## What is this?

StaffHub is an HR management system I built for my senior project at Al-Mustaqbal Group. The idea behind it was to create something that could actually be used in a real company - not just a demo. It handles everything from hiring employees and tracking their attendance to generating payroll and exporting payslips as PDFs.

I went with **React + TypeScript** on the frontend and **Supabase** for the backend (Postgres database, auth, edge functions, storage). The whole thing supports both English and Arabic with RTL layout flipping, has three user roles with proper access control, and even supports biometric login through WebAuthn (like Windows Hello or Face ID).

---

## Contents

- [Features](#features)
- [Tech Used](#tech-used)
- [How It's Built](#how-its-built)
- [Roles & Access](#roles--access)
- [Setup](#setup)
- [DB Tables](#db-tables)
- [Folder Structure](#folder-structure)
- [Edge Functions](#edge-functions)
- [Deploying](#deploying)
- [Test Accounts](#test-accounts)
- [License](#license)

---

## Features

Here's what the system can do, broken down by module:

**Dashboard** - Shows stats at a glance: employee count, department breakdown (pie chart), leave requests chart, who's employee of the week, recent announcements, and some quick action buttons.

**Employees** - The main directory. You can search, filter, add new employees, edit existing ones, view their full profile, or terminate them. Each employee record has personal info, salary details, emergency contacts, qualifications, and a photo.

**Departments** - Pretty straightforward. Create departments, assign a head, see how many people are in each one.

**Leaves** - Employees submit leave requests (annual, sick, casual, or sabbatical). HR and admins can approve or reject them. The system tracks balances per year so you know how many days someone has left.

**Attendance** - Two ways to clock in: manual button or biometric via passkey. Records show up with status (present, late, absent, half-day) and the system calculates total hours worked.

**Tasks** - Admins and HR assign tasks to employees with priority levels and deadlines. Tasks have a point system tied to the performance score. Statuses go from pending through in-progress to completed (or overdue/cancelled).

**Warnings** - For disciplinary stuff. Four severity levels (minor to critical). Employees can acknowledge or appeal. Warnings factor into the weekly performance calculation.

**Complaints** - Employees can file complaints under different categories (workplace, policy, safety, harassment, etc.). HR gets assigned to handle them and there's a full resolution flow.

**Payroll** - This one was tricky to build. Admins generate payroll for a given month, records start as drafts, then get approved, then marked as paid. You can add bonuses (allowance, performance, overtime) and deductions (tax, insurance, penalties). Each payslip can be exported as a PDF.

**Announcements** - Company-wide posts with priority levels. Can be toggled active/inactive and have expiry dates.

**Reports** - Generate reports with date ranges and filters. Export to CSV.

**User Management** - Only admins can access this. Create system accounts, assign roles, ban/unban users (with optional duration), reset passwords.

**Settings** - Personal stuff: change your password, update email, switch language, toggle notification preferences.

### Other things worth mentioning

- **RLS everywhere** - Every table has Row Level Security policies. Staff can only see their own data, HR sees more, admins see everything. This is enforced at the database level, not just the UI.
- **Bilingual** - Full Arabic translation with RTL layout. I used react-i18next for this. Switching languages flips the entire interface direction.
- **Passkeys** - WebAuthn/FIDO2 support. Employees can register a biometric credential and use it to log in or check attendance. Built with SimpleWebAuthn.
- **Notifications** - In-app notification bell with unread count. Also sends emails through an SMTP edge function when something important happens (leave approved, warning issued, etc.).
- **Activity Logs** - Everything gets logged. Login, logout, creating records, updating them. Full audit trail.
- **Performance System** - Calculates a weekly score for each employee based on attendance, tasks completed, and warnings received. The top scorer automatically becomes "Employee of the Week."
- **Responsive** - Works on mobile. The sidebar collapses into a hamburger menu.

---

## Tech Used

| What | Stack |
|------|-------|
| Frontend | React 18, TypeScript 5, Tailwind CSS, Vite |
| Backend | Supabase - PostgreSQL 15, GoTrue Auth, Edge Functions, Realtime, Storage |
| Auth | Supabase Auth + WebAuthn (SimpleWebAuthn library) |
| DB Security | Row Level Security with role-based policies |
| Serverless | 6 Deno-based Edge Functions on Supabase |
| i18n | react-i18next for English + Arabic (RTL) |
| Charts | Recharts |
| PDF | jsPDF + jspdf-autotable + html2canvas |
| Icons | Lucide React |
| Emails | Nodemailer through a Supabase Edge Function |
| Hosting | Vercel for the frontend, Supabase Cloud for everything else |

---

## How It's Built

```
+---------------------------------------------------------+
|                   Frontend (Vercel)                      |
|         React 18 + TypeScript + Tailwind CSS            |
|                                                         |
|  +--------+ +--------+ +------+ +---------------+       |
|  |  Auth  | | Pages  | | i18n | |  Notification |       |
|  |Context | |(18 mod)| |EN/AR | |    Context    |       |
|  +---+----+ +---+----+ +------+ +-------+-------+       |
|      |          |                        |              |
|      +----------+------------------------+              |
|                         |                               |
+---------------------------------------------------------+
                          | HTTPS / WebSocket
+---------------------------------------------------------+
|                  Supabase Cloud                          |
|                                                         |
|  +----------+  +--------------+  +---------------+      |
|  |PostgreSQL|  |Edge Functions|  |   Storage     |      |
|  |  + RLS   |  |  (6 Deno)   |  |  (Photos)     |      |
|  | 19 tables|  |             |  |               |      |
|  +----------+  +--------------+  +---------------+      |
|  +----------+  +--------------+                         |
|  |  Auth    |  |  Realtime   |                         |
|  | (GoTrue) |  | (WebSocket) |                         |
|  +----------+  +--------------+                         |
+---------------------------------------------------------+
```

The frontend is a React SPA hosted on Vercel. It talks to Supabase over HTTPS for regular queries and WebSocket for realtime stuff (notifications). Auth is handled by Supabase's GoTrue with JWT tokens. Edge functions run on Deno for things that need server-side logic (payroll math, user management, email sending, WebAuthn ceremony handling).

---

## Roles & Access

There are three roles. Here's what each one can do:

| Feature | Admin | HR | Staff |
|---------|:-----:|:--:|:-----:|
| Dashboard | Full | Full | Limited (own stats) |
| Employees | CRUD | CRUD | View own profile |
| Departments | CRUD | CRUD | View only |
| Leaves | Approve/Reject | Approve/Reject | Submit requests |
| Attendance | View all records | View all + mark | Clock in/out |
| Tasks | Create & assign | Create & assign | See own tasks |
| Warnings | Issue & resolve | Issue & resolve | See own warnings |
| Complaints | View & resolve | View & resolve | File & track own |
| Payroll | Full control | View only | See own payslip |
| Announcements | CRUD | CRUD | Read only |
| Reports | Generate any | Generate any | No access |
| User Management | Full | No access | No access |
| Settings | Everything | Limited | Limited |

---

## Setup

You'll need **Node.js 18+**, a **Supabase project**, and **Git**.

### Clone & install

```bash
git clone https://github.com/Anas43xq/EmployeeManagementSystem.git
cd EmployeeManagementSystem/project
npm install
```

### Configure environment

```bash
cp .env.example .env
```

Then fill in your Supabase URL and anon key:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Set up the database

This runs the migration which creates all 19 tables, RLS policies, triggers, functions, and loads seed data:

```bash
npx supabase db reset --linked
```

### Deploy the edge functions

```bash
npx supabase functions deploy --project-ref YOUR_PROJECT_REF --no-verify-jwt
```

That pushes all 6 functions:
- `generate-monthly-payroll` - handles payroll generation, approval, and net salary calculation
- `manage-user-status` - ban, unban, activate, deactivate accounts
- `send-notification-email` - sends emails via SMTP
- `webauthn-register` - registers a new passkey for a user
- `webauthn-authenticate` - authenticates with an existing passkey
- `verify-passkey-attendance` - verifies passkey specifically for attendance check-in

### Run it

```bash
npm run dev
```

---

## DB Tables

19 tables total, all with RLS policies:

| Table | What it stores |
|-------|---------------|
| `departments` | Departments and their assigned heads |
| `employees` | All employee info - personal details, salary, qualifications, status |
| `users` | System accounts linked to auth.users and to an employee record |
| `leaves` | Leave requests with type, dates, status, and who approved/rejected |
| `leave_balances` | How many leave days each employee has left, tracked per year |
| `attendance` | Daily check-in/out records with status and which method was used |
| `passkeys` | Stored WebAuthn credentials for biometric login |
| `payrolls` | Monthly payroll - base salary, total bonuses, total deductions, net pay |
| `bonuses` | Individual bonus entries (allowance, performance, overtime) |
| `deductions` | Individual deduction entries (tax, insurance, penalty) |
| `employee_tasks` | Tasks with priority, deadline, points, and current status |
| `employee_warnings` | Warnings with severity level and resolution status |
| `employee_complaints` | Complaints with category, priority, and resolution details |
| `announcements` | Company announcements with priority and optional expiry |
| `notifications` | Per-user notifications shown in the bell icon |
| `activity_logs` | Audit log - who did what and when |
| `user_preferences` | Language, theme, notification toggles per user |
| `employee_performance` | Weekly calculated scores based on attendance + tasks - warnings |
| `employee_of_week` | Whoever scored highest that week |

### Seed data included

The migration populates the DB with realistic test data so you can try every feature right away:

- 22 employees (20 active, 1 inactive, 1 on-leave) spread across departments
- 3 working user accounts (admin, HR, and a regular staff member)
- 9 leave requests in different states
- 138 attendance records with a mix of statuses and methods
- 40 payroll records - January already paid, February in draft/approved
- 13 tasks across all statuses and priority levels
- 5 warnings at different severities
- 7 complaints under various categories
- 7 announcements (some active, some expired)
- 16 notifications split between the 3 users
- 9 activity log entries
- Pre-calculated performance scores and employee of the week picks

---

## Folder Structure

```
project/
+-- src/
|   +-- components/          # Shared components (Layout, Login, etc.)
|   |   +-- ui/              # Small reusable pieces (Button, Card, Modal...)
|   +-- contexts/            # AuthContext and NotificationContext
|   +-- hooks/               # useFormModal, useActivityLogger
|   +-- i18n/                # en.json and ar.json translation files
|   +-- lib/                 # Supabase client, DB queries, types, helpers
|   +-- pages/
|       +-- Announcements/
|       +-- Attendance/
|       +-- Complaints/
|       +-- Dashboard/
|       +-- Departments/
|       +-- EmployeeEdit/
|       +-- Leaves/
|       +-- Reports/
|       +-- Settings/
|       +-- Tasks/
|       +-- UserManagement/
|       +-- Warnings/
+-- supabase/
|   +-- functions/           # The 6 Deno edge functions
|   +-- migrations/          # SQL migration with schema + seed
+-- public/
+-- docs/                    # ERD diagram, use cases, RLS docs
+-- package.json
```

Each page module (like Attendance/ or Tasks/) follows the same pattern: an index.tsx for the main page, a types.ts, a custom hook (useAttendance.ts, etc.), and component files for cards/modals.

---

## Edge Functions

| Function | Method | Who can call it | What it does |
|----------|--------|----------------|--------------|
| `generate-monthly-payroll` | POST | Admin or HR | Generates payroll records, approves drafts, calculates net salary |
| `manage-user-status` | POST | Admin only | Bans, unbans, activates, or deactivates a user account |
| `send-notification-email` | POST | Internal/system | Sends an email notification via SMTP |
| `webauthn-register` | POST | Any logged-in user | Registers a new biometric passkey |
| `webauthn-authenticate` | POST | Anyone | Logs in using a registered passkey |
| `verify-passkey-attendance` | POST | Anyone | Marks attendance using biometric verification |

All functions are deployed with `--no-verify-jwt` because they handle their own auth internally (they pull the JWT from the Authorization header and verify it through Supabase's `getUser()`).

---

## Deploying

### Frontend on Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Add these env vars: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
4. Hit deploy. After that, every push to main auto-deploys.

### Backend on Supabase

The database is managed through migrations. Edge functions get deployed via the CLI. Employee photos go in a storage bucket called `employee-photos`. If you want email notifications to work, you'll need to set SMTP secrets in your Supabase project settings.

---

## Test Accounts

These are pre-seeded and ready to use after running the migration:

| Role | Email | Password |
|------|-------|----------|
| Admin | anas.essam.work@gmail.com | admin123 |
| HR | essamanas86@gmail.com | Hr1234 |
| Staff | tvissam96@gmail.com | emp123 |

Log in with any of these to explore the system from different permission levels.

---

## License

Built as a senior graduation project at **Al-Mustaqbal University** for Al-Mustaqbal Group.

---

<p align="center">
  <sub>React + TypeScript + Supabase</sub>
</p>
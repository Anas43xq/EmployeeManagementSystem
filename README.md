# DevTeam Hub 💼

**Employee Management for IT Teams**

*Making HR actually work for software companies*

![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript) ![Supabase](https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase) ![Tailwind](https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss) ![Vite](https://img.shields.io/badge/Vite-Build-646CFF?logo=vite) ![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?logo=vercel)

---

## What's this about?

So I built DevTeam Hub because honestly, most HR systems suck for tech teams. They're either too bloated with features you don't need, or they're missing the basics that actually matter when you're managing developers, designers, and IT folks.

This thing handles all the usual stuff - employee records, time tracking, payroll, performance reviews - but it's designed specifically with tech companies in mind. Plus it's got some pretty cool features like biometric login (WebAuthn/passkeys) and a smart employee scoring system that actually makes sense.

Built with React and TypeScript on the frontend, Supabase handling the backend. It's bilingual (English/Arabic) and has proper role-based permissions.

---

## What's inside

- [The good stuff](#features)
- [Tech stack](#what-tech)
- [How it works](#architecture) 
- [Who can do what](#permissions)
- [Getting it running](#setup)
- [Database stuff](#tables)
- [Code structure](#folders)
- [Serverless functions](#functions)
- [Going live](#deployment)
- [Demo accounts](#test-logins)

---

## Features

### The main modules:

**Dashboard** - Clean overview with charts, stats, and announcements. Shows employee of the week (which is actually based on data, not favoritism).

**Employee Management** - Standard CRUD operations but with photo uploads, advanced search, proper filtering. Nothing fancy, just works well.

**Attendance Tracking** - Manual check-in/out with date selection. Admins and HR can add attendance records for any employee.

**Leave Management** - Complete workflow from request to approval. Tracks balances automatically. No more spreadsheet mess.

**Task Assignment** - Priority-based task management with a point system. Integrates with the performance scoring.

**Payroll System** - Monthly payroll generation with bonuses, deductions, the works. Exports to PDF. 

**Warnings & Complaints** - Because sometimes you need a paper trail. Proper escalation flows.

**Reporting** - Export anything to CSV. Date filters, role filters, whatever you need.

- **WebAuthn Authentication** - Passkey login is surprisingly smooth once you try it
- **Smart Performance Scoring** - Weekly calculations based on attendance + completed tasks - warnings received. Totally transparent algorithm.
- **Bilingual Support** - English and Arabic with proper RTL layouts (learned this the hard way)
- **Real-time Notifications** - In-app alerts plus email notifications
- **Mobile Responsive** - Works on phones, though honestly most HR stuff is better on desktop
- **Complete Audit Trail** - Every action gets logged. Compliance teams love this.

---

## Point System (This is kinda clever)

I implemented this automated weekly scoring system that picks "Employee of the Week" based on actual metrics instead of who brought donuts.

**The math:**
```
Weekly Score = Attendance Points + Task Points - Warning Penalties
```

**How points work:**
- Show up on time: +10 points
- Come in late: +5 points (at least you showed up)
- Half day: +5 points
- No show: 0 points (obviously)

**Task completion:**
- Critical priority: +20 points
- High priority: +15 points  
- Medium: +10 points
- Low priority: +5 points

**Warnings (yeah, these hurt):**
- Critical warning: -50 points
- Major: -35 points
- Moderate: -20 points
- Minor: -10 points

Staff can see their running total in the navbar. It's gamified without being stupid about it.

---

## What Tech

| Component | What I used |
|-----------|-------------|
| Frontend | React 18 + TypeScript 5 + Tailwind CSS + Vite |
| Backend | Supabase (PostgreSQL 15, Auth, Edge Functions, Realtime, Storage) |
| Authentication | Supabase Auth + WebAuthn via SimpleWebAuthn |
| Database Security | Row Level Security with proper policies |
| Serverless | 6 Deno functions running on Supabase Edge Runtime |
| Internationalization | react-i18next (English + Arabic RTL) |
| Charts | Recharts (simple and lightweight) |
| PDFs | jsPDF + autotable plugin |
| Icons | Lucide React (cleanest icon set IMO) |
| Email | Nodemailer through Supabase function |
| Deployment | Vercel for frontend, Supabase Cloud for everything else |

---

## Architecture

```
Frontend (React SPA on Vercel)
├── Auth Context (JWT tokens)  
├── 18 page modules
├── i18n support (EN/AR)
└── Notification system
          │
          │ HTTPS / WebSocket
          ▼
Supabase Cloud
├── PostgreSQL (19 tables + RLS)
├── Edge Functions (6 Deno functions) 
├── Storage (employee photos)
├── Auth (GoTrue)
└── Realtime (WebSocket notifications)
```

Pretty standard setup. React talks to Supabase over HTTPS for regular stuff, WebSocket for real-time notifications. JWT tokens handle auth. The edge functions run server-side logic for things like payroll calculations and WebAuthn ceremonies.

Nothing revolutionary, just solid architecture choices.

---

## Permissions

Three roles, different access levels:

| What they can do | Admin | HR | Staff |
|------------------|:-----:|:--:|:-----:|
| Dashboard | Everything | Everything | Just their own stats |
| Employee management | Full CRUD | Full CRUD | View own profile only |
| Departments | Full CRUD | Full CRUD | Read-only |
| Leave requests | Approve/reject | Approve/reject | Submit and track own |
| Attendance | View everyone | View all + manual entry | Clock in/out only |
| Task management | Create & assign | Create & assign | View own tasks |
| Warnings | Issue & resolve | Issue & resolve | View own warnings |
| Complaints | View & resolve all | View & resolve all | File and track own |
| Payroll | Complete control | View-only access | See own payslip |
| Announcements | Full CRUD | Full CRUD | Read-only |
| Reports | Generate anything | Generate anything | No access |
| User management | Everything | No access | No access |
| System settings | Everything | Limited access | Basic preferences |

Makes sense, right? Staff get what they need, HR gets operational control, admins get the keys to the kingdom.

---

## Setup

You'll need Node.js 18+ and a Supabase account. That's it.

### Get the code

```bash
git clone https://github.com/your-username/devteam-hub.git
cd devteam-hub
npm install
```

### Environment setup

```bash
cp .env.example .env
```

Fill in your Supabase details:

```env
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Database setup

This creates all the tables, policies, triggers, and loads demo data:

```bash
npx supabase db reset --linked
```

### Deploy the functions

```bash
npx supabase functions deploy --project-ref YOUR_PROJECT_REF --no-verify-jwt
```

This pushes 5 functions:
- `generate-monthly-payroll` - payroll calculations and approval
- `manage-user-status` - user account management 
- `send-notification-email` - SMTP email sending
- `webauthn-register` - passkey registration
- `webauthn-authenticate` - passkey login

### Fire it up

```bash
npm run dev
```

Should open on `localhost:5173`. The demo data includes 3 test accounts you can use right away.

---

## Tables

19 tables with proper RLS policies on everything:

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

## Test Logins

Pre-configured accounts for testing:

| Role | Email | Password |
|------|-------|----------|
| Admin | anas.essam.work@gmail.com | admin123 |
| HR | essamanas86@gmail.com | Hr1234 |  
| Staff | tvissam96@gmail.com | emp123 |

Each account has different permissions so you can test the full role-based access system.

---

MIT License — Built for IT teams who deserve better HR tools.

*DevTeam Hub — React + TypeScript + Supabase*
# StaffHub — Al-Mustaqbal University

A production-ready HR & Staff Management platform with role-based access control, modern UI/UX, and bilingual support (EN/AR).

## Features

- **Dashboard** - Real-time stats, quick actions, activity feed
- **Employee Management** - Directory, profiles, search & filtering
- **Department Management** - Academic/administrative departments
- **Leave Management** - Applications, approvals, balance tracking
- **Attendance** - Check-in/out, daily records, hours calculation
- **Reports** - Pre-built templates, custom reports, CSV export
- **User Settings** - Profile, password, notifications, language
- **Multi-Language** - English & Arabic with RTL support

## User Roles

| Role | Access |
|------|--------|
| Admin | Full system access, user management |
| HR | Employee/department management, approvals |
| Staff | Own profile, leave applications, attendance |

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Build**: Vite
- **Deployment**: Vercel

## Getting Started

```bash
npm install
npm run dev
```

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@staffhub.com | admin123 |
| HR | hr@staffhub.com | hr123 |
| Staff | employee@staffhub.com | emp123 |

## Deployment

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
4. Deploy

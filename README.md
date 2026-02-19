<p align="center">
  <h1 align="center">StaffHub</h1>
  <p align="center">
    <strong>Enterprise HR & Employee Management System</strong>
    <br />
    <em>Al-Mustaqbal Group</em>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.x-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-Backend-3FCF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind-CSS-06B6D4?logo=tailwindcss" alt="Tailwind" />
</p>

---

## Overview

StaffHub is a modern, production-ready HR and employee management system designed for enterprises. Built with React, TypeScript, and Supabase, it provides comprehensive workforce management capabilities including role-based access control, bilingual support (English/Arabic with RTL), real-time notifications, and secure passkey authentication.

---

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [User Roles & Permissions](#user-roles--permissions)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Edge Functions API](#edge-functions-api)
- [Deployment](#deployment)
- [Demo Credentials](#demo-credentials)
- [License](#license)

---

## Features

### Core Modules

| Module | Description |
|--------|-------------|
| **Dashboard** | Real-time statistics, interactive charts, quick actions, activity feed, announcements widget |
| **Employee Management** | Complete directory with search, filtering, photo upload, profiles, emergency contacts |
| **Department Management** | Create/edit departments, assign heads, track employee distribution |
| **Leave Management** | Leave applications, approval workflows, balance tracking, status filtering |
| **Attendance** | Manual & biometric check-in/out, daily records, hours calculation |
| **Payroll** | Monthly generation, bonuses/deductions, PDF payslip export |
| **Reports** | Pre-built templates, custom date ranges, CSV export |
| **Announcements** | Company-wide announcements with priority levels |
| **User Management** | Grant access, role assignment, ban/unban, account deactivation |

### Platform Capabilities

- **Role-Based Access Control** — Granular permissions for Admin, HR, and Staff roles
- **Bilingual Support** — Full English & Arabic localization with automatic RTL layout
- **Passkey Authentication** — WebAuthn/FIDO2 support (Windows Hello, Face ID, fingerprint)
- **Real-Time Notifications** — In-app notification center with email integration
- **Activity Logging** — Complete audit trail of all user actions
- **Responsive Design** — Mobile-friendly with collapsible sidebar

---

## Technology Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Vite |
| **Backend** | Supabase (PostgreSQL, Auth, Edge Functions, Realtime, Storage) |
| **Authentication** | Supabase Auth, WebAuthn/SimpleWebAuthn |
| **Internationalization** | react-i18next |
| **Data Visualization** | Recharts |
| **PDF Generation** | jsPDF, jspdf-autotable |
| **Icons** | Lucide React |
| **Deployment** | Vercel |

---

## User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Admin** | Full system access including user management, payroll, reports, and system settings |
| **HR** | Employee & department management, leave approvals, attendance, payroll, reports |
| **Staff** | Personal profile, leave applications, attendance check-in/out, payslips |

---

## Getting Started

### Prerequisites

- Node.js 18 or higher
- Supabase account and project
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/Anas43xq/EmployeeManagementSystem.git
cd EmployeeManagementSystem/project

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your Supabase credentials:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key

# Start development server
npm run dev
```

### Database Setup

Initialize the database schema, triggers, RLS policies, and seed data:

```bash
npx supabase db reset --linked
```

### Deploy Edge Functions

Deploy all required serverless functions to Supabase:

```bash
npx supabase functions deploy webauthn-register --no-verify-jwt
npx supabase functions deploy webauthn-authenticate --no-verify-jwt
npx supabase functions deploy verify-passkey-attendance --no-verify-jwt
npx supabase functions deploy send-notification-email --no-verify-jwt
npx supabase functions deploy generate-monthly-payroll --no-verify-jwt
npx supabase functions deploy manage-user-status --no-verify-jwt
```

---

## Project Structure

```
├── src/
│   ├── components/          # Shared UI components
│   │   └── ui/              # Reusable primitives (Button, Card, Modal)
│   ├── contexts/            # React contexts (Auth, Notifications)
│   ├── hooks/               # Custom hooks
│   ├── i18n/                # Localization files (en.json, ar.json)
│   ├── lib/                 # Utilities, types, Supabase client
│   └── pages/               # Feature modules
│       ├── Dashboard/
│       ├── Attendance/
│       ├── Leaves/
│       ├── Departments/
│       ├── EmployeeEdit/
│       ├── Announcements/
│       ├── Reports/
│       ├── Settings/
│       └── UserManagement/
├── supabase/
│   ├── functions/           # Edge Functions
│   │   ├── webauthn-register/
│   │   ├── webauthn-authenticate/
│   │   ├── verify-passkey-attendance/
│   │   ├── send-notification-email/
│   │   ├── generate-monthly-payroll/
│   │   └── manage-user-status/
│   └── migrations/          # Database schema
└── public/                  # Static assets
```

---

## Edge Functions API

### manage-user-status

Manage user account status (ban, unban, activate, deactivate).

**Endpoint:** `POST /functions/v1/manage-user-status`

**Authorization:** Bearer token (Admin role required)

#### Request Body

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `action` | string | Yes | `ban`, `unban`, `deactivate`, `activate`, `get-status` |
| `userId` | string | Yes | Target user UUID |
| `banDuration` | string | For ban | Duration: `24`, `168`, `720`, `8760` (hours), or `permanent` |
| `reason` | string | No | Ban reason |

#### Example Request

```typescript
const { data, error } = await supabase.functions.invoke('manage-user-status', {
  body: {
    action: 'ban',
    userId: 'user-uuid',
    banDuration: '168',
    reason: 'Policy violation'
  },
  headers: {
    Authorization: `Bearer ${session.access_token}`
  }
});
```

#### Response

```json
{
  "success": true,
  "message": "User banned successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "banned_until": "2026-02-26T12:00:00Z",
    "is_banned": true,
    "is_active": false,
    "banned_at": "2026-02-19T12:00:00Z",
    "ban_reason": "Policy violation"
  }
}
```

---

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Configure environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

Vercel will automatically build and deploy on every push to the main branch.
---

## License

This project is proprietary software developed for Al-Mustaqbal Group.

---

<p align="center">
  Built with ❤️ using React, TypeScript & Supabase
</p>

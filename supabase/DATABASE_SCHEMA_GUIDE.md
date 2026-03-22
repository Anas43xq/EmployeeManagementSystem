# StaffHub Employee Management System - Database Schema Guide

**Version:** 3.5  
**Date:** February 2026  
**Project:** Senior Graduation Project - DevTeam Hub

---

## Overview

This comprehensive database schema implements a complete Employee Management System with role-based access control, real-time features, and security-first design patterns.

**Key Technologies:**
- PostgreSQL (via Supabase)
- Row Level Security (RLS)
- SECURITY DEFINER functions for privilege escalation
- Real-time publication/subscription
- Cron jobs for automated tasks

---

## Table of Contents

1. [Core Entities](#core-entities)
2. [Leave Management](#leave-management)
3. [Attendance & Payroll](#attendance--payroll)
4. [Authentication & Security](#authentication--security)
5. [Communication](#communication)
6. [Performance Tracking](#performance-tracking)
7. [Indexes & Performance](#indexes--performance)
8. [Triggers](#triggers)
9. [Row Level Security (RLS)](#row-level-security-rls)
10. [Business Logic Functions](#business-logic-functions)
11. [Cron Jobs](#cron-jobs)
12. [Real-time Features](#real-time-features)
13. [Storage Configuration](#storage-configuration)

---

## Core Entities

### `departments` Table
**Purpose:** Store organizational department information.

**Columns:**
- `id` (UUID PK): Unique identifier
- `name` (TEXT): Department name (e.g., "Engineering", "HR")
- `description` (TEXT): Department description
- `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

**Relationships:** One-to-many with `employees`

---

### `employees` Table
**Purpose:** Store employee profile information.

**Columns:**
- `id` (UUID FK): Foreign key to auth.users
- `first_name`, `last_name` (TEXT): Employee name
- `email` (TEXT UNIQUE): Email address
- `phone` (TEXT): Contact number
- `employee_number` (TEXT UNIQUE): Auto-generated (EMP001, EMP002, etc.)
- `date_of_birth` (DATE): DOB for age/benefits calculation
- `gender` (VARCHAR): M/F/Other
- `address` (TEXT): Residential address
- `department_id` (UUID FK): References departments table
- `position` (TEXT): Job title/position
- `hire_date` (DATE): Hire date
- `photo_url` (TEXT): Path to employee photo
- `status` (VARCHAR): active/inactive/deactivated
- `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

**Relationships:**
- One-to-many with `leaves`
- One-to-many with `attendance`
- One-to-many with `payrolls`
- One-to-many with `activity_logs`

---

### `users` Table
**Purpose:** Application-level user profiles (sync with auth.users).

**Columns:**
- `id` (UUID PK, FK): Foreign key to auth.users
- `email` (TEXT): User email
- `role` (VARCHAR): admin/hr/manager/employee
- `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

**Relationships:**
- One-to-one with auth.users
- One-to-many with `notifications`
- One-to-many with `user_preferences`
- One-to-many with `activity_logs`

---

## Leave Management

### `leaves` Table
**Purpose:** Track employee leave requests and approvals.

**Columns:**
- `id` (UUID PK): Unique identifier
- `user_id` (UUID FK): References auth.users
- `start_date`, `end_date` (DATE): Leave period
- `reason` (TEXT): Reason for leave
- `type` (VARCHAR): annual/sick/emergency/unpaid/etc.
- `status` (VARCHAR): pending/approved/rejected
- `approved_by` (UUID FK): Manager/HR who approved
- `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

**Validations:**
- No overlapping leaves for same user (checked by trigger)
- Leave balance must exist before creating leave
- End date >= start date

---

### `leave_balances` Table
**Purpose:** Track remaining leave days per user per year.

**Columns:**
- `id` (UUID PK): Unique identifier
- `user_id` (UUID FK): References auth.users
- `annual_leaves` (INT): Annual leave quota
- `sick_leaves` (INT): Sick leave quota
- `emergency_leaves` (INT): Emergency leave quota
- `year` (INT): Year of balance
- `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

**Logic:**
- Automatically decremented when leaves are approved
- Reset annually

---

## Attendance & Payroll

### `attendance` Table
**Purpose:** Track employee daily attendance.

**Columns:**
- `id` (UUID PK): Unique identifier
- `user_id` (UUID FK): References auth.users
- `date` (DATE): Attendance date
- `check_in_time` (TIMESTAMP): When employee clocked in
- `check_out_time` (TIMESTAMP): When employee clocked out
- `hours_worked` (FLOAT): Calculated hours
- `status` (VARCHAR): present/absent/late/half-day
- `notes` (TEXT): Additional notes
- `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

---

### `payrolls` Table
**Purpose:** Store payroll records.

**Columns:**
- `id` (UUID PK): Unique identifier
- `user_id` (UUID FK): References auth.users
- `month` (DATE): Payroll month
- `base_salary` (NUMERIC): Base monthly salary
- `gross_salary` (NUMERIC): Calculated total
- `net_salary` (NUMERIC): After deductions
- `status` (VARCHAR): draft/approved/paid
- `paid_date` (DATE): When paid
- `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

**Relationships:**
- One-to-many with `bonuses`
- One-to-many with `deductions`

---

### `bonuses` Table
**Purpose:** Track bonus allocations.

**Columns:**
- `id` (UUID PK): Unique identifier
- `payroll_id` (UUID FK): References payrolls
- `amount` (NUMERIC): Bonus amount
- `reason` (TEXT): Performance/merit/other
- `created_at` (TIMESTAMPTZ): Timestamp

---

### `deductions` Table
**Purpose:** Track salary deductions.

**Columns:**
- `id` (UUID PK): Unique identifier
- `payroll_id` (UUID FK): References payrolls
- `amount` (NUMERIC): Deduction amount
- `type` (VARCHAR): tax/insurance/loan/etc.
- `created_at` (TIMESTAMPTZ): Timestamp

---

## Authentication & Security

### `passkeys` Table
**Purpose:** Store WebAuthn credentials for passwordless login.

**Columns:**
- `id` (UUID PK): Unique identifier
- `user_id` (UUID FK): References auth.users
- `credential_id` (TEXT UNIQUE): WebAuthn credential ID
- `public_key` (TEXT): Credential public key
- `counter` (INT): Signature counter for replay protection
- `device_name` (TEXT): Device name (e.g., "iPhone", "MacBook")
- `last_used` (TIMESTAMPTZ): Last authentication time
- `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

---

### `login_attempts` Table
**Purpose:** Track failed login attempts and enforce progressive delays + OTP.

**Columns:**
- `id` (UUID PK): Unique identifier
- `user_id` (UUID FK): References auth.users
- `failed_attempts` (INT): Count of consecutive failures
- `last_attempt_at` (TIMESTAMPTZ): Last attempt timestamp
- `otp_sent_at` (TIMESTAMPTZ): When OTP was sent
- `otp_expires_at` (TIMESTAMPTZ): OTP expiration
- `delay_until` (TIMESTAMPTZ): When retry is allowed
- `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

**Progressive Delay Logic:**
- 1st failure: 0 seconds
- 2nd failure: 5 seconds
- 3rd failure: 15 seconds
- 4th+ failures: 30 seconds + OTP verification

---

### `login_attempt_limits` Table
**Purpose:** Enforce IP/MAC device rate limiting (5 attempts per 5 minutes).

**Columns:**
- `id` (UUID PK): Unique identifier
- `ip_address` (TEXT): Source IP address
- `user_agent` (TEXT): Browser user agent
- `failed_attempts` (INT): Failed attempts in current window
- `window_start_at` (TIMESTAMPTZ): When 5-min window started
- `last_attempt_at` (TIMESTAMPTZ): Last attempt time
- `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

**Unique Constraint:** (ip_address, user_agent)

---

## Communication

### `notifications` Table
**Purpose:** Store system and user notifications.

**Columns:**
- `id` (UUID PK): Unique identifier
- `user_id` (UUID FK): References auth.users
- `title` (TEXT): Notification title
- `message` (TEXT): Notification message
- `type` (VARCHAR): system/leave/payroll/announcement/etc.
- `is_read` (BOOLEAN): Read status
- `created_at` (TIMESTAMPTZ): Timestamp

---

### `announcements` Table
**Purpose:** Organization-wide announcements.

**Columns:**
- `id` (UUID PK): Unique identifier
- `title` (TEXT): Announcement title
- `content` (TEXT): Announcement content
- `created_by` (UUID FK): Creator (admin/HR)
- `visibility` (VARCHAR): all/department/role-based
- `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

---

### `activity_logs` Table
**Purpose:** Comprehensive audit trail of all user actions.

**Columns:**
- `id` (UUID PK): Unique identifier
- `user_id` (UUID FK): Who performed the action
- `action` (TEXT): Action type (create/update/delete/login/etc.)
- `entity_type` (TEXT): What was affected (user/leave/payroll/etc.)
- `entity_id` (UUID): ID of affected entity
- `details` (JSONB): Additional details
- `created_at` (TIMESTAMPTZ): Timestamp

**Examples:**
```json
{
  "action": "user_login_failed",
  "failed_attempts": 2,
  "seconds_until_retry": 5
}
```

---

### `user_preferences` Table
**Purpose:** Store user-specific preferences.

**Columns:**
- `id` (UUID PK): Unique identifier
- `user_id` (UUID FK): References auth.users
- `theme` (VARCHAR): light/dark preference
- `notifications_enabled` (BOOLEAN): Opt-out/in
- `language` (VARCHAR): en/ar/etc.
- `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

---

## Performance Tracking

### `employee_performance` Table
**Purpose:** Weekly performance scores and metrics.

**Columns:**
- `id` (UUID PK): Unique identifier
- `user_id` (UUID FK): References auth.users
- `score` (FLOAT 0-100): Performance score
- `attendance_score` (FLOAT): Based on attendance
- `productivity_score` (FLOAT): Based on tasks/metrics
- `week_start_date` (DATE): Week start
- `calculated_at` (TIMESTAMPTZ): When calculated
- `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

---

### `employee_of_week` Table
**Purpose:** Weekly employee recognition.

**Columns:**
- `id` (UUID PK): Unique identifier
- `user_id` (UUID FK): References auth.users (employee)
- `week_start_date` (DATE): Week start
- `score_achieved` (FLOAT): Performance score
- `created_at` (TIMESTAMPTZ): Timestamp

---

## Tasks & Development

### `employee_tasks` Table
**Purpose:** Track task assignments and completion.

**Columns:**
- `id` (UUID PK): Unique identifier
- `user_id` (UUID FK): Assigned employee
- `title` (TEXT): Task title
- `description` (TEXT): Task details
- `assigned_by` (UUID FK): Manager who assigned
- `due_date` (DATE): Due date
- `status` (VARCHAR): pending/in-progress/completed/overdue
- `priority` (VARCHAR): low/medium/high/critical
- `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

---

## Warnings & Complaints

### `employee_warnings` Table
**Purpose:** Track formal employee warnings.

**Columns:**
- `id` (UUID PK): Unique identifier
- `user_id` (UUID FK): Employee warned
- `reason` (TEXT): Reason for warning
- `severity` (VARCHAR): verbal/written/final
- `issued_by` (UUID FK): Manager
- `issued_date` (DATE): Date of warning
- `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

---

### `employee_complaints` Table
**Purpose:** Track employee complaints/grievances.

**Columns:**
- `id` (UUID PK): Unique identifier
- `complainant_id` (UUID FK): Who filed
- `subject` (TEXT): Complaint subject
- `description` (TEXT): Details
- `against_user_id` (UUID FK): Complaint target
- `status` (VARCHAR): pending/resolved/dismissed
- `created_at`, `updated_at` (TIMESTAMPTZ): Timestamps

---

## Key Functions

### Helper Functions

| Function | Purpose |
|----------|---------|
| `generate_employee_number()` | Auto-generate EMP001, EMP002, etc. |
| `update_updated_at_column()` | Trigger function to auto-update timestamps |
| `calculate_working_days(start_date, end_date)` | Calculate business days for leave |
| `check_leave_overlap()` | Prevent overlapping leaves for same user |
| `calculate_attendance_deductions()` | Deduct salary for absences |
| `calculate_leave_deductions()` | Deduct salary for unpaid leaves |

### Authentication Functions

| Function | Purpose |
|----------|---------|
| `pre_auth_login_check(email)` | Check if user can attempt login (progressive delay + OTP) |
| `record_failed_login(email)` | Record failed attempt, calculate delay |
| `check_ip_mac_limits(ip, user_agent, email)` | 5-per-5-min device rate limit |
| `reset_login_attempts_rpc(user_id)` | Clear delays on successful login |

### RLS Helper Functions

| Function | Purpose |
|----------|---------|
| `get_user_role()` | Get current user's role |
| `get_user_employee_id()` | Get current user's employee ID |
| `get_user_email()` | Get current user's email |

### Business Logic Functions

| Function | Purpose |
|----------|---------|
| `calculate_weekly_performance(week_start)` | Calculate performance scores |
| `select_employee_of_week(week_start)` | Select top performer |
| `notify_role_users(title, msg, roles, exclude_id)` | Notify specific role users |
| `get_role_user_emails(roles, exclude_id)` | Get emails of users in roles |

### Session Management Functions

| Function | Purpose |
|----------|---------|
| `get_own_session_token()` | Retrieve current session token |
| `set_own_session_token(token)` | Set session token |
| `clear_own_session_token()` | Clear on logout (single-session enforcement) |

---

## Row Level Security (RLS)

### Policy Strategy

**Principle:** Users can only see/modify their own data, except admins/HR with elevated privileges.

### Key Policies

#### `employees` Table
- Employees see only their own record
- Managers see their department's employees + own
- HR/Admin see all employees

#### `leaves` Table
- Users see their own leaves
- Managers see their team's leaves
- HR/Admin see all leaves

#### `payrolls` Table
- Employees see only their own payroll
- HR/Admin see all payroll records

#### `activity_logs` Table
- Users see their own actions
- Admins see all logs (audit trail)

#### `notifications` Table
- Users see only their own notifications

#### `user_preferences` Table
- Users can only read/write their own preferences

---

## Indexes

Performance indexes are created on:

- **login_attempts:** user_id, failed_attempts, last_attempt_at
- **login_attempt_limits:** (ip_address, user_agent), window_start_at
- **leaves:** user_id, start_date, end_date
- **attendance:** user_id, date
- **payrolls:** user_id, month
- **activity_logs:** user_id, action, created_at
- **notifications:** user_id, is_read, created_at
- **employees:** email, department_id, status

---

## Triggers

### Auto-Updated Timestamps
Triggers on all main tables to auto-set `updated_at` on any update:
- departments, employees, users
- leaves, leave_balances
- attendance, payrolls, bonuses, deductions
- user_preferences, announcements, tasks, warnings, complaints
- performance, login_attempts

### Email Sync Trigger
**`sync_auth_email_on_employee_update`**: When employee email changes, sync to auth.users

### Auth User Triggers
- **`on_auth_user_created`**: Create corresponding public.users record when auth.users created
- **`on_auth_user_email_changed`**: Sync email changes from auth to public

### Leave Overlap Check
**`check_leave_overlap_trigger`**: Prevent user from having overlapping leave periods

---

## Cron Jobs

### 1. Weekly Performance Calculation
**Schedule:** Every Monday at 00:05 UTC  
**Function:** `calculate_weekly_performance()`  
**Purpose:** Calculate employee performance scores based on attendance, tasks, metrics

### 2. Employee of Week Selection
**Schedule:** Every Monday at 00:10 UTC  
**Function:** `select_employee_of_week()`  
**Purpose:** Identify and record top performer for the week

---

## Real-time Features

### Replica Identity
Critical tables have replica identity set to FULL:
- login_attempts
- notifications
- activity_logs
- employees
- leaves

This enables real-time updates via Supabase RealtimeAPI.

### Publication
Tables published to `supabase_realtime` for subscribe/listen:
```typescript
supabase
  .channel('public:notifications')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
    // Handle notification
  })
  .subscribe();
```

---

## Storage Configuration

### Employee Photos Bucket
**Name:** `employee-photos`  
**Purpose:** Store employee profile pictures

**Policies:**
- Authenticated users can upload to their own folder
- Users can view all photos (security not priority, visibility is)
- HR/Admin can delete any photos

---

## Implementation Notes

### Progressive Login Delays
1. 1st failed attempt: No delay
2. 2nd attempt: 5 second wait
3. 3rd attempt: 15 second wait
4. 4th+ attempt: 30 second wait + OTP required

### IP/MAC Rate Limiting
- Maximum 5 failed attempts per IP/User-Agent per 5 minute window
- Lazy cleanup of expired records
- Separate from per-user progressive delays

### Lazy Cleanup Strategy
- No external cron jobs needed
- Cleanup happens during normal requests
- Expired records deleted on insert/update operations

### Activity Logging
- All significant actions are logged to `activity_logs`
- Includes login attempts, role changes, resource modifications
- Useful for audit trails and security investigations

### Single Session Enforcement
- Session tokens tracked in `session_tokens` table
- Only one valid token per user at a time
- Logout clears token, invalidating other sessions

---

## Security Highlights

✅ Row Level Security (RLS) enforced at database layer  
✅ SECURITY DEFINER functions for privilege escalation  
✅ Progressive login delays prevent brute-force  
✅ IP/MAC device rate limiting  
✅ WebAuthn passwordless login support  
✅ Comprehensive activity audit trail  
✅ Email sync between auth and public schemas  
✅ Automatic session invalidation  

---

## Connect to Database

### Supabase CLI
```bash
supabase db reset --linked
```

### View Schema
```bash
supabase db pull
```

### Local Development
```bash
supabase start
supabase db reset
```

---

## Seed Data

Seed data is stored in `supabase/seed.sql` and automatically applied during `db reset`.

Includes:
- Sample departments
- Test employees
- Demo payroll records
- Sample announcements

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 3.5 | Feb 2026 | Progressive delays + IP/MAC rate limiting + session enforcement |
| 3.0 | Jan 2026 | Complete schema overhaul + performance tracking |
| 2.0 | Dec 2025 | WebAuthn passkeys + real-time features |
| 1.0 | Nov 2025 | Initial schema |


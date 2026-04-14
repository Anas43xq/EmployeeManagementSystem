import type React from 'react';

export interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

export interface NavCategory {
  label: string;
  items: NavItem[];
  roles: string[];
}

export const ITEMS_BY_ROLE: Record<string, string[]> = {
  admin: ['/dashboard', '/profile', '/employees', '/departments', '/attendance', '/leaves', '/tasks', '/payroll', '/announcements', '/complaints', '/warnings', '/reports', '/faq', '/users', '/activity-logs', '/settings'],
  hr: ['/dashboard', '/profile', '/employees', '/departments', '/attendance', '/leaves', '/tasks', '/payroll', '/announcements', '/complaints', '/warnings', '/reports', '/faq'],
  staff: ['/dashboard', '/profile', '/attendance', '/leaves', '/tasks', '/payslips', '/complaints', '/warnings', '/faq'],
};

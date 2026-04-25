import type { Employee, EmployeeOfWeek, Qualification } from '../types';

type NullableFields<T> = {
  [Key in keyof T]?: T[Key] | null;
};

type EmployeeRecord = NullableFields<Omit<Employee, 'qualifications' | 'departments'>> & {
  qualifications?: unknown;
  departments?: { name?: string | null } | null;
};

type EmployeeOfWeekRecord = NullableFields<Omit<EmployeeOfWeek, 'employees'>> & {
  employees?: EmployeeRecord | null;
};

function isQualification(value: unknown): value is Qualification {
  return (
    typeof value === 'object' &&
    value !== null &&
    'degree' in value &&
    'institution' in value &&
    typeof value.degree === 'string' &&
    typeof value.institution === 'string'
  );
}

function toQualifications(value: unknown): Qualification[] {
  if (!Array.isArray(value)) return [];

  return value.filter(isQualification).map((qualification) => ({
    degree: qualification.degree,
    institution: qualification.institution,
    ...(qualification.year ? { year: qualification.year } : {}),
  }));
}


export function mapEmployeeRecord(record: EmployeeRecord): Employee {
  return {
    id: record.id ?? '',
    employee_number: record.employee_number ?? '',
    first_name: record.first_name ?? '',
    last_name: record.last_name ?? '',
    email: record.email ?? '',
    phone: record.phone ?? '',
    date_of_birth: record.date_of_birth ?? '',
    gender: record.gender ?? '',
    address: record.address ?? '',
    city: record.city ?? '',
    state: record.state ?? '',
    postal_code: record.postal_code ?? '',
    department_id: record.department_id ?? '',
    position: record.position ?? '',
    employment_type: record.employment_type ?? '',
    status: record.status ?? '',
    hire_date: record.hire_date ?? '',
    termination_date: record.termination_date ?? null,
    salary: typeof record.salary === 'number' ? record.salary : 0,
    qualifications: toQualifications(record.qualifications),
    emergency_contact_name: record.emergency_contact_name ?? '',
    emergency_contact_phone: record.emergency_contact_phone ?? '',
    photo_url: record.photo_url ?? null,
    departments: record.departments?.name ? { name: record.departments.name } : undefined,
  };
}


export function mapEmployeeOfWeekRecord(record: EmployeeOfWeekRecord): EmployeeOfWeek {
  return {
    id: record.id ?? '',
    employee_id: record.employee_id ?? '',
    week_start: record.week_start ?? '',
    week_end: record.week_end ?? '',
    score: typeof record.score === 'number' ? record.score : 0,
    reason: record.reason ?? '',
    is_auto_selected: record.is_auto_selected ?? false,
    selected_by: record.selected_by ?? null,
    created_at: record.created_at ?? '',
    employees: record.employees ? mapEmployeeRecord(record.employees) : undefined,
  };
}

const PROFILE_KEYS = [
  'phone', 'date_of_birth', 'gender', 'address', 'city', 'state', 'postal_code',
  'photo_url', 'qualifications', 'emergency_contact_name', 'emergency_contact_phone'
];


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractCore(data: Record<string, any>): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const coreData: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!PROFILE_KEYS.includes(key)) {
      coreData[key] = value;
    }
  }
  return coreData;
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractProfile(data: Record<string, any>): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileData: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (PROFILE_KEYS.includes(key)) {
      profileData[key] = value;
    }
  }
  return profileData;
}

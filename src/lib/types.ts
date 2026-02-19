export interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  department_id: string;
  position: string;
  employment_type: string;
  status: string;
  hire_date: string;
  termination_date: string | null;
  salary: number;
  qualifications: any[];
  emergency_contact_name: string;
  emergency_contact_phone: string;
  photo_url?: string | null;
  departments?: {
    name: string;
  };
}

export type EmployeeBasic = Pick<Employee, 'id' | 'first_name' | 'last_name'>;
export type EmployeeWithNumber = Pick<Employee, 'id' | 'first_name' | 'last_name' | 'employee_number'>;
export type EmployeeSummary = Pick<Employee, 'id' | 'first_name' | 'last_name' | 'employee_number' | 'email' | 'position' | 'department_id'> & {
  departments?: { name: string };
};
export type EmployeeListItem = Pick<Employee, 'id' | 'employee_number' | 'first_name' | 'last_name' | 'email' | 'position' | 'department_id' | 'status' | 'employment_type' | 'hire_date'> & {
  departments?: { name: string };
};

export interface Department {
  id: string;
  name: string;
  type: string;
  description: string;
  head_id: string | null;
  employees?: { count: number }[];
}

export type DepartmentBasic = Pick<Department, 'id' | 'name'>;

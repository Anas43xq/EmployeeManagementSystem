export interface Department {
  id: string;
  name: string;
}

export interface EmployeeFormData {
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
  salary: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  photo_url: string;
}

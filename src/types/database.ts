export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  
  
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          priority: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          priority?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          priority?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string | null
          date: string
          employee_id: string
          id: string
          notes: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date: string
          employee_id: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string
          employee_id?: string
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      bonuses: {
        Row: {
          amount: number
          approved_by: string | null
          created_at: string | null
          description: string
          employee_id: string
          id: string
          payroll_id: string | null
          period_month: number
          period_year: number
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          created_at?: string | null
          description: string
          employee_id: string
          id?: string
          payroll_id?: string | null
          period_month: number
          period_year: number
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          created_at?: string | null
          description?: string
          employee_id?: string
          id?: string
          payroll_id?: string | null
          period_month?: number
          period_year?: number
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bonuses_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonuses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonuses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bonuses_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "payrolls"
            referencedColumns: ["id"]
          },
        ]
      }
      deductions: {
        Row: {
          amount: number
          approved_by: string | null
          created_at: string | null
          description: string
          employee_id: string
          id: string
          payroll_id: string | null
          period_month: number
          period_year: number
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          approved_by?: string | null
          created_at?: string | null
          description: string
          employee_id: string
          id?: string
          payroll_id?: string | null
          period_month: number
          period_year: number
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          created_at?: string | null
          description?: string
          employee_id?: string
          id?: string
          payroll_id?: string | null
          period_month?: number
          period_year?: number
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deductions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deductions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deductions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deductions_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "payrolls"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          description: string | null
          head_id: string | null
          id: string
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          head_id?: string | null
          id?: string
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          head_id?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_department_head"
            columns: ["head_id"]
            isOneToOne: false
            referencedRelation: "employee_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_department_head"
            columns: ["head_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_complaints: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string | null
          description: string
          employee_id: string
          id: string
          priority: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          created_at?: string | null
          description: string
          employee_id: string
          id?: string
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string | null
          description?: string
          employee_id?: string
          id?: string
          priority?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_complaints_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_complaints_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_complaints_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_complaints_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_of_week: {
        Row: {
          created_at: string | null
          employee_id: string
          id: string
          is_auto_selected: boolean
          reason: string
          score: number
          selected_by: string | null
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          id?: string
          is_auto_selected?: boolean
          reason: string
          score?: number
          selected_by?: string | null
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          id?: string
          is_auto_selected?: boolean
          reason?: string
          score?: number
          selected_by?: string | null
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_of_week_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_of_week_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_of_week_selected_by_fkey"
            columns: ["selected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_performance: {
        Row: {
          absent_days: number
          attendance_days: number
          attendance_score: number
          calculated_at: string | null
          created_at: string | null
          employee_id: string
          id: string
          late_days: number
          notes: string | null
          period_end: string
          period_start: string
          task_score: number
          tasks_completed: number
          tasks_overdue: number
          total_score: number
          updated_at: string | null
          warning_deduction: number
        }
        Insert: {
          absent_days?: number
          attendance_days?: number
          attendance_score?: number
          calculated_at?: string | null
          created_at?: string | null
          employee_id: string
          id?: string
          late_days?: number
          notes?: string | null
          period_end: string
          period_start: string
          task_score?: number
          tasks_completed?: number
          tasks_overdue?: number
          total_score?: number
          updated_at?: string | null
          warning_deduction?: number
        }
        Update: {
          absent_days?: number
          attendance_days?: number
          attendance_score?: number
          calculated_at?: string | null
          created_at?: string | null
          employee_id?: string
          id?: string
          late_days?: number
          notes?: string | null
          period_end?: string
          period_start?: string
          task_score?: number
          tasks_completed?: number
          tasks_overdue?: number
          total_score?: number
          updated_at?: string | null
          warning_deduction?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_performance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_performance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_profiles: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_id: string
          gender: string | null
          phone: string | null
          photo_url: string | null
          postal_code: string | null
          qualifications: Json | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_id: string
          gender?: string | null
          phone?: string | null
          photo_url?: string | null
          postal_code?: string | null
          qualifications?: Json | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_id?: string
          gender?: string | null
          phone?: string | null
          photo_url?: string | null
          postal_code?: string | null
          qualifications?: Json | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employee_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_profiles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_tasks: {
        Row: {
          assigned_by: string
          completed_at: string | null
          created_at: string | null
          deadline: string
          description: string | null
          employee_id: string
          id: string
          penalty_points: number
          points: number
          priority: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_by: string
          completed_at?: string | null
          created_at?: string | null
          deadline: string
          description?: string | null
          employee_id: string
          id?: string
          penalty_points?: number
          points?: number
          priority?: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string
          completed_at?: string | null
          created_at?: string | null
          deadline?: string
          description?: string | null
          employee_id?: string
          id?: string
          penalty_points?: number
          points?: number
          priority?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_tasks_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_warnings: {
        Row: {
          acknowledged_at: string | null
          created_at: string | null
          description: string | null
          employee_id: string
          id: string
          issued_by: string
          reason: string
          resolution_notes: string | null
          resolved_at: string | null
          severity: string
          status: string
          updated_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string | null
          description?: string | null
          employee_id: string
          id?: string
          issued_by: string
          reason: string
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string | null
          description?: string | null
          employee_id?: string
          id?: string
          issued_by?: string
          reason?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_warnings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_warnings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_warnings_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string | null
          department_id: string | null
          email: string
          employee_number: string
          employment_type: string
          first_name: string
          hire_date: string
          id: string
          last_name: string
          position: string
          salary: number | null
          status: string
          termination_date: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          email: string
          employee_number?: string
          employment_type?: string
          first_name: string
          hire_date: string
          id?: string
          last_name: string
          position: string
          salary?: number | null
          status?: string
          termination_date?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          email?: string
          employee_number?: string
          employment_type?: string
          first_name?: string
          hire_date?: string
          id?: string
          last_name?: string
          position?: string
          salary?: number | null
          status?: string
          termination_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          category: string
          content: Json
          created_at: string
          created_by: string
          faq_order: number
          id: string
          is_active: boolean
          updated_at: string
          updated_by: string | null
          visible_to: string[]
        }
        Insert: {
          category: string
          content?: Json
          created_at?: string
          created_by: string
          faq_order?: number
          id?: string
          is_active?: boolean
          updated_at?: string
          updated_by?: string | null
          visible_to?: string[]
        }
        Update: {
          category?: string
          content?: Json
          created_at?: string
          created_by?: string
          faq_order?: number
          id?: string
          is_active?: boolean
          updated_at?: string
          updated_by?: string | null
          visible_to?: string[]
        }
        Relationships: []
      }
      leave_balances: {
        Row: {
          annual_total: number | null
          annual_used: number | null
          casual_total: number | null
          casual_used: number | null
          created_at: string | null
          employee_id: string
          id: string
          sick_total: number | null
          sick_used: number | null
          updated_at: string | null
          year: number
        }
        Insert: {
          annual_total?: number | null
          annual_used?: number | null
          casual_total?: number | null
          casual_used?: number | null
          created_at?: string | null
          employee_id: string
          id?: string
          sick_total?: number | null
          sick_used?: number | null
          updated_at?: string | null
          year: number
        }
        Update: {
          annual_total?: number | null
          annual_used?: number | null
          casual_total?: number | null
          casual_used?: number | null
          created_at?: string | null
          employee_id?: string
          id?: string
          sick_total?: number | null
          sick_used?: number | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leaves: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          days_count: number
          employee_id: string
          end_date: string
          id: string
          leave_type: string
          reason: string
          rejection_reason: string | null
          start_date: string
          status: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          days_count: number
          employee_id: string
          end_date: string
          id?: string
          leave_type: string
          reason: string
          rejection_reason?: string | null
          start_date: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          days_count?: number
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string
          rejection_reason?: string | null
          start_date?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leaves_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaves_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leaves_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempt_limits: {
        Row: {
          created_at: string
          failed_attempts: number
          id: string
          ip_address: string
          last_attempt_at: string
          updated_at: string | null
          user_agent: string
          window_start_at: string
        }
        Insert: {
          created_at?: string
          failed_attempts?: number
          id?: string
          ip_address: string
          last_attempt_at?: string
          updated_at?: string | null
          user_agent: string
          window_start_at?: string
        }
        Update: {
          created_at?: string
          failed_attempts?: number
          id?: string
          ip_address?: string
          last_attempt_at?: string
          updated_at?: string | null
          user_agent?: string
          window_start_at?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          created_at: string
          delay_until: string | null
          failed_attempts: number
          id: string
          last_attempt_at: string | null
          last_otp_request_at: string | null
          otp_expires_at: string | null
          otp_sent_at: string | null
          otp_verification_attempts: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delay_until?: string | null
          failed_attempts?: number
          id?: string
          last_attempt_at?: string | null
          last_otp_request_at?: string | null
          otp_expires_at?: string | null
          otp_sent_at?: string | null
          otp_verification_attempts?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delay_until?: string | null
          failed_attempts?: number
          id?: string
          last_attempt_at?: string | null
          last_otp_request_at?: string | null
          otp_expires_at?: string | null
          otp_sent_at?: string | null
          otp_verification_attempts?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      passkeys: {
        Row: {
          counter: number
          created_at: string | null
          credential_id: string
          device_name: string
          id: string
          last_used_at: string | null
          public_key: string
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string | null
          credential_id: string
          device_name: string
          id?: string
          last_used_at?: string | null
          public_key: string
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string | null
          credential_id?: string
          device_name?: string
          id?: string
          last_used_at?: string | null
          public_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "passkeys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payrolls: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          base_salary: number
          created_at: string | null
          employee_id: string
          generated_at: string | null
          gross_salary: number
          id: string
          net_salary: number
          notes: string | null
          period_month: number
          period_year: number
          status: string
          total_bonuses: number
          total_deductions: number
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          base_salary?: number
          created_at?: string | null
          employee_id: string
          generated_at?: string | null
          gross_salary?: number
          id?: string
          net_salary?: number
          notes?: string | null
          period_month: number
          period_year: number
          status?: string
          total_bonuses?: number
          total_deductions?: number
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          base_salary?: number
          created_at?: string | null
          employee_id?: string
          generated_at?: string | null
          gross_salary?: number
          id?: string
          net_salary?: number
          notes?: string | null
          period_month?: number
          period_year?: number
          status?: string
          total_bonuses?: number
          total_deductions?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payrolls_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payrolls_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          email_attendance_reminders: boolean | null
          email_complaints: boolean | null
          email_leave_approvals: boolean | null
          email_tasks: boolean | null
          email_warnings: boolean | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_attendance_reminders?: boolean | null
          email_complaints?: boolean | null
          email_leave_approvals?: boolean | null
          email_tasks?: boolean | null
          email_warnings?: boolean | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_attendance_reminders?: boolean | null
          email_complaints?: boolean | null
          email_leave_approvals?: boolean | null
          email_tasks?: boolean | null
          email_warnings?: boolean | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          ban_reason: string | null
          banned_at: string | null
          created_at: string | null
          current_session_token: string | null
          employee_id: string
          id: string
          is_active: boolean
          last_activity_at: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          ban_reason?: string | null
          banned_at?: string | null
          created_at?: string | null
          current_session_token?: string | null
          employee_id: string
          id: string
          is_active?: boolean
          last_activity_at?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          ban_reason?: string | null
          banned_at?: string | null
          created_at?: string | null
          current_session_token?: string | null
          employee_id?: string
          id?: string
          is_active?: boolean
          last_activity_at?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      employee_full: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          date_of_birth: string | null
          department_id: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_number: string | null
          employment_type: string | null
          first_name: string | null
          gender: string | null
          hire_date: string | null
          id: string | null
          last_name: string | null
          last_updated: string | null
          phone: string | null
          photo_url: string | null
          position: string | null
          postal_code: string | null
          profile_updated_at: string | null
          qualifications: Json | null
          salary: number | null
          state: string | null
          status: string | null
          termination_date: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      bytea_to_text: { Args: { data: string }; Returns: string }
      calculate_attendance_deductions: {
        Args: { p_employee_id: string; p_month: number; p_year: number }
        Returns: number
      }
      calculate_leave_deductions: {
        Args: { p_employee_id: string; p_month: number; p_year: number }
        Returns: number
      }
      calculate_weekly_performance: {
        Args: { p_week_start?: string }
        Returns: undefined
      }
      calculate_working_days: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: number
      }
      check_ip_mac_limits: {
        Args: { p_email?: string; p_ip_address: string; p_user_agent: string }
        Returns: Json
      }
      check_week_data_availability: {
        Args: { p_week_start?: string }
        Returns: Json
      }
      cleanup_expired_login_limits: { Args: never; Returns: undefined }
      cleanup_old_login_attempts: { Args: never; Returns: undefined }
      clear_own_session_token: { Args: never; Returns: undefined }
      generate_employee_number: { Args: never; Returns: string }
      get_last_performance_calculation_time: { Args: never; Returns: string }
      get_own_session_token: { Args: never; Returns: string }
      get_progressive_delay_seconds: {
        Args: { attempt_count: number }
        Returns: number
      }
      get_role_user_emails: {
        Args: { p_exclude_user_id?: string; p_roles?: string[] }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      get_seconds_until_retry: {
        Args: { delay_until_ts: string }
        Returns: number
      }
      get_user_email: { Args: never; Returns: string }
      get_user_employee_id: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "http_request"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_delete:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_get:
        | {
            Args: { uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
        SetofOptions: {
          from: "*"
          to: "http_header"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_list_curlopt: {
        Args: never
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_post:
        | {
            Args: { content: string; content_type: string; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: { data: Json; uri: string }
            Returns: Database["public"]["CompositeTypes"]["http_response"]
            SetofOptions: {
              from: "*"
              to: "http_response"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      http_put: {
        Args: { content: string; content_type: string; uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
        SetofOptions: {
          from: "*"
          to: "http_response"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      http_reset_curlopt: { Args: never; Returns: boolean }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      log_activity: {
        Args: {
          p_action: string
          p_details?: Json
          p_entity_id?: string
          p_entity_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      notify_role_users: {
        Args: {
          p_exclude_user_id?: string
          p_message: string
          p_roles?: string[]
          p_title: string
          p_type?: string
        }
        Returns: undefined
      }
      pre_auth_login_check: { Args: { p_email: string }; Returns: Json }
      record_failed_login: { Args: { p_email: string }; Returns: Json }
      refresh_otp_expiry: { Args: { p_email: string }; Returns: undefined }
      reset_login_attempts_rpc: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      select_employee_of_week: {
        Args: { p_recalculate?: boolean; p_week_start?: string }
        Returns: undefined
      }
      set_own_session_token: { Args: { p_token: string }; Returns: undefined }
      text_to_bytea: { Args: { data: string }; Returns: string }
      urlencode:
        | { Args: { data: Json }; Returns: string }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { string: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.urlencode(string => bytea), public.urlencode(string => varchar). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      validate_otp_request_cooldown: {
        Args: { p_email: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

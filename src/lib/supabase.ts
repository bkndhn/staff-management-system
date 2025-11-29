import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface DatabaseStaff {
  id: string;
  name: string;
  location: 'Big Shop' | 'Small Shop' | 'Godown';
  type: 'full-time' | 'part-time';
  experience: string;
  basic_salary: number;
  incentive: number;
  hra: number;
  total_salary: number;
  joined_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabaseAttendance {
  id: string;
  staff_id: string;
  date: string;
  status: 'Present' | 'Half Day' | 'Absent';
  attendance_value: number;
  is_sunday?: boolean;
  is_part_time?: boolean;
  staff_name?: string;
  shift?: 'Morning' | 'Evening' | 'Both';
  location?: string;
  salary?: number;
  salary_override?: boolean;
  arrival_time?: string;
  leaving_time?: string;
  created_at: string;
}

export interface DatabaseAdvance {
  id: string;
  staff_id: string;
  month: number;
  year: number;
  old_advance: number;
  current_advance: number;
  deduction: number;
  new_advance: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseOldStaffRecord {
  id: string;
  original_staff_id: string;
  name: string;
  location: string;
  type: string;
  experience: string;
  basic_salary: number;
  incentive: number;
  hra: number;
  total_salary: number;
  joined_date: string;
  left_date: string;
  reason: string;
  total_advance_outstanding: number;
  last_advance_data?: any;
  created_at: string;
}
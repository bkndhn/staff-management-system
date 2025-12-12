import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase is properly configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Log configuration status for debugging
if (!isSupabaseConfigured) {
  console.error('❌ Supabase environment variables are missing!');
  console.error('Required variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  console.error('Please check your .env file or deployment environment settings.');
}

// Create a dummy client if env vars are missing (prevents app crash)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder');

export interface DatabaseStaff {
  id: string;
  name: string;
  location: string;
  type: string;
  experience: string;
  basic_salary: number;
  incentive: number;
  hra: number;
  total_salary: number;
  joined_date: string;
  is_active: boolean;
  sunday_penalty: boolean;
  salary_calculation_days: number;
  salary_supplements: Record<string, number>;
  meal_allowance: number;
  display_order: number;
  contact_number?: string;
  address?: string;
  photo_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DatabaseAttendance {
  id: string;
  staff_id: string;
  date: string;
  status: string;
  created_at: string;
  attendance_value?: number;
  is_part_time?: boolean;
  staff_name?: string;
  location?: string;
  shift?: string;
  salary?: number;
  salary_override?: boolean;
}

export interface DatabaseAdvanceDeduction {
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
  contact_number?: string;
  address?: string;
  photo_url?: string;
  created_at: string;
}
import { supabase } from '../lib/supabase';
import { SalaryHike } from '../types';

export interface DatabaseSalaryHike {
  id: string;
  staff_id: string;
  old_salary: number;
  new_salary: number;
  hike_date: string;
  reason?: string;
  created_at: string;
}

export const salaryHikeService = {
  async getAll(): Promise<SalaryHike[]> {
    const { data, error } = await supabase
      .from('salary_hikes')
      .select('*')
      .order('hike_date', { ascending: false });

    if (error) {
      console.error('Error fetching salary hikes:', error);
      throw error;
    }

    return data.map(this.mapFromDatabase);
  },

  async getByStaffId(staffId: string): Promise<SalaryHike[]> {
    const { data, error } = await supabase
      .from('salary_hikes')
      .select('*')
      .eq('staff_id', staffId)
      .order('hike_date', { ascending: false });

    if (error) {
      console.error('Error fetching salary hikes for staff:', error);
      throw error;
    }

    return data.map(this.mapFromDatabase);
  },

  async create(hike: Omit<SalaryHike, 'id' | 'createdAt'>): Promise<SalaryHike> {
    const dbHike = this.mapToDatabase(hike);
    
    const { data, error } = await supabase
      .from('salary_hikes')
      .insert([dbHike])
      .select()
      .single();

    if (error) {
      console.error('Error creating salary hike:', error);
      throw error;
    }

    return this.mapFromDatabase(data);
  },

  mapFromDatabase(dbHike: DatabaseSalaryHike): SalaryHike {
    return {
      id: dbHike.id,
      staffId: dbHike.staff_id,
      oldSalary: dbHike.old_salary,
      newSalary: dbHike.new_salary,
      hikeDate: dbHike.hike_date,
      reason: dbHike.reason,
      createdAt: dbHike.created_at
    };
  },

  mapToDatabase(hike: Omit<SalaryHike, 'id' | 'createdAt'>): Omit<DatabaseSalaryHike, 'id' | 'created_at'> {
    return {
      staff_id: hike.staffId,
      old_salary: hike.oldSalary,
      new_salary: hike.newSalary,
      hike_date: hike.hikeDate,
      reason: hike.reason
    };
  }
};
import { supabase } from '../lib/supabase';
import { Staff } from '../types';
import type { DatabaseStaff } from '../lib/supabase';

export const staffService = {
  async getAll(): Promise<Staff[]> {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching staff:', error);
      throw error;
    }

    return data.map(this.mapFromDatabase);
  },

  async create(staff: Omit<Staff, 'id'>): Promise<Staff> {
    const dbStaff = this.mapToDatabase(staff);
    
    const { data, error } = await supabase
      .from('staff')
      .insert([dbStaff])
      .select()
      .single();

    if (error) {
      console.error('Error creating staff:', error);
      throw error;
    }

    return this.mapFromDatabase(data);
  },

  async update(id: string, updates: Partial<Staff>): Promise<Staff> {
    // Map camelCase properties to snake_case database column names
    const dbUpdates: Partial<Omit<DatabaseStaff, 'id' | 'created_at'>> = {
      updated_at: new Date().toISOString()
    };

    // Map each camelCase property to its snake_case equivalent
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.experience !== undefined) dbUpdates.experience = updates.experience;
    if (updates.basicSalary !== undefined) dbUpdates.basic_salary = updates.basicSalary;
    if (updates.incentive !== undefined) dbUpdates.incentive = updates.incentive;
    if (updates.hra !== undefined) dbUpdates.hra = updates.hra;
    if (updates.totalSalary !== undefined) dbUpdates.total_salary = updates.totalSalary;
    if (updates.joinedDate !== undefined) dbUpdates.joined_date = updates.joinedDate;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    const { data, error } = await supabase
      .from('staff')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating staff:', error);
      throw error;
    }

    return this.mapFromDatabase(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('staff')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deleting staff:', error);
      throw error;
    }
  },

  mapFromDatabase(dbStaff: DatabaseStaff): Staff {
    return {
      id: dbStaff.id,
      name: dbStaff.name,
      location: dbStaff.location,
      type: dbStaff.type,
      experience: dbStaff.experience,
      basicSalary: dbStaff.basic_salary,
      incentive: dbStaff.incentive,
      hra: dbStaff.hra,
      totalSalary: dbStaff.total_salary,
      joinedDate: dbStaff.joined_date,
      isActive: dbStaff.is_active
    };
  },

  mapToDatabase(staff: Omit<Staff, 'id'>): Omit<DatabaseStaff, 'id' | 'created_at' | 'updated_at'> {
    return {
      name: staff.name,
      location: staff.location,
      type: staff.type,
      experience: staff.experience,
      basic_salary: staff.basicSalary,
      incentive: staff.incentive,
      hra: staff.hra,
      total_salary: staff.totalSalary,
      joined_date: staff.joinedDate,
      is_active: staff.isActive
    };
  }
};
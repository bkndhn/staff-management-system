import { supabase } from '../lib/supabase';
import { Staff } from '../types';
import type { DatabaseStaff } from '../lib/supabase';

export const staffService = {
  async getAll(): Promise<Staff[]> {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching staff:', error);
      throw error;
    }

    return data.map(this.mapFromDatabase);
  },

  async create(staff: Omit<Staff, 'id'>): Promise<Staff> {
    // Get max display_order to set the new staff at the end
    const { data: maxData } = await supabase
      .from('staff')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1);

    const maxOrder = maxData && maxData.length > 0 ? (maxData[0].display_order || 0) : 0;
    const dbStaff = {
      ...this.mapToDatabase(staff),
      display_order: maxOrder + 1
    };

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

    if (updates.displayOrder !== undefined) (dbUpdates as any).display_order = updates.displayOrder;
    if (updates.salarySupplements !== undefined) (dbUpdates as any).salary_supplements = updates.salarySupplements;
    if (updates.mealAllowance !== undefined) (dbUpdates as any).meal_allowance = updates.mealAllowance;

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

  // Update staff order - batch update display_order for all staff
  async updateStaffOrder(staffIds: string[]): Promise<void> {
    try {
      // Update each staff member's display_order based on their position in the array
      const updates = staffIds.map((id, index) => ({
        id,
        display_order: index + 1,
        updated_at: new Date().toISOString()
      }));

      // Use upsert to update all records
      for (const update of updates) {
        const { error } = await supabase
          .from('staff')
          .update({ display_order: update.display_order, updated_at: update.updated_at })
          .eq('id', update.id);

        if (error) {
          console.error('Error updating staff order:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error in updateStaffOrder:', error);
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
      isActive: dbStaff.is_active,
      sundayPenalty: dbStaff.sunday_penalty ?? true,
      salaryCalculationDays: dbStaff.salary_calculation_days || 30,
      salarySupplements: dbStaff.salary_supplements || {},
      mealAllowance: dbStaff.meal_allowance || 0,
      displayOrder: dbStaff.display_order
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
      is_active: staff.isActive,
      sunday_penalty: staff.sundayPenalty ?? true,
      salary_calculation_days: staff.salaryCalculationDays || 30,
      salary_supplements: staff.salarySupplements || {},
      meal_allowance: staff.mealAllowance || 0
    };
  }
};
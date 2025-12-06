import { supabase } from '../lib/supabase';

export interface Location {
    id: string;
    name: string;
    is_active?: boolean;
}

export const locationService = {
    async getLocations(): Promise<Location[]> {
        const { data, error } = await supabase
            .from('locations')
            .select('id, display_name, is_active')
            .eq('is_active', true)
            .order('display_name');

        if (error) {
            console.error('Error fetching locations:', error);
            return [];
        }

        return (data || []).map(loc => ({
            id: loc.id,
            name: loc.display_name,
            is_active: loc.is_active
        }));
    },

    async addLocation(name: string): Promise<Location | null> {
        const { data, error } = await supabase
            .from('locations')
            .insert([{ display_name: name, is_active: true }])
            .select()
            .single();

        if (error) {
            console.error('Error adding location:', error);
            return null;
        }

        return {
            id: data.id,
            name: data.display_name,
            is_active: data.is_active
        };
    },

    async updateLocation(id: string, name: string): Promise<Location | null> {
        // First get the old location name
        const { data: oldData, error: fetchError } = await supabase
            .from('locations')
            .select('display_name')
            .eq('id', id)
            .single();

        if (fetchError) {
            console.error('Error fetching old location:', fetchError);
            return null;
        }

        const oldName = oldData.display_name;

        // Update the location
        const { data, error } = await supabase
            .from('locations')
            .update({ display_name: name })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating location:', error);
            return null;
        }

        // If name changed, update all staff with the old location name
        if (oldName && oldName !== name) {
            const { error: staffError } = await supabase
                .from('staff')
                .update({ location: name })
                .eq('location', oldName);

            if (staffError) {
                console.error('Error updating staff locations:', staffError);
            }
        }

        return {
            id: data.id,
            name: data.display_name
        };
    },

    async deleteLocation(id: string): Promise<boolean> {
        // Soft delete by setting is_active to false
        const { error } = await supabase
            .from('locations')
            .update({ is_active: false })
            .eq('id', id);

        if (error) {
            console.error('Error deleting location:', error);
            return false;
        }

        return true;
    }
};

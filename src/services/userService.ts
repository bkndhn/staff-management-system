import { supabase } from '../lib/supabase';
import { simpleHash } from '../lib/security';

export interface AppUser {
    id: string;
    email: string;
    full_name: string;
    role: 'admin' | 'manager';
    location: string | null;
    location_id?: string | null;
    password_hash?: string;
    is_active: boolean;
    last_login?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface CreateUserInput {
    email: string;
    password: string;
    full_name: string;
    role: 'admin' | 'manager';
    location?: string | null;
    location_id?: string | null;
}

export interface UpdateUserInput {
    email?: string;
    password?: string;
    full_name?: string;
    role?: 'admin' | 'manager';
    location?: string | null;
    location_id?: string | null;
    is_active?: boolean;
}

export const userService = {
    /**
     * Get all users (for admin settings page)
     */
    async getUsers(): Promise<AppUser[]> {
        const { data, error } = await supabase
            .from('app_users')
            .select('id, email, full_name, role, location, location_id, is_active, last_login, created_at, updated_at')
            .eq('is_active', true)
            .order('full_name');

        if (error) {
            console.error('Error fetching users:', error);
            return [];
        }

        return (data || []).map(user => ({
            ...user,
            role: user.role as 'admin' | 'manager',
            is_active: user.is_active ?? true
        }));
    },

    /**
     * Get user by email for login validation
     */
    async getUserByEmail(email: string): Promise<AppUser | null> {
        const { data, error } = await supabase
            .from('app_users')
            .select('*')
            .eq('email', email.toLowerCase())
            .eq('is_active', true)
            .single();

        if (error) {
            if (error.code !== 'PGRST116') { // Not found error
                console.error('Error fetching user:', error);
            }
            return null;
        }

        return data ? {
            ...data,
            role: data.role as 'admin' | 'manager',
            is_active: data.is_active ?? true
        } : null;
    },

    /**
     * Validate user login credentials and update last login
     */
    async validateLogin(email: string, password: string): Promise<AppUser | null> {
        const user = await this.getUserByEmail(email);

        if (!user || !user.password_hash) {
            return null;
        }

        // Compare password hash
        const passwordHash = simpleHash(password);
        if (user.password_hash !== passwordHash) {
            return null;
        }

        // Update last login timestamp
        await supabase
            .from('app_users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);

        // Return user without password hash
        const { password_hash, ...userWithoutPassword } = user;
        return { ...userWithoutPassword, last_login: new Date().toISOString() } as AppUser;
    },

    /**
     * Create a new user
     */
    async createUser(input: CreateUserInput): Promise<AppUser | null> {
        const passwordHash = simpleHash(input.password);

        const { data, error } = await supabase
            .from('app_users')
            .insert([{
                email: input.email.toLowerCase(),
                password_hash: passwordHash,
                full_name: input.full_name,
                role: input.role,
                location: input.location || null,
                location_id: input.location_id || null,
                is_active: true
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating user:', error);
            return null;
        }

        return data ? {
            ...data,
            role: data.role as 'admin' | 'manager',
            is_active: data.is_active ?? true
        } : null;
    },

    /**
     * Update an existing user
     */
    async updateUser(id: string, input: UpdateUserInput): Promise<AppUser | null> {
        const updates: Record<string, unknown> = {
            updated_at: new Date().toISOString()
        };

        if (input.email) updates.email = input.email.toLowerCase();
        if (input.full_name) updates.full_name = input.full_name;
        if (input.role) updates.role = input.role;
        if (input.location !== undefined) updates.location = input.location;
        if (input.location_id !== undefined) updates.location_id = input.location_id;
        if (input.is_active !== undefined) updates.is_active = input.is_active;
        if (input.password) updates.password_hash = simpleHash(input.password);

        const { data, error } = await supabase
            .from('app_users')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating user:', error);
            return null;
        }

        return data ? {
            ...data,
            role: data.role as 'admin' | 'manager',
            is_active: data.is_active ?? true
        } : null;
    },

    /**
     * Regenerate password for a user
     */
    async regeneratePassword(id: string): Promise<string | null> {
        const newPassword = this.generateRandomPassword();
        const passwordHash = simpleHash(newPassword);

        const { error } = await supabase
            .from('app_users')
            .update({
                password_hash: passwordHash,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) {
            console.error('Error regenerating password:', error);
            return null;
        }

        return newPassword;
    },

    /**
     * Generate a random password
     */
    generateRandomPassword(): string {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        let password = '';
        for (let i = 0; i < 10; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    },

    /**
     * Soft delete a user
     */
    async deleteUser(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('app_users')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            console.error('Error deleting user:', error);
            return false;
        }

        return true;
    },

    /**
     * Deactivate manager for a location
     */
    async deactivateManagerByLocation(locationId: string): Promise<boolean> {
        const { error } = await supabase
            .from('app_users')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('location_id', locationId)
            .eq('role', 'manager');

        if (error) {
            console.error('Error deactivating manager:', error);
            return false;
        }

        return true;
    },

    /**
     * Deactivate manager by location name
     */
    async deactivateManagerByLocationName(locationName: string): Promise<boolean> {
        const { error } = await supabase
            .from('app_users')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('location', locationName)
            .eq('role', 'manager');

        if (error) {
            console.error('Error deactivating manager:', error);
            return false;
        }

        return true;
    },

    /**
     * Generate default credentials for a new location
     */
    generateCredentialsForLocation(locationName: string): { email: string; password: string } {
        // Convert location name to lowercase and remove spaces/special chars
        const cleanName = locationName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const shortName = cleanName.substring(0, 3);
        const capShortName = shortName.charAt(0).toUpperCase() + shortName.slice(1);

        // Generate random 3-digit suffix for password
        const randomSuffix = Math.floor(100 + Math.random() * 900);

        return {
            email: `manager@${cleanName}.com`,
            password: `Mngr${capShortName}${randomSuffix}`
        };
    },

    /**
     * Create manager user for a new location
     */
    async createManagerForLocation(locationName: string, locationId?: string): Promise<{ user: AppUser | null; credentials: { email: string; password: string } }> {
        const credentials = this.generateCredentialsForLocation(locationName);

        const user = await this.createUser({
            email: credentials.email,
            password: credentials.password,
            full_name: `${locationName} Manager`,
            role: 'manager',
            location: locationName,
            location_id: locationId
        });

        return { user, credentials };
    }
};

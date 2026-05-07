import { writable, get } from 'svelte/store';
import type { User } from 'firebase/auth';

interface AuthState {
	user: User | null;
	loading: boolean;
	checked: boolean;
	// Role info from Firestore
	role: string | null;
	roleId: string | null;
	// Karyawan name from Directus (for project filtering)
	karyawanName: string | null;
}

export const authStore = writable<AuthState>({
	user: null,
	loading: true,
	checked: false,
	role: null,
	roleId: null,
	karyawanName: null
});

export function getUserDisplay(user: User | null): string {
	if (!user) return 'LEADER';
	return user.displayName || user.email?.split('@')[0]?.toUpperCase() || 'LEADER';
}

export function getUserInitials(user: User | null): string {
	return getUserDisplay(user).substring(0, 2).toUpperCase();
}

/**
 * Check if user is a leader role (should see filtered projects)
 */
export function isLeaderRole(roleId: string | null): boolean {
	return roleId === 'leader';
}

/**
 * Check if user is a super admin (sees everything)
 */
export function isSuperAdminRole(roleId: string | null): boolean {
	return roleId === 'super_admin';
}

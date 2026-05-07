import { db } from '$lib/firebase';
import {
	collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
	query, where, orderBy, Timestamp
} from 'firebase/firestore';

// Matches the existing Firestore structure from your screenshot
export interface AppUser {
	id?: string; // Document ID (Firebase Auth UID)
	email: string;
	firstName: string;
	lastName: string;
	role: string;
	roleId: string;
	department: string;
	departmentId: string;
	phone: string;
	createdAt?: any;
	updatedAt?: any;
}

// Collection name in Firestore — change if yours is different
const COLLECTION_NAME = 'users';

export const ROLE_LABELS: Record<string, string> = {
	super_admin: 'Super Admin',
	admin_project: 'Admin Proyek',
	leader: 'Leader Proyek',
	finance: 'Finance',
	hrd: 'HRD',
	director: 'Direktur',
	manager: 'Manager',
	staff: 'Staff'
};

export const ROLE_OPTIONS = [
	{ id: 'super_admin', label: 'Super Admin', desc: 'Akses penuh ke semua fitur' },
	{ id: 'admin_project', label: 'Admin Proyek', desc: 'Kelola proyek dan verifikasi laporan' },
	{ id: 'leader', label: 'Leader Proyek', desc: 'Input laporan harian dan ajukan anggaran' },
	{ id: 'finance', label: 'Finance', desc: 'Kelola pencairan anggaran' },
	{ id: 'hrd', label: 'HRD', desc: 'Human resource management' },
	{ id: 'director', label: 'Direktur', desc: 'Approval dan oversight' },
	{ id: 'manager', label: 'Manager', desc: 'Manajemen tim dan proyek' },
	{ id: 'staff', label: 'Staff', desc: 'Akses dasar' }
];

export async function getAppUsers(): Promise<AppUser[]> {
	try {
		const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
		const snapshot = await getDocs(q);
		return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppUser));
	} catch (error) {
		console.error('Gagal memuat users dari Firestore:', error);
		return [];
	}
}

export async function getAppUserById(uid: string): Promise<AppUser | null> {
	try {
		const docRef = doc(db, COLLECTION_NAME, uid);
		const docSnap = await getDoc(docRef);
		if (docSnap.exists()) {
			return { id: docSnap.id, ...docSnap.data() } as AppUser;
		}
		return null;
	} catch (error) {
		console.error('Gagal memuat user:', error);
		return null;
	}
}

export async function getAppUserByEmail(email: string): Promise<AppUser | null> {
	try {
		const q = query(
			collection(db, COLLECTION_NAME),
			where('email', '==', email.toLowerCase())
		);
		const snapshot = await getDocs(q);
		if (!snapshot.empty) {
			const d = snapshot.docs[0];
			return { id: d.id, ...d.data() } as AppUser;
		}
		return null;
	} catch (error) {
		console.error('Gagal mencari user by email:', error);
		return null;
	}
}

export async function createAppUser(uid: string, data: Partial<AppUser>): Promise<boolean> {
	try {
		const now = Timestamp.now();
		await setDoc(doc(db, COLLECTION_NAME, uid), {
			email: data.email?.toLowerCase() || '',
			firstName: data.firstName || '',
			lastName: data.lastName || '',
			role: data.role || 'staff',
			roleId: data.roleId || data.role || 'staff',
			department: data.department || '',
			departmentId: data.departmentId || '',
			phone: data.phone || '',
			createdAt: now,
			updatedAt: now
		});
		return true;
	} catch (error) {
		console.error('Gagal membuat user di Firestore:', error);
		return false;
	}
}

export async function updateAppUser(uid: string, data: Partial<AppUser>): Promise<boolean> {
	try {
		const updateData: Record<string, any> = { updatedAt: Timestamp.now() };
		if (data.firstName !== undefined) updateData.firstName = data.firstName;
		if (data.lastName !== undefined) updateData.lastName = data.lastName;
		if (data.role !== undefined) {
			updateData.role = data.role;
			updateData.roleId = data.roleId || data.role;
		}
		if (data.department !== undefined) updateData.department = data.department;
		if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
		if (data.phone !== undefined) updateData.phone = data.phone;
		if (data.email !== undefined) updateData.email = data.email.toLowerCase();

		await updateDoc(doc(db, COLLECTION_NAME, uid), updateData);
		return true;
	} catch (error) {
		console.error('Gagal update user:', error);
		return false;
	}
}

export async function deleteAppUser(uid: string): Promise<boolean> {
	try {
		await deleteDoc(doc(db, COLLECTION_NAME, uid));
		return true;
	} catch (error) {
		console.error('Gagal hapus user:', error);
		return false;
	}
}

// Helper: get display name from Firestore user
export function getDisplayName(user: AppUser): string {
	const first = user.firstName || '';
	const last = user.lastName || '';
	return `${first} ${last}`.trim() || user.email || '-';
}

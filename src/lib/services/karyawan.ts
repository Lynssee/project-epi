import directus, { handleDirectusError } from './directus';
import { readItems } from '@directus/sdk';

export interface Karyawan {
	id: number;
	nama_karyawan: string;
	email: string;
	email_company: string;
	divisi: string;
	no_hp: string;
	status: string;
	id_karyawan: string;
	posisi: string;
}

/**
 * Get karyawan by company email (email_company field)
 * Used to match Firebase Auth email → karyawan name → project leader
 */
export async function getKaryawanByEmail(email: string): Promise<Karyawan | null> {
	try {
		// Search both email fields
		const result = await directus.request(
			readItems('karyawan', {
				filter: {
					_or: [
						{ email_company: { _eq: email.toLowerCase() } },
						{ email: { _eq: email.toLowerCase() } }
					]
				},
				fields: ['id', 'nama_karyawan', 'email', 'email_company', 'divisi', 'no_hp', 'status', 'id_karyawan', 'posisi'],
				limit: 1
			})
		);
		return (result && result.length > 0) ? result[0] as Karyawan : null;
	} catch (error) {
		handleDirectusError(error);
		return null;
	}
}

/**
 * Get karyawan by nama_karyawan (exact match)
 */
export async function getKaryawanByName(name: string): Promise<Karyawan | null> {
	try {
		const result = await directus.request(
			readItems('karyawan', {
				filter: { nama_karyawan: { _eq: name } },
				fields: ['id', 'nama_karyawan', 'email', 'email_company', 'divisi', 'no_hp', 'status'],
				limit: 1
			})
		);
		return (result && result.length > 0) ? result[0] as Karyawan : null;
	} catch (error) {
		handleDirectusError(error);
		return null;
	}
}

/**
 * Get all karyawan (for admin)
 */
export async function getAllKaryawan(): Promise<Karyawan[]> {
	try {
		const result = await directus.request(
			readItems('karyawan', {
				fields: ['id', 'nama_karyawan', 'email', 'email_company', 'divisi', 'no_hp', 'status', 'posisi'],
				sort: ['nama_karyawan'],
				limit: 500
			})
		);
		return (result || []) as Karyawan[];
	} catch (error) {
		handleDirectusError(error);
		return [];
	}
}

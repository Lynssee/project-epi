import directus, { handleDirectusError } from './directus';
import { readItems, createItem, readItem } from '@directus/sdk';

export async function getPengajuanAnggaran(limit = 10) {
	try {
		const result = await directus.request(
			readItems('pengajuan_anggaran', {
				limit,
				sort: ['-date_created']
			})
		);
		return result; // array directly
	} catch (error) {
		handleDirectusError(error);
		return [];
	}
}

export async function getPengajuanById(id: string | number) {
	try {
		const result = await directus.request(readItem('pengajuan_anggaran', id));
		return result; // object directly
	} catch (error) {
		handleDirectusError(error);
		return null;
	}
}

export async function createPengajuanAnggaran(data: any) {
	try {
		return await directus.request(createItem('pengajuan_anggaran', data));
	} catch (error) {
		handleDirectusError(error);
		return null;
	}
}

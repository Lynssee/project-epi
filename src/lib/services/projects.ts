import directus, { handleDirectusError } from './directus';
import { readItems, readItem } from '@directus/sdk';

export async function getProjects(leaderName?: string) {
	try {
		const filter: Record<string, any> = {};
		if (leaderName) {
			filter.leader = { _eq: leaderName };
		}
		const result = await directus.request(
			readItems('projects', {
				filter,
				fields: ['id', 'name', 'status', 'lokasi', 'leader', 'description', 'jenis_project'],
				sort: ['-date_created']
			})
		);
		return result; // readItems returns array directly
	} catch (error) {
		handleDirectusError(error);
		return [];
	}
}

export async function getProjectById(id: string | number) {
	try {
		const result = await directus.request(
			readItem('projects', id, {
				fields: ['id', 'name', 'status', 'lokasi', 'leader', 'packing_list', 'description', 'jenis_project', 'progress_details']
			})
		);
		return result; // readItem returns object directly
	} catch (error) {
		handleDirectusError(error);
		return null;
	}
}

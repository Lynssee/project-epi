import directus, { handleDirectusError } from './directus';
import { readItems, createItem } from '@directus/sdk';

export async function getReports(projectId?: string | number) {
	try {
		const filter: Record<string, any> = {};
		if (projectId) {
			filter.project_id = { _eq: projectId };
		}
		const result = await directus.request(
			readItems('reports', {
				filter,
				sort: ['-date_created']
			})
		);
		return result; // array directly
	} catch (error) {
		handleDirectusError(error);
		return [];
	}
}

export async function getBatchedReports(projectIds: (string | number)[]) {
	try {
		if (!projectIds || projectIds.length === 0) return [];
		const result = await directus.request(
			readItems('reports', {
				filter: {
					project_id: { _in: projectIds as string[] }
				},
				sort: ['-date_created'],
				limit: 200
			})
		);
		return result;
	} catch (error) {
		handleDirectusError(error);
		return [];
	}
}

export async function getReportByProjectAndDate(projectId: string | number, date: string) {
	try {
		const result = await directus.request(
			readItems('reports', {
				filter: {
					project_id: { _eq: projectId },
					date: { _eq: date }
				},
				limit: 1
			})
		);
		return result.length > 0 ? result[0] : null;
	} catch (error) {
		handleDirectusError(error);
		return null;
	}
}

export async function submitReport(reportData: any) {
	try {
		return await directus.request(createItem('reports', reportData));
	} catch (error) {
		handleDirectusError(error);
		return null;
	}
}

export async function uploadFile(file: File) {
	try {
		const formData = new FormData();
		formData.append('file', file);
		const { uploadFiles } = await import('@directus/sdk');
		const result = await directus.request(uploadFiles(formData));
		return result;
	} catch (error) {
		console.error('Gagal mengunggah file:', error);
		return null;
	}
}

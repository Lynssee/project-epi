import directus, { handleDirectusError } from './directus';
import { readItems, readItem, updateItem, createItem } from '@directus/sdk';

export interface PackingListItem {
	material_name: string;
	material_color?: string;
	qty: number;
	unit: string;
	unit_price: number;
	description?: string;
}

/**
 * Buat item packing list baru ke project_budgets.
 * Leader menginput item material langsung di aplikasi (menggantikan Excel).
 * Setiap item dibuat dengan packing_status = 'requested'.
 */
export async function createPackingListItems(
	projectId: number,
	items: PackingListItem[],
	pic: string
) {
	try {
		const promises = items.map((item) =>
			directus.request(
				createItem('project_budgets', {
					project_id: projectId,
					budget_category: 'material',
					material_name: item.material_name,
					material_color: item.material_color || '',
					qty: item.qty,
					unit: item.unit,
					unit_price: item.unit_price,
					planned_amount: item.qty * item.unit_price,
					actual_amount: 0,
					variance: item.qty * item.unit_price,
					description: item.description || item.material_name,
					pic: pic,
					packing_status: 'requested',
					qty_sudah_dikirim: 0
				})
			)
		);
		await Promise.all(promises);
		return true;
	} catch (error) {
		handleDirectusError(error);
		return false;
	}
}

/**
 * Ambil item RAB (project_budgets) yang bisa di-request packing.
 * Filter: project tertentu, packing_status masih null (belum pernah diajukan).
 */
export async function getProjectBudgetItems(projectId: number) {
	try {
		const result = await directus.request(
			readItems('project_budgets', {
				filter: {
					project_id: { _eq: projectId },
					packing_status: { _null: true }
				},
				fields: [
					'id', 'project_id', 'budget_category', 'material_name', 'material_color',
					'qty', 'unit', 'unit_price', 'description', 'pic',
					'identitas_barang_id', 'qty_sudah_dikirim', 'packing_status',
					'category_code', 'category_label'
				],
				sort: ['sort_order', 'id'],
				limit: 500
			})
		);
		return result || [];
	} catch (error) {
		handleDirectusError(error);
		return [];
	}
}

/**
 * Submit pengajuan packing list — batch update packing_status = 'requested'
 * pada item RAB yang dipilih oleh leader.
 */
export async function submitPackingRequest(budgetItemIds: number[]) {
	try {
		const promises = budgetItemIds.map((id) =>
			directus.request(
				updateItem('project_budgets', id, {
					packing_status: 'requested'
				})
			)
		);
		await Promise.all(promises);
		return true;
	} catch (error) {
		handleDirectusError(error);
		return false;
	}
}

/**
 * Ambil item RAB yang sudah diajukan packing (packing_status != null).
 * Bisa filter by project atau ambil semua.
 */
export async function getPackingRequests(projectId?: number) {
	try {
		const filter: Record<string, any> = {
			packing_status: { _nnull: true }
		};
		if (projectId) {
			filter.project_id = { _eq: projectId };
		}
		const result = await directus.request(
			readItems('project_budgets', {
				filter,
				fields: [
					'id', 'project_id', 'budget_category', 'material_name', 'material_color',
					'qty', 'unit', 'unit_price', 'description', 'pic',
					'identitas_barang_id', 'qty_sudah_dikirim', 'packing_status',
					'category_code', 'category_label', 'date_created'
				],
				sort: ['-date_created'],
				limit: 500
			})
		);
		return result || [];
	} catch (error) {
		handleDirectusError(error);
		return [];
	}
}

/**
 * Ambil inventory proyek — data dari project_expenses yang expense_type = 'supplier'.
 * Ini adalah material yang sudah dikirim via Surat Jalan.
 */
export async function getProjectInventory(projectId: number) {
	try {
		const result = await directus.request(
			readItems('project_expenses', {
				filter: {
					project_id: { _eq: projectId },
					expense_type: { _eq: 'supplier' }
				},
				fields: [
					'id', 'project_id', 'expense_type', 'reference_number',
					'material_name', 'material_color', 'qty', 'unit', 'unit_price',
					'qty_used', 'qty_remaining', 'expense_amount', 'expense_date',
					'description', 'surat_jalan_id'
				],
				sort: ['-expense_date'],
				limit: 500
			})
		);
		return result || [];
	} catch (error) {
		handleDirectusError(error);
		return [];
	}
}

/**
 * Update pemakaian material di proyek.
 * qty_remaining otomatis dihitung: qty - qtyUsed.
 */
export async function updateMaterialUsage(expenseId: number, qtyUsed: number, totalQty: number) {
	try {
		const qtyRemaining = totalQty - qtyUsed;
		await directus.request(
			updateItem('project_expenses', expenseId, {
				qty_used: qtyUsed,
				qty_remaining: qtyRemaining < 0 ? 0 : qtyRemaining
			})
		);
		return true;
	} catch (error) {
		handleDirectusError(error);
		return false;
	}
}

/**
 * Ambil summary inventory untuk semua project yang punya material (supplier expenses).
 * Dipakai di halaman accordion.
 */
export async function getAllProjectsInventory() {
	try {
		const result = await directus.request(
			readItems('project_expenses', {
				filter: {
					expense_type: { _eq: 'supplier' }
				},
				fields: [
					'id', 'project_id', 'reference_number',
					'material_name', 'material_color', 'qty', 'unit', 'unit_price',
					'qty_used', 'qty_remaining', 'expense_amount', 'expense_date',
					'surat_jalan_id'
				],
				sort: ['project_id', '-expense_date'],
				limit: 1000
			})
		);
		return result || [];
	} catch (error) {
		handleDirectusError(error);
		return [];
	}
}

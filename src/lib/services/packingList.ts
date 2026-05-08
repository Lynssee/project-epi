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

// Template interfaces
export interface TemplateItem {
	id?: number;
	template_name: string;
	budget_category: string;
	material_name: string;
	material_color?: string;
	qty: number;
	unit: string;
	description?: string;
	pic?: string;
	date_created?: string;
}

export interface Template {
	name: string;
	item_count: number;
	total_qty: number;
	categories: string[];
	date_created: string;
}

export interface TemplateItemInput {
	budget_category: string;
	material_name: string;
	material_color?: string;
	qty: number;
	unit: string;
	description?: string;
	pic?: string;
}

export interface LoadTemplateResult {
	added: number;
	skipped: number;
	total: number;
	duplicates: string[];
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

// ============================================
// TEMPLATE MANAGEMENT FUNCTIONS
// ============================================

/**
 * Fetch semua templates dengan metadata.
 * Templates adalah items di project_budgets dengan is_template=true dan project_id=null.
 * Dikelompokkan berdasarkan template_name.
 */
export async function getPackingListTemplates(): Promise<Template[]> {
	try {
		const result = await directus.request(
			readItems('project_budgets', {
				filter: {
					_and: [
						{ is_template: { _eq: true } },
						{ project_id: { _null: true } }
					]
				},
				fields: [
					'id', 'template_name', 'budget_category', 'material_name',
					'qty', 'date_created'
				],
				sort: ['template_name', 'date_created'],
				limit: -1
			})
		);

		// Group by template_name dan hitung metadata
		const grouped: Record<string, any> = {};
		for (const item of result) {
			const name = item.template_name || 'Untitled';
			if (!grouped[name]) {
				grouped[name] = {
					name,
					item_count: 0,
					total_qty: 0,
					categories: new Set<string>(),
					date_created: item.date_created
				};
			}
			grouped[name].item_count++;
			grouped[name].total_qty += item.qty || 0;
			if (item.budget_category) {
				grouped[name].categories.add(item.budget_category);
			}
		}

		// Convert to array
		return Object.values(grouped).map((t) => ({
			name: t.name,
			item_count: t.item_count,
			total_qty: t.total_qty,
			categories: Array.from(t.categories),
			date_created: t.date_created
		}));
	} catch (error) {
		handleDirectusError(error);
		return [];
	}
}

/**
 * Fetch items untuk template tertentu.
 */
export async function getTemplateItems(templateName: string): Promise<TemplateItem[]> {
	try {
		const result = await directus.request(
			readItems('project_budgets', {
				filter: {
					_and: [
						{ is_template: { _eq: true } },
						{ template_name: { _eq: templateName } }
					]
				},
				fields: [
					'id', 'template_name', 'budget_category', 'material_name',
					'material_color', 'qty', 'unit', 'description', 'pic', 'date_created'
				],
				sort: ['budget_category', 'date_created'],
				limit: -1
			})
		);
		return result as TemplateItem[];
	} catch (error) {
		handleDirectusError(error);
		return [];
	}
}

/**
 * Create item baru dalam template.
 */
export async function createTemplateItem(
	templateName: string,
	itemData: TemplateItemInput
): Promise<boolean> {
	try {
		await directus.request(
			createItem('project_budgets', {
				is_template: true,
				template_name: templateName,
				project_id: null,
				budget_category: itemData.budget_category,
				material_name: itemData.material_name,
				material_color: itemData.material_color || '',
				qty: itemData.qty,
				unit: itemData.unit,
				description: itemData.description || itemData.material_name,
				pic: itemData.pic || '',
				unit_price: 0,
				planned_amount: 0,
				actual_amount: 0,
				variance: 0
			})
		);
		return true;
	} catch (error) {
		handleDirectusError(error);
		return false;
	}
}

/**
 * Update item dalam template.
 */
export async function updateTemplateItem(
	itemId: number,
	itemData: Partial<TemplateItemInput>
): Promise<boolean> {
	try {
		const updateData: any = {};
		if (itemData.budget_category !== undefined) updateData.budget_category = itemData.budget_category;
		if (itemData.material_name !== undefined) updateData.material_name = itemData.material_name;
		if (itemData.material_color !== undefined) updateData.material_color = itemData.material_color;
		if (itemData.qty !== undefined) updateData.qty = itemData.qty;
		if (itemData.unit !== undefined) updateData.unit = itemData.unit;
		if (itemData.description !== undefined) updateData.description = itemData.description;
		if (itemData.pic !== undefined) updateData.pic = itemData.pic;

		await directus.request(
			updateItem('project_budgets', itemId, updateData)
		);
		return true;
	} catch (error) {
		handleDirectusError(error);
		return false;
	}
}

/**
 * Delete single item dari template.
 */
export async function deleteTemplateItem(itemId: number): Promise<boolean> {
	try {
		await directus.request(
			updateItem('project_budgets', itemId, { status: 'archived' })
		);
		return true;
	} catch (error) {
		handleDirectusError(error);
		return false;
	}
}

/**
 * Delete entire template (semua items dengan template_name yang sama).
 */
export async function deleteTemplate(templateName: string): Promise<boolean> {
	try {
		// Fetch all items with this template name
		const items = await getTemplateItems(templateName);

		// Delete each item
		const promises = items.map((item) =>
			item.id ? deleteTemplateItem(item.id) : Promise.resolve(false)
		);
		await Promise.all(promises);
		return true;
	} catch (error) {
		handleDirectusError(error);
		return false;
	}
}

/**
 * Check duplicate items sebelum load template.
 * Compare berdasarkan material_name + budget_category.
 */
export async function checkDuplicateItems(
	projectId: number,
	templateItems: TemplateItem[]
): Promise<string[]> {
	try {
		// Fetch existing project items
		const existingItems = await directus.request(
			readItems('project_budgets', {
				filter: {
					_and: [
						{ project_id: { _eq: projectId } },
						{
							_or: [
								{ is_template: { _eq: false } },
								{ is_template: { _null: true } }
							]
						}
					]
				},
				fields: ['material_name', 'budget_category', 'description'],
				limit: -1
			})
		);

		// Create set of existing keys
		const existingKeys = new Set(
			existingItems.map((item: any) => {
				const name = (item.material_name || item.description || '').toLowerCase().trim();
				return `${item.budget_category}::${name}`;
			})
		);

		// Check for duplicates
		const duplicates: string[] = [];
		for (const item of templateItems) {
			const name = (item.material_name || item.description || '').toLowerCase().trim();
			const key = `${item.budget_category}::${name}`;
			if (existingKeys.has(key)) {
				duplicates.push(item.material_name || item.description || 'Unknown');
			}
		}

		return duplicates;
	} catch (error) {
		handleDirectusError(error);
		return [];
	}
}

/**
 * Load template items ke project.
 * 1. Fetch template items
 * 2. Check duplicates
 * 3. Create new project_budgets entries (skip duplicates)
 * 4. Return result summary
 */
export async function loadTemplateToProject(
	templateName: string,
	projectId: number,
	pic: string = 'Leader'
): Promise<LoadTemplateResult> {
	try {
		// 1. Fetch template items
		const templateItems = await getTemplateItems(templateName);
		if (templateItems.length === 0) {
			return { added: 0, skipped: 0, total: 0, duplicates: [] };
		}

		// 2. Check duplicates
		const duplicateNames = await checkDuplicateItems(projectId, templateItems);
		const duplicateSet = new Set(
			duplicateNames.map((name) => name.toLowerCase().trim())
		);

		// 3. Filter out duplicates
		const itemsToAdd = templateItems.filter((item) => {
			const name = (item.material_name || item.description || '').toLowerCase().trim();
			return !duplicateSet.has(name);
		});

		// 4. Create new project items
		const promises = itemsToAdd.map((item) =>
			directus.request(
				createItem('project_budgets', {
					project_id: projectId,
					budget_category: item.budget_category,
					material_name: item.material_name,
					material_color: item.material_color || '',
					qty: item.qty,
					unit: item.unit,
					description: item.description || item.material_name,
					pic: pic,
					unit_price: 0,
					planned_amount: 0,
					actual_amount: 0,
					variance: 0,
					packing_status: null,
					qty_sudah_dikirim: 0
				})
			)
		);
		await Promise.all(promises);

		return {
			added: itemsToAdd.length,
			skipped: duplicateNames.length,
			total: templateItems.length,
			duplicates: duplicateNames
		};
	} catch (error) {
		handleDirectusError(error);
		return { added: 0, skipped: 0, total: 0, duplicates: [] };
	}
}


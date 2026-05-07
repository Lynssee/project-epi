// Project Accounting & Revenue Recognition API Service
import { fetchInvoices, generateTrialBalance } from './financeApi.js';

const API_URL = import.meta.env.VITE_DIRECTUS_API_URL;
const TOKEN = import.meta.env.VITE_DIRECTUS_TOKEN;

// ==================== PROJECTS ====================

/**
 * Projects eligible for Surat Jalan / delivery context (Inventory).
 * Mirrors "List Project" in the Project module: excludes finished/cancelled.
 * Includes PO-jasa style rows (linked so_customer_id, jenis_project, nomor_po).
 */
export async function getProjectsForInventorySuratJalan() {
  const res = await getProjects();
  if (!res.success) {
    return { data: [], meta: {}, success: false, error: res.error };
  }
  const terminal = new Set(['completed', 'done', 'cancelled', 'canceled']);
  const data = (res.data || []).filter((p) => {
    const s = (p.status || '').toLowerCase();
    return !terminal.has(s);
  });
  return {
    data,
    meta: res.meta || {},
    success: true,
    count: data.length,
  };
}

/** Get projects with optional Directus filters (customer_id, status, project_type). */
export async function getProjects(filters = {}) {
  try {
    let url = `${API_URL}/items/projects?sort=-date_created&limit=-1`;

    if (filters.customer_id) {
      url += `&filter[customer_id][_eq]=${filters.customer_id}`;
    }

    if (filters.status) {
      url += `&filter[status][_eq]=${filters.status}`;
    }

    if (filters.project_type) {
      url += `&filter[project_type][_eq]=${filters.project_type}`;
    }

    url += '&fields=id,name,description,status,lokasi,nomor_po,start_date,end_date,jenis_project,leader,sales,target_progress,total_progress,customer,so_customer_id,date_created';

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch projects');
    }

    const result = await response.json();
    return {
      data: result.data || [],
      meta: result.meta || {},
      success: true
    };
  } catch (error) {
    console.error('Error fetching projects:', error);
    return {
      data: [],
      meta: {},
      success: false,
      error: error.message
    };
  }
}

/**
 * Get project by ID
 * @param {number} projectId - Project ID
 * @returns {Promise<object>} Project data
 */
export async function getProjectDetails(projectId) {
  try {
    const response = await fetch(
      `${API_URL}/items/projects/${projectId}?fields=*`,
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch project details');
    }

    const result = await response.json();
    return {
      data: result.data,
      success: true
    };
  } catch (error) {
    console.error('Error fetching project details:', error);
    return {
      data: null,
      success: false,
      error: error.message
    };
  }
}

/**
 * Create new project
 * @param {object} projectData - Project data
 * @returns {Promise<object>} Created project
 */
export async function createProject(projectData) {
  try {
    // Validation
    if (!projectData.project_name || !projectData.customer_id || !projectData.start_date || !projectData.end_date) {
      throw new Error('Project name, customer ID, start date, and end date are required');
    }

    // Generate project code if not provided
    const projectCode = projectData.project_code || `PRJ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    const payload = {
      ...projectData,
      project_code: projectCode,
      status: 'Planning',
      completion_percentage: 0,
      created_at: new Date().toISOString()
    };

    const response = await fetch(`${API_URL}/items/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Failed to create project');
    }

    const result = await response.json();
    return {
      data: result.data,
      success: true,
      message: 'Project created successfully'
    };
  } catch (error) {
    console.error('Error creating project:', error);
    return {
      data: null,
      success: false,
      error: error.message
    };
  }
}

/**
 * Update project
 * @param {number} projectId - Project ID
 * @param {object} projectData - Project data to update
 * @returns {Promise<object>} Updated project
 */
export async function updateProject(projectId, projectData) {
  try {
    const response = await fetch(`${API_URL}/items/projects/${projectId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...projectData,
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Failed to update project');
    }

    const result = await response.json();
    return {
      data: result.data,
      success: true,
      message: 'Project updated successfully'
    };
  } catch (error) {
    console.error('Error updating project:', error);
    return {
      data: null,
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete project
 * @param {number} projectId - Project ID
 * @returns {Promise<object>} Result
 */
export async function deleteProject(projectId) {
  try {
    const response = await fetch(`${API_URL}/items/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to delete project');
    }

    return {
      success: true,
      message: 'Project deleted successfully'
    };
  } catch (error) {
    console.error('Error deleting project:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ==================== PROJECT MILESTONES ====================

/**
 * Get project milestones
 * @param {number} projectId - Project ID
 * @returns {Promise<object>} Milestones data
 */
export async function getProjectMilestones(projectId) {
  try {
    const url = `${API_URL}/items/project_milestones?filter[project_id][_eq]=${projectId}&sort=milestone_order&limit=-1`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch project milestones');
    }

    const result = await response.json();
    return {
      data: result.data || [],
      success: true
    };
  } catch (error) {
    console.error('Error fetching project milestones:', error);
    return {
      data: [],
      success: false,
      error: error.message
    };
  }
}

/**
 * Create project milestone
 * @param {object} milestoneData - Milestone data
 * @returns {Promise<object>} Created milestone
 */
export async function createProjectMilestone(milestoneData) {
  try {
    const response = await fetch(`${API_URL}/items/project_milestones`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...milestoneData,
        completion_percentage: 0,
        status: 'Pending',
        created_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Failed to create milestone');
    }

    const result = await response.json();
    return {
      data: result.data,
      success: true,
      message: 'Milestone created successfully'
    };
  } catch (error) {
    console.error('Error creating milestone:', error);
    return {
      data: null,
      success: false,
      error: error.message
    };
  }
}

/**
 * Update project milestone
 * @param {number} milestoneId - Milestone ID
 * @param {object} milestoneData - Milestone data to update
 * @returns {Promise<object>} Updated milestone
 */
export async function updateProjectMilestone(milestoneId, milestoneData) {
  try {
    const response = await fetch(`${API_URL}/items/project_milestones/${milestoneId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...milestoneData,
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Failed to update milestone');
    }

    const result = await response.json();

    // Update project completion percentage if milestone is completed
    if (milestoneData.status === 'Completed' && milestoneData.project_id) {
      await recalculateProjectCompletion(milestoneData.project_id);
    }

    return {
      data: result.data,
      success: true,
      message: 'Milestone updated successfully'
    };
  } catch (error) {
    console.error('Error updating milestone:', error);
    return {
      data: null,
      success: false,
      error: error.message
    };
  }
}

/**
 * Recalculate project completion percentage based on milestones
 * @param {number} projectId - Project ID
 * @returns {Promise<object>} Result
 */
async function recalculateProjectCompletion(projectId) {
  try {
    // Get all milestones
    const milestonesResponse = await getProjectMilestones(projectId);
    const milestones = milestonesResponse.data || [];

    if (milestones.length === 0) {
      return { success: true };
    }

    // Calculate average completion
    const totalCompletion = milestones.reduce((sum, m) => sum + (m.completion_percentage || 0), 0);
    const avgCompletion = totalCompletion / milestones.length;

    // Update project
    await fetch(`${API_URL}/items/projects/${projectId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        completion_percentage: Math.round(avgCompletion)
      })
    });

    return { success: true };
  } catch (error) {
    console.error('Error recalculating project completion:', error);
    return { success: false, error: error.message };
  }
}

// ==================== PROJECT BUDGETS ====================

/**
 * Get project budgets
 * @param {number} projectId - Project ID
 * @returns {Promise<object>} Project budgets
 */
export async function getProjectBudgets(projectId) {
  try {
    const url = `${API_URL}/items/project_budgets?filter[project_id][_eq]=${projectId}&limit=-1`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch project budgets');
    }

    const result = await response.json();
    return {
      data: result.data || [],
      success: true
    };
  } catch (error) {
    console.error('Error fetching project budgets:', error);
    return {
      data: [],
      success: false,
      error: error.message
    };
  }
}

/**
 * Create project budget
 * @param {object} budgetData - Budget data
 * @returns {Promise<object>} Created budget
 */
export async function createProjectBudget(budgetData) {
  try {
    const payload = {
      project_id: budgetData.project_id,
      budget_category: budgetData.budget_category,
      planned_amount: parseFloat(budgetData.planned_amount) || 0,
      actual_amount: 0,
      variance: parseFloat(budgetData.planned_amount) || 0,
      description: budgetData.description || '',
      pic: budgetData.pic || '',
      reference_number: budgetData.reference_number || '',
      material_name: budgetData.material_name || '',
      material_color: budgetData.material_color || '',
      qty: budgetData.qty ? parseFloat(budgetData.qty) : null,
      unit: budgetData.unit || '',
      unit_price: budgetData.unit_price ? parseFloat(budgetData.unit_price) : null,
      koefisien: budgetData.koefisien ? parseFloat(budgetData.koefisien) : null,
      payment_type: budgetData.payment_type || 'sekali',
      payment_reminder_date: budgetData.payment_reminder_date || null,
      recurrence_period: budgetData.recurrence_period || null
    };

    // Auto-set packing_status for barang-related categories
    const packingCategories = ['supplier', 'sewa_alat', 'consumable'];
    if (packingCategories.includes(budgetData.budget_category)) {
      payload.packing_status = 'draft';
    }

    const response = await fetch(`${API_URL}/items/project_budgets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Gagal menyimpan RAB');
    }

    const result = await response.json();
    return {
      data: result.data,
      success: true,
      message: 'RAB berhasil disimpan'
    };
  } catch (error) {
    console.error('Error creating project budget:', error);
    return {
      data: null,
      success: false,
      error: error.message
    };
  }
}

/**
 * Update project budget
 * @param {number} budgetId - Budget ID
 * @param {object} budgetData - Budget data to update
 * @returns {Promise<object>} Updated budget
 */
export async function updateProjectBudget(budgetId, budgetData) {
  try {
    // Pastikan data ini tidak ada undefined (directus akan error jika undefined dilempar ke patch)
    const payload = { ...budgetData };
    if (payload.payment_type === undefined) delete payload.payment_type;
    if (payload.payment_reminder_date === undefined) delete payload.payment_reminder_date;
    if (payload.recurrence_period === undefined) delete payload.recurrence_period;

    const response = await fetch(`${API_URL}/items/project_budgets/${budgetId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Failed to update project budget');
    }

    const result = await response.json();
    return {
      data: result.data,
      success: true,
      message: 'Project budget updated successfully'
    };
  } catch (error) {
    console.error('Error updating project budget:', error);
    return {
      data: null,
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete project budget item
 * @param {number} budgetId - Budget ID
 * @returns {Promise<object>} Result
 */
export async function deleteProjectBudget(budgetId) {
  try {
    const response = await fetch(`${API_URL}/items/project_budgets/${budgetId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error('Gagal menghapus RAB');
    }

    return { success: true, message: 'RAB berhasil dihapus' };
  } catch (error) {
    console.error('Error deleting project budget:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get project budgets filtered by category
 * Fetches BOTH RAB items AND packing-only items for the same category
 * @param {number} projectId - Project ID
 * @param {string} category - Budget category (operasional/supplier/jasa/sewa_alat)
 * @returns {Promise<object>} Filtered budgets with _source tag
 */
export async function getProjectBudgetsByCategory(projectId, category) {
  try {
    const packingCategory = `packing_${category}`;
    const filter = JSON.stringify({
      _and: [
        { project_id: { _eq: projectId } },
        { budget_category: { _in: [category, packingCategory] } },
        { _or: [{ is_template: { _eq: false } }, { is_template: { _null: true } }] }
      ]
    });
    const url = `${API_URL}/items/project_budgets?filter=${encodeURIComponent(filter)}&sort=date_created&limit=-1`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Gagal mengambil data RAB');
    }

    const result = await response.json();
    const items = (result.data || []).map(item => ({
      ...item,
      _source: item.budget_category === packingCategory ? 'packing' : 'rab'
    }));
    return { data: items, success: true };
  } catch (error) {
    console.error('Error fetching budgets by category:', error);
    return { data: [], success: false, error: error.message };
  }
}

// ==================== PROJECT EXPENSES ====================

/**
 * Get project expenses
 * @param {number} projectId - Project ID
 * @returns {Promise<object>} Project expenses
 */
export async function getProjectExpenses(projectId) {
  try {
    const url = `${API_URL}/items/project_expenses?filter[project_id][_eq]=${projectId}&sort=-expense_date&limit=-1`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch project expenses');
    }

    const result = await response.json();
    return {
      data: result.data || [],
      success: true
    };
  } catch (error) {
    console.error('Error fetching project expenses:', error);
    return {
      data: [],
      success: false,
      error: error.message
    };
  }
}

/**
 * Create project expense
 * @param {object} expenseData - Expense data
 * @returns {Promise<object>} Created expense
 */
export async function createProjectExpense(expenseData) {
  try {
    // Remove created_at — Directus handles date_created automatically
    const { created_at, ...cleanData } = expenseData;

    const response = await fetch(`${API_URL}/items/project_expenses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cleanData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Failed to create project expense');
    }

    const result = await response.json();

    // Update budget actual if budget_category is provided
    if (expenseData.project_id && expenseData.budget_category && expenseData.expense_amount) {
      await updateProjectBudgetActual(expenseData.project_id, expenseData.budget_category, expenseData.expense_amount);
    }

    return {
      data: result.data,
      success: true,
      message: 'Project expense recorded successfully'
    };
  } catch (error) {
    console.error('Error creating project expense:', error);
    return {
      data: null,
      success: false,
      error: error.message
    };
  }
}

/**
 * Update project budget actual amount (internal helper)
 * @param {number} projectId - Project ID
 * @param {string} budgetCategory - Budget category
 * @param {number} amount - Amount to add
 * @returns {Promise<object>} Result
 */
async function updateProjectBudgetActual(projectId, budgetCategory, amount) {
  try {
    // Find budget for this category
    const budgetUrl = `${API_URL}/items/project_budgets?filter[project_id][_eq]=${projectId}&filter[budget_category][_eq]=${budgetCategory}&limit=1`;
    const budgetResponse = await fetch(budgetUrl, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!budgetResponse.ok) {
      return { success: false };
    }

    const budgetData = await budgetResponse.json();
    const budget = budgetData.data?.[0];

    if (!budget) {
      return { success: false };
    }

    // Update actual amount
    const currentActual = parseFloat(budget.actual_amount || 0);
    const plannedAmount = parseFloat(budget.planned_amount || 0);
    const newActual = currentActual + parseFloat(amount);
    const variance = plannedAmount - newActual;

    await fetch(`${API_URL}/items/project_budgets/${budget.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        actual_amount: newActual,
        variance: variance
      })
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating project budget actual:', error);
    return { success: false, error: error.message };
  }
}

// ==================== REVENUE RECOGNITION ====================

/**
 * Get project revenue recognition records
 * @param {number} projectId - Project ID
 * @returns {Promise<object>} Revenue records
 */
export async function getProjectRevenue(projectId) {
  try {
    const url = `${API_URL}/items/project_revenue?filter[project_id][_eq]=${projectId}&sort=-recognition_date&limit=-1`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch project revenue');
    }

    const result = await response.json();
    return {
      data: result.data || [],
      success: true
    };
  } catch (error) {
    console.error('Error fetching project revenue:', error);
    return {
      data: [],
      success: false,
      error: error.message
    };
  }
}

/**
 * Recognize revenue for project (percentage of completion method)
 * @param {object} recognitionData - Revenue recognition data
 * @returns {Promise<object>} Created revenue record
 */
export async function recognizeProjectRevenue(recognitionData) {
  try {
    const { project_id, recognition_date, recognition_period, notes } = recognitionData;

    // Get project details
    const projectResponse = await getProjectDetails(project_id);
    if (!projectResponse.success) {
      throw new Error('Failed to fetch project details');
    }

    const project = projectResponse.data;

    // Calculate revenue based on completion percentage
    const contractValue = parseFloat(project.contract_value || 0);
    const completionPercentage = parseFloat(project.completion_percentage || 0);

    // Get previously recognized revenue
    const previousRevenueResponse = await getProjectRevenue(project_id);
    const previousRevenue = previousRevenueResponse.data || [];
    const totalPreviousRevenue = previousRevenue.reduce((sum, r) => sum + parseFloat(r.revenue_amount || 0), 0);

    // Calculate revenue to recognize this period
    const totalEarnedRevenue = (contractValue * completionPercentage) / 100;
    const revenueToRecognize = totalEarnedRevenue - totalPreviousRevenue;

    if (revenueToRecognize <= 0) {
      throw new Error('No revenue to recognize for this period');
    }

    // Create revenue recognition record
    const response = await fetch(`${API_URL}/items/project_revenue`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        project_id,
        recognition_date,
        recognition_period,
        revenue_amount: revenueToRecognize,
        cumulative_revenue: totalEarnedRevenue,
        completion_percentage: completionPercentage,
        notes,
        created_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Failed to recognize revenue');
    }

    const result = await response.json();

    // Create journal entry for revenue recognition
    await createRevenueJournalEntry(result.data, project, revenueToRecognize);

    return {
      data: result.data,
      success: true,
      message: 'Revenue recognized successfully'
    };
  } catch (error) {
    console.error('Error recognizing project revenue:', error);
    return {
      data: null,
      success: false,
      error: error.message
    };
  }
}

/**
 * Create journal entry for revenue recognition
 * @param {object} revenueRecord - Revenue recognition record
 * @param {object} project - Project details
 * @param {number} revenueAmount - Revenue amount to recognize
 * @returns {Promise<void>}
 */
async function createRevenueJournalEntry(revenueRecord, project, revenueAmount) {
  try {
    // Import finance API for journal creation
    const { generateJournalNumber } = await import('./financeApi.js');

    const journalEntry = {
      journal_number: generateJournalNumber(),
      transaction_date: revenueRecord.recognition_date,
      reference_type: 'REVENUE_RECOGNITION',
      reference_id: revenueRecord.id,
      reference_number: `RR-${revenueRecord.id}`,
      description: `Revenue recognized for project: ${project.project_name} (${revenueRecord.recognition_period})`,
      total_debit: revenueAmount,
      total_credit: revenueAmount,
      created_by: 'system'
    };

    // Create journal entry header
    const jeResponse = await fetch(`${API_URL}/items/journal_entries`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(journalEntry)
    });

    if (!jeResponse.ok) {
      console.error('Failed to create revenue recognition journal entry');
      return;
    }

    const jeData = await jeResponse.json();

    // Create journal entry details (double entry)
    const journalDetails = [
      // Debit: Accounts Receivable (if milestone-based) or Revenue (if completion-based)
      {
        journal_entry_id: jeData.data.id,
        account_code: '1120', // Accounts Receivable
        account_name: 'Accounts Receivable',
        debit_amount: revenueAmount,
        credit_amount: 0,
        description: `Revenue recognition: ${project.project_name}`,
        line_number: 1
      },
      // Credit: Service Revenue
      {
        journal_entry_id: jeData.data.id,
        account_code: '4100', // Sales Revenue / Service Revenue
        account_name: 'Service Revenue',
        debit_amount: 0,
        credit_amount: revenueAmount,
        description: `Revenue for ${project.project_name} - ${revenueRecord.recognition_period}`,
        line_number: 2
      }
    ];

    // Create all journal details in parallel
    await Promise.all(
      journalDetails.map(detail =>
        fetch(`${API_URL}/items/journal_entry_details`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(detail)
        })
      )
    );

    // Mark journal as posted
    await fetch(`${API_URL}/items/journal_entries/${jeData.data.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        is_posted: true,
        posted_date: new Date().toISOString()
      })
    });

    console.log('Revenue recognition journal entry created successfully');

  } catch (error) {
    console.error('Error creating revenue recognition journal entry:', error);
    // Don't throw error to avoid failing revenue recognition
  }
}

/**
 * Get project profitability summary
 * @param {number} projectId - Project ID
 * @returns {Promise<object>} Profitability data
 */
export async function getProjectProfitability(projectId) {
  try {
    // Get project details
    const projectResponse = await getProjectDetails(projectId);
    if (!projectResponse.success) {
      throw new Error('Failed to fetch project details');
    }

    const project = projectResponse.data;

    // Get recognized revenue
    const revenueResponse = await getProjectRevenue(projectId);
    const revenueRecords = revenueResponse.data || [];
    const totalRevenue = revenueRecords.reduce((sum, r) => sum + parseFloat(r.revenue_amount || 0), 0);

    // Get expenses
    const expensesResponse = await getProjectExpenses(projectId);
    const expenses = expensesResponse.data || [];
    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.expense_amount || 0), 0);

    // Calculate profitability
    const grossProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue * 100) : 0;

    // Get budget vs actual
    const budgetsResponse = await getProjectBudgets(projectId);
    const budgets = budgetsResponse.data || [];
    const totalBudget = budgets.reduce((sum, b) => sum + parseFloat(b.planned_amount || 0), 0);
    const budgetVariance = totalBudget - totalExpenses;

    return {
      data: {
        project_code: project.project_code,
        project_name: project.project_name,
        contract_value: parseFloat(project.contract_value || 0),
        completion_percentage: parseFloat(project.completion_percentage || 0),
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        gross_profit: grossProfit,
        profit_margin: profitMargin,
        total_budget: totalBudget,
        budget_variance: budgetVariance,
        status: project.status,
        is_profitable: grossProfit >= 0,
        is_on_budget: totalExpenses <= totalBudget
      },
      success: true
    };
  } catch (error) {
    console.error('Error calculating project profitability:', error);
    return {
      data: null,
      success: false,
      error: error.message
    };
  }
}

// ==================== PO JASA → PROJECT INTEGRATION ====================

/**
 * Get SO Jasa entries that don't have a linked project yet
 * Finds SO with jasa items and filters out those already linked to projects
 * @returns {Promise<object>} Pending SO Jasa list
 */
export async function getSOJasaPending() {
  try {
    // Step 1 & 2: run IN PARALLEL — get SO IDs with jasa + already-linked SO IDs
    const [detailsRes, projectsRes] = await Promise.all([
      fetch(
        `${API_URL}/items/so_customer_details?filter[so_type][_eq]=jasa&fields=so_customer_id&limit=-1&groupBy[]=so_customer_id`,
        { headers: { 'Authorization': `Bearer ${TOKEN}` } }
      ),
      fetch(
        `${API_URL}/items/projects?filter[so_customer_id][_nnull]=true&fields=so_customer_id&limit=-1`,
        { headers: { 'Authorization': `Bearer ${TOKEN}` } }
      )
    ]);

    if (!detailsRes.ok) throw new Error('Gagal mengambil data SO Jasa');

    const [detailsData, projectsData] = await Promise.all([
      detailsRes.json(),
      projectsRes.ok ? projectsRes.json() : Promise.resolve({ data: [] })
    ]);

    const soIdsWithJasa = (detailsData.data || []).map(d =>
      typeof d.so_customer_id === 'object' ? d.so_customer_id?.id : d.so_customer_id
    ).filter(Boolean);

    if (soIdsWithJasa.length === 0) return { data: [], success: true };

    const linkedSOIds = (projectsData.data || []).map(p =>
      typeof p.so_customer_id === 'object' ? p.so_customer_id?.id : p.so_customer_id
    ).filter(Boolean);

    // Filter: SO with jasa but no project linked
    const pendingSOIds = soIdsWithJasa.filter(id => !linkedSOIds.includes(id));

    if (pendingSOIds.length === 0) return { data: [], success: true };

    // Step 3 & 4: run IN PARALLEL — fetch SO headers + ALL jasa details in ONE batch query
    const idsParam = pendingSOIds.join(',');

    const [soRes, allJasaRes] = await Promise.all([
      fetch(
        `${API_URL}/items/so_customer?filter[id][_in]=${idsParam}&filter[status][_in]=draft,submitted,pending&fields=*&sort=-id&limit=-1`,
        { headers: { 'Authorization': `Bearer ${TOKEN}` } }
      ),
      fetch(
        `${API_URL}/items/so_customer_details?filter[so_customer_id][_in]=${idsParam}&filter[so_type][_eq]=jasa&fields=*&limit=-1&sort=id`,
        { headers: { 'Authorization': `Bearer ${TOKEN}` } }
      )
    ]);

    if (!soRes.ok) throw new Error('Gagal mengambil data SO Customer');

    const [soData, allJasaData] = await Promise.all([
      soRes.json(),
      allJasaRes.ok ? allJasaRes.json() : Promise.resolve({ data: [] })
    ]);

    const soList = soData.data || [];
    const allJasaDetails = allJasaData.data || [];

    // Group jasa details by so_customer_id in JS — no extra HTTP calls needed
    const jasaBySOId = {};
    for (const det of allJasaDetails) {
      const soId = typeof det.so_customer_id === 'object' ? det.so_customer_id?.id : det.so_customer_id;
      if (!jasaBySOId[soId]) jasaBySOId[soId] = [];
      jasaBySOId[soId].push(det);
    }

    for (const so of soList) {
      so.jasa_details = jasaBySOId[so.id] || [];
    }

    return { data: soList, success: true };
  } catch (error) {
    console.error('Error fetching SO Jasa pending:', error);
    return { data: [], success: false, error: error.message };
  }
}

/**
 * Create project from SO Jasa
 * Links the new project to the SO via so_customer_id
 * @param {object} params - { so_customer_id, leader, lokasi, description }
 * @returns {Promise<object>} Created project
 */
export async function createProjectFromSO(params) {
  try {
    const { so_customer_id, leader, lokasi, description } = params;

    if (!so_customer_id) {
      throw new Error('SO Customer ID wajib dipilih');
    }
    if (!leader || leader.trim() === '') {
      throw new Error('Leader wajib diisi');
    }

    // 1. Fetch SO details
    const soRes = await fetch(`${API_URL}/items/so_customer/${so_customer_id}`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!soRes.ok) {
      throw new Error('SO Customer tidak ditemukan');
    }

    const soData = await soRes.json();
    const so = soData.data;

    // 2. Fetch jasa details for jenis_project
    const jasaDetailsUrl = `${API_URL}/items/so_customer_details?filter[so_customer_id][_eq]=${so_customer_id}&filter[so_type][_eq]=jasa&fields=*&limit=-1`;
    const jasaRes = await fetch(jasaDetailsUrl, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    let jenisProject = '';
    let jasaItems = [];
    if (jasaRes.ok) {
      const jasaData = await jasaRes.json();
      jasaItems = jasaData.data || [];
      // Use first jasa item's jenis_jasa as jenis_project
      jenisProject = jasaItems[0]?.jenis_jasa || '';
    }

    // 3. Build project name from SO
    const projectName = `${so.customer_name || so.kode_customer || 'Project'} - ${so.nomor_so || ''}`.trim();

    // 4. Build progress_details from jasa items (or use provided override)
    const progressDetails = params.progress_details || jasaItems.map(item => ({
      description: item.nama_barang || item.jenis_jasa || '',
      target_value: (parseFloat(item.qty) || 1) * (parseFloat(item.jumlah_pcs) || 1),
      satuan_progress: item.packing || item.kemasan || 'm²'
    }));

    // Calculate target_progress as sum of all target values
    const targetProgress = progressDetails.reduce((sum, pd) => sum + (parseFloat(pd.target_value) || 0), 0);

    // 5. Create project
    const payload = {
      name: projectName,
      description: description || `Project dari ${so.nomor_so}`,
      lokasi: lokasi || '',
      nomor_po: so.nomor_po_customer || so.nomor_so || '',
      start_date: so.tanggal_so || new Date().toISOString().split('T')[0],
      end_date: params.end_date || null,
      jenis_project: jenisProject,
      leader: leader,
      sales: so.sales_name || '',
      target_progress: String(targetProgress),
      total_progress: '0',
      status: 'waiting',
      so_customer_id: so_customer_id,
      customer: so.customer_name ? [{ name: so.customer_name, contact: '' }] : [],
      progress_details: progressDetails
    };

    const createRes = await fetch(`${API_URL}/items/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!createRes.ok) {
      const error = await createRes.json();
      throw new Error(error.errors?.[0]?.message || 'Gagal membuat project');
    }

    const createdProject = await createRes.json();

    // 7. Update SO with project_id + set status to 'waiting'
    try {
      await fetch(`${API_URL}/items/so_customer/${so_customer_id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: createdProject.data.id,
          status: 'waiting'
        })
      });
    } catch (linkError) {
      console.warn('Warning: Could not update SO with project_id:', linkError);
    }

    // Charter is now created at Sales stage (linked to SO), no auto-creation needed here

    return {
      data: createdProject.data,
      success: true,
      message: `Project "${projectName}" berhasil dibuat dari SO ${so.nomor_so}`
    };
  } catch (error) {
    console.error('Error creating project from SO:', error);
    return {
      data: null,
      success: false,
      error: error.message
    };
  }
}

// ==================== LINK PO TO EXISTING PROJECT ====================

/**
 * Get available SO Customer entries that are NOT yet linked to any project
 * and that have at least one jasa-type item in so_customer_details.
 * Used by LinkPOModal to let user pick an SO to connect to an existing project.
 * @param {string} [search] - Optional search term for customer name or nomor_so
 * @returns {Promise<object>} List of available SOs (jasa only)
 */
export async function getAvailableSOsForLinking(search = '') {
  try {
    // Step 1: In parallel — get SO IDs with jasa items + SO IDs already linked to projects
    const [detailsRes, projectsRes] = await Promise.all([
      fetch(
        `${API_URL}/items/so_customer_details?filter[so_type][_eq]=jasa&fields=so_customer_id&limit=-1&groupBy[]=so_customer_id`,
        { headers: { 'Authorization': `Bearer ${TOKEN}` } }
      ),
      fetch(
        `${API_URL}/items/projects?filter[so_customer_id][_nnull]=true&fields=so_customer_id&limit=-1`,
        { headers: { 'Authorization': `Bearer ${TOKEN}` } }
      )
    ]);

    if (!detailsRes.ok) throw new Error('Gagal mengambil data SO Jasa');

    const [detailsData, projectsData] = await Promise.all([
      detailsRes.json(),
      projectsRes.ok ? projectsRes.json() : Promise.resolve({ data: [] })
    ]);

    // SO IDs that have jasa items
    const soIdsWithJasa = new Set(
      (detailsData.data || []).map(d =>
        typeof d.so_customer_id === 'object' ? d.so_customer_id?.id : d.so_customer_id
      ).filter(Boolean)
    );

    if (soIdsWithJasa.size === 0) return { data: [], success: true };

    // SO IDs already linked to projects
    const linkedSOIds = new Set(
      (projectsData.data || []).map(p =>
        typeof p.so_customer_id === 'object' ? p.so_customer_id?.id : p.so_customer_id
      ).filter(Boolean)
    );

    // Available = has jasa AND not linked
    const availableSOIds = [...soIdsWithJasa].filter(id => !linkedSOIds.has(id));

    if (availableSOIds.length === 0) return { data: [], success: true };

    // Step 2: Fetch SO headers for available IDs
    let soUrl = `${API_URL}/items/so_customer?filter[id][_in]=${availableSOIds.join(',')}&fields=id,nomor_so,nomor_po_customer,customer_name,kode_customer,tanggal_so,grand_total,status,sales_name&sort=-id&limit=-1`;

    // Apply search filter if provided
    if (search && search.trim()) {
      const searchFilter = JSON.stringify({
        _and: [
          { id: { _in: availableSOIds } },
          { _or: [
            { customer_name: { _icontains: search.trim() } },
            { nomor_so: { _icontains: search.trim() } },
            { nomor_po_customer: { _icontains: search.trim() } },
            { kode_customer: { _icontains: search.trim() } }
          ]}
        ]
      });
      soUrl = `${API_URL}/items/so_customer?filter=${encodeURIComponent(searchFilter)}&fields=id,nomor_so,nomor_po_customer,customer_name,kode_customer,tanggal_so,grand_total,status,sales_name&sort=-id&limit=-1`;
    }

    const soRes = await fetch(soUrl, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });

    if (!soRes.ok) throw new Error('Gagal mengambil data SO Customer');

    const soData = await soRes.json();
    return { data: soData.data || [], success: true };
  } catch (error) {
    console.error('Error fetching available SOs for linking:', error);
    return { data: [], success: false, error: error.message };
  }
}

/**
 * Link an existing SO Customer to an existing project (that has no PO).
 * Updates:
 *  - projects.so_customer_id, projects.nomor_po, projects.customer, projects.jenis_project, projects.sales
 *  - so_customer.project_id
 * @param {number} projectId - Project ID
 * @param {number} soCustomerId - SO Customer ID to link
 * @returns {Promise<object>} Result
 */
export async function linkSOToProject(projectId, soCustomerId) {
  try {
    // 1. Fetch SO header
    const soRes = await fetch(
      `${API_URL}/items/so_customer/${soCustomerId}?fields=id,nomor_so,nomor_po_customer,customer_name,kode_customer,sales_name,tanggal_so`,
      { headers: { 'Authorization': `Bearer ${TOKEN}` } }
    );
    if (!soRes.ok) throw new Error('SO Customer tidak ditemukan');
    const soData = await soRes.json();
    const so = soData.data;

    // 2. Fetch jasa details for jenis_project
    let jenisProject = '';
    try {
      const jasaRes = await fetch(
        `${API_URL}/items/so_customer_details?filter[so_customer_id][_eq]=${soCustomerId}&filter[so_type][_eq]=jasa&fields=jenis_jasa&limit=1`,
        { headers: { 'Authorization': `Bearer ${TOKEN}` } }
      );
      if (jasaRes.ok) {
        const jasaData = await jasaRes.json();
        jenisProject = jasaData.data?.[0]?.jenis_jasa || '';
      }
    } catch (e) {
      console.warn('Could not fetch jenis_jasa:', e);
    }

    // 3. Update project with SO data
    const projectPayload = {
      so_customer_id: soCustomerId,
      nomor_po: so.nomor_po_customer || so.nomor_so || '',
      sales: so.sales_name || '',
      updated_at: new Date().toISOString()
    };
    if (so.customer_name) {
      projectPayload.customer = [{ name: so.customer_name, contact: '' }];
    }
    if (jenisProject) {
      projectPayload.jenis_project = jenisProject;
    }

    const projectRes = await fetch(`${API_URL}/items/projects/${projectId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(projectPayload)
    });

    if (!projectRes.ok) {
      const err = await projectRes.json();
      throw new Error(err.errors?.[0]?.message || 'Gagal mengupdate project');
    }

    // 4. Update SO with project_id
    try {
      await fetch(`${API_URL}/items/so_customer/${soCustomerId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ project_id: projectId })
      });
    } catch (linkErr) {
      console.warn('Warning: Could not update SO with project_id:', linkErr);
    }

    const updatedRes = await projectRes.json();
    return {
      data: updatedRes.data,
      success: true,
      message: `PO "${so.nomor_po_customer || so.nomor_so}" berhasil dihubungkan ke project`
    };
  } catch (error) {
    console.error('Error linking SO to project:', error);
    return { data: null, success: false, error: error.message };
  }
}

// ==================== RAB EXPENSE TYPES ====================

export const RAB_EXPENSE_TYPES = {
  OPERASIONAL: 'operasional',
  SUPPLIER: 'supplier',
  JASA: 'jasa',
  SEWA_ALAT: 'sewa_alat',
  CONSUMABLE: 'consumable',
  LAIN_LAIN: 'lain_lain'
};

export const RAB_EXPENSE_TYPE_LABELS = {
  operasional: 'Biaya Operasional',
  supplier: 'Supplier / Material',
  jasa: 'Jasa / Subkontraktor',
  sewa_alat: 'Sewa Alat Internal',
  consumable: 'Consumables',
  lain_lain: 'Biaya Lain-Lain'
};

/**
 * Get project expenses filtered by expense_type (RAB category)
 * @param {number} projectId - Project ID
 * @param {string} expenseType - One of RAB_EXPENSE_TYPES
 * @returns {Promise<object>} Filtered expenses
 */
export async function getProjectExpensesByType(projectId, expenseType) {
  try {
    // Fetch ALL expenses for the project, filter by type client-side
    // (Server-side expense_type filter had reliability issues with Directus)
    const fields = 'id,project_id,expense_type,expense_date,expense_category,expense_amount,description,pic,reference_number,material_name,material_color,qty,unit,unit_price,qty_used,qty_remaining,debit_amount,credit_amount,date_created';
    const url = `${API_URL}/items/project_expenses?filter[project_id][_eq]=${projectId}&sort=expense_date&limit=-1&fields=${fields}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Gagal mengambil data pengeluaran project');
    }

    const result = await response.json();
    let data = result.data || [];

    // Filter by expense_type client-side if provided
    if (expenseType) {
      const normalizedType = String(expenseType).replace(/^packing_/, '');
      data = data.filter(exp => {
        const t = (exp.expense_type || '').replace(/^packing_/, '');
        return t === normalizedType;
      });
    }

    return {
      data,
      success: true
    };
  } catch (error) {
    console.error('Error fetching project expenses by type:', error);
    return {
      data: [],
      success: false,
      error: error.message
    };
  }
}

/**
 * Create operational expense entry (Biaya Operasional - kredit/debit)
 * @param {number} projectId - Project ID
 * @param {object} data - { expense_date, pic, description, credit_amount, debit_amount }
 * @returns {Promise<object>} Created expense
 */
export async function createOperationalExpense(projectId, data) {
  try {
    const payload = {
      project_id: projectId,
      expense_type: RAB_EXPENSE_TYPES.OPERASIONAL,
      expense_date: data.expense_date || new Date().toISOString().split('T')[0],
      pic: data.pic || '',
      description: data.description || '',
      credit_amount: parseFloat(data.credit_amount) || 0,
      debit_amount: parseFloat(data.debit_amount) || 0,
      expense_amount: parseFloat(data.debit_amount || 0) - parseFloat(data.credit_amount || 0),
      expense_category: 'Operasional'
    };

    const response = await fetch(`${API_URL}/items/project_expenses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Gagal menyimpan biaya operasional');
    }

    const result = await response.json();
    return {
      data: result.data,
      success: true,
      message: 'Biaya operasional berhasil disimpan'
    };
  } catch (error) {
    console.error('Error creating operational expense:', error);
    return { data: null, success: false, error: error.message };
  }
}

/**
 * Create supplier/material expense entry
 * @param {number} projectId - Project ID
 * @param {object} data - { expense_date, reference_number, material_name, material_color, qty, unit, qty_used, unit_price }
 * @returns {Promise<object>} Created expense
 */
export async function createSupplierExpense(projectId, data) {
  try {
    const qty = parseFloat(data.qty) || 0;
    const qtyUsed = parseFloat(data.qty_used) || qty;
    const unitPrice = parseFloat(data.unit_price) || 0;
    const total = qty * unitPrice;

    const payload = {
      project_id: projectId,
      expense_type: RAB_EXPENSE_TYPES.SUPPLIER,
      expense_date: data.expense_date || new Date().toISOString().split('T')[0],
      reference_number: data.reference_number || '',
      material_name: data.material_name || '',
      material_color: data.material_color || '',
      qty: qty,
      unit: data.unit || '',
      unit_price: unitPrice,
      qty_used: qtyUsed,
      qty_remaining: qty - qtyUsed,
      expense_amount: total,
      debit_amount: total,
      expense_category: 'Supplier'
    };

    const response = await fetch(`${API_URL}/items/project_expenses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Gagal menyimpan biaya supplier');
    }

    const result = await response.json();
    return {
      data: result.data,
      success: true,
      message: 'Biaya supplier berhasil disimpan'
    };
  } catch (error) {
    console.error('Error creating supplier expense:', error);
    return { data: null, success: false, error: error.message };
  }
}

/**
 * Create jasa/subkon expense entry
 * @param {number} projectId - Project ID
 * @param {object} data - { expense_date, pic, description, expense_amount }
 * @returns {Promise<object>} Created expense
 */
export async function createJasaExpense(projectId, data) {
  try {
    const payload = {
      project_id: projectId,
      expense_type: RAB_EXPENSE_TYPES.JASA,
      expense_date: data.expense_date || new Date().toISOString().split('T')[0],
      pic: data.pic || '',
      description: data.description || '',
      expense_amount: parseFloat(data.expense_amount) || 0,
      debit_amount: parseFloat(data.expense_amount) || 0,
      expense_category: 'Jasa'
    };

    const response = await fetch(`${API_URL}/items/project_expenses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Gagal menyimpan biaya jasa');
    }

    const result = await response.json();
    return {
      data: result.data,
      success: true,
      message: 'Biaya jasa berhasil disimpan'
    };
  } catch (error) {
    console.error('Error creating jasa expense:', error);
    return { data: null, success: false, error: error.message };
  }
}

/**
 * Create sewa alat internal expense entry
 * @param {number} projectId - Project ID
 * @param {object} data - { expense_date, reference_number, qty, unit, description, unit_price }
 * @returns {Promise<object>} Created expense
 */
export async function createEquipmentRental(projectId, data) {
  try {
    const qty = parseFloat(data.qty) || 0;
    const unitPrice = parseFloat(data.unit_price) || 0;
    const total = qty * unitPrice;

    const payload = {
      project_id: projectId,
      expense_type: RAB_EXPENSE_TYPES.SEWA_ALAT,
      expense_date: data.expense_date || new Date().toISOString().split('T')[0],
      reference_number: data.reference_number || '',
      description: data.description || '',
      qty: qty,
      unit: data.unit || '',
      unit_price: unitPrice,
      expense_amount: total,
      debit_amount: total,
      expense_category: 'Sewa Alat'
    };

    const response = await fetch(`${API_URL}/items/project_expenses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Gagal menyimpan sewa alat');
    }

    const result = await response.json();
    return {
      data: result.data,
      success: true,
      message: 'Sewa alat berhasil disimpan'
    };
  } catch (error) {
    console.error('Error creating equipment rental:', error);
    return { data: null, success: false, error: error.message };
  }
}

/**
 * Create consumable expense entry
 * @param {number} projectId - Project ID
 * @param {object} data - { expense_date, description, qty, unit, unit_price }
 * @returns {Promise<object>} Created expense
 */
export async function createConsumableExpense(projectId, data) {
  try {
    const qty = parseFloat(data.qty) || 0;
    const unitPrice = parseFloat(data.unit_price) || 0;
    const total = qty * unitPrice;

    const payload = {
      project_id: projectId,
      expense_type: RAB_EXPENSE_TYPES.CONSUMABLE,
      expense_date: data.expense_date || new Date().toISOString().split('T')[0],
      description: data.description || '',
      qty: qty,
      unit: data.unit || '',
      unit_price: unitPrice,
      expense_amount: total,
      debit_amount: total,
      expense_category: 'Consumable'
    };

    const response = await fetch(`${API_URL}/items/project_expenses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Gagal menyimpan consumable');
    }

    const result = await response.json();
    return {
      data: result.data,
      success: true,
      message: 'Consumable berhasil disimpan'
    };
  } catch (error) {
    console.error('Error creating consumable expense:', error);
    return { data: null, success: false, error: error.message };
  }
}

/**
 * Create biaya lain-lain (miscellaneous) expense entry
 * @param {number} projectId - Project ID
 * @param {object} data - { expense_date, pic, description, qty, unit, unit_price, expense_amount }
 * @returns {Promise<object>} Created expense
 */
export async function createLainLainExpense(projectId, data) {
  try {
    const qty = parseFloat(data.qty) || 0;
    const unitPrice = parseFloat(data.unit_price) || 0;
    const total = qty && unitPrice ? qty * unitPrice : parseFloat(data.expense_amount) || 0;

    const payload = {
      project_id: projectId,
      expense_type: RAB_EXPENSE_TYPES.LAIN_LAIN,
      expense_date: data.expense_date || new Date().toISOString().split('T')[0],
      pic: data.pic || '',
      description: data.description || '',
      qty: qty,
      unit: data.unit || '',
      unit_price: unitPrice,
      expense_amount: total,
      debit_amount: total,
      expense_category: 'Lain-Lain'
    };

    const response = await fetch(`${API_URL}/items/project_expenses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Gagal menyimpan biaya lain-lain');
    }

    const result = await response.json();
    return {
      data: result.data,
      success: true,
      message: 'Biaya lain-lain berhasil disimpan'
    };
  } catch (error) {
    console.error('Error creating lain-lain expense:', error);
    return { data: null, success: false, error: error.message };
  }
}

/**
 * Update a project expense entry
 * @param {number} expenseId - Expense ID
 * @param {object} data - Fields to update
 * @returns {Promise<object>} Updated expense
 */
export async function updateProjectExpenseEntry(expenseId, data) {
  try {
    const response = await fetch(`${API_URL}/items/project_expenses/${expenseId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Gagal mengupdate data');
    }

    const result = await response.json();
    return { data: result.data, success: true, message: 'Data berhasil diupdate' };
  } catch (error) {
    console.error('Error updating project expense:', error);
    return { data: null, success: false, error: error.message };
  }
}

/**
 * Delete a project expense entry
 * @param {number} expenseId - Expense ID
 * @returns {Promise<object>} Result
 */
export async function deleteProjectExpenseEntry(expenseId) {
  try {
    const response = await fetch(`${API_URL}/items/project_expenses/${expenseId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });

    if (!response.ok) {
      throw new Error('Gagal menghapus data');
    }

    return { success: true, message: 'Data berhasil dihapus' };
  } catch (error) {
    console.error('Error deleting project expense:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get RAB summary for a project — combines budget (RAB) + expenses (Actual)
 * @param {number} projectId - Project ID
 * @returns {Promise<object>} Summary with rab, actual, variance per category
 */
export async function getProjectRABSummary(projectId) {
  try {
    // Fetch budgets (RAB), expenses (Actual), and project SO data in parallel
    const [budgetRes, expenseRes, projectRes] = await Promise.all([
      getProjectBudgets(projectId),
      getProjectExpensesByType(projectId, null),
      // Fetch project to get so_customer_id link + progress data
      fetch(`${API_URL}/items/projects/${projectId}?fields=id,name,nomor_po,so_customer_id,total_progress,target_progress`, {
        headers: { 'Authorization': `Bearer ${TOKEN}` }
      }).then(r => r.ok ? r.json() : { data: null }).catch(() => ({ data: null }))
    ]);

    const budgets = budgetRes.success ? budgetRes.data : [];
    const expenses = expenseRes.success ? expenseRes.data : [];
    const projectData = projectRes?.data || null;

    // Fetch SO data if project has so_customer_id
    let poInfo = null;
    if (projectData?.so_customer_id) {
      try {
        const soId = typeof projectData.so_customer_id === 'object' ? projectData.so_customer_id.id : projectData.so_customer_id;
        const soRes = await fetch(`${API_URL}/items/so_customer/${soId}?fields=id,nomor_so,nomor_po_customer,grand_total,subtotal,ppn_rate,ppn_yn,retensi,customer_name,kode_customer,tanggal_so,status`, {
          headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (soRes.ok) {
          const soData = await soRes.json();
          if (soData.data) {
            poInfo = {
              so_id: soData.data.id,
              nomor_so: soData.data.nomor_so || '',
              nomor_po: soData.data.nomor_po_customer || projectData.nomor_po || '',
              grand_total: parseFloat(soData.data.grand_total || 0),
              subtotal: parseFloat(soData.data.subtotal || 0),
              ppn_rate: parseFloat(soData.data.ppn_rate || 0),
              ppn_yn: soData.data.ppn_yn || 'No',
              retensi: parseFloat(soData.data.retensi || 0),
              customer_name: soData.data.customer_name || '',
              kode_customer: soData.data.kode_customer || '',
              tanggal_so: soData.data.tanggal_so || '',
              status: soData.data.status || ''
            };
          }
        }
      } catch (soErr) {
        console.error('Error fetching SO data for project:', soErr);
      }
    }

    // Initialize summary per category
    const summary = {
      operasional: { rab: 0, actual_kredit: 0, actual_debit: 0, actual: 0, variance: 0, rab_count: 0, actual_count: 0 },
      supplier: { rab: 0, actual: 0, variance: 0, rab_count: 0, actual_count: 0 },
      jasa: { rab: 0, actual: 0, variance: 0, rab_count: 0, actual_count: 0 },
      sewa_alat: { rab: 0, actual: 0, variance: 0, rab_count: 0, actual_count: 0 },
      consumable: { rab: 0, actual: 0, variance: 0, rab_count: 0, actual_count: 0 },
      lain_lain: { rab: 0, actual: 0, variance: 0, rab_count: 0, actual_count: 0 },
      grand_rab: 0,
      grand_actual: 0,
      grand_variance: 0,
      po_info: poInfo
    };

    // Sum RAB per category
    for (const b of budgets) {
      // Map packing_* to base category (e.g. packing_supplier → supplier)
      const rawCat = b.budget_category || '';
      const cat = rawCat.replace('packing_', '');
      if (cat && summary[cat]) {
        // Use planned_amount, or fall back to qty × unit_price if planned_amount is 0
        let amount = parseFloat(b.planned_amount || 0);
        if (amount === 0 && b.qty && b.unit_price) {
          amount = parseFloat(b.qty) * parseFloat(b.unit_price);
        }
        summary[cat].rab += amount;
        summary[cat].rab_count++;
      }
    }

    // Sum Actual per category
    for (const exp of expenses) {
      const type = exp.expense_type;
      if (type === 'operasional') {
        summary.operasional.actual_kredit += parseFloat(exp.credit_amount || 0);
        summary.operasional.actual_debit += parseFloat(exp.debit_amount || 0);
        summary.operasional.actual_count++;
      } else if (type && summary[type]) {
        summary[type].actual += parseFloat(exp.expense_amount || 0);
        summary[type].actual_count++;
      }
    }

    // Calculate operasional actual (debit - kredit = pengeluaran bersih)
    summary.operasional.actual = summary.operasional.actual_debit - summary.operasional.actual_kredit;

    // Calculate variance per category
    for (const cat of ['operasional', 'supplier', 'jasa', 'sewa_alat', 'consumable', 'lain_lain']) {
      summary[cat].variance = summary[cat].rab - summary[cat].actual;
    }

    // Grand totals
    summary.grand_rab = summary.operasional.rab + summary.supplier.rab + summary.jasa.rab + summary.sewa_alat.rab + summary.consumable.rab + summary.lain_lain.rab;
    summary.grand_actual = summary.operasional.actual + summary.supplier.actual + summary.jasa.actual + summary.sewa_alat.actual + summary.consumable.actual + summary.lain_lain.actual;
    summary.grand_variance = summary.grand_rab - summary.grand_actual;

    // Calculate profit margin if PO info available
    if (poInfo && poInfo.grand_total > 0) {
      summary.profit_margin = poInfo.grand_total - summary.grand_actual;
      summary.profit_margin_pct = ((summary.profit_margin / poInfo.grand_total) * 100).toFixed(1);
    }

    // Progress info from project
    const totalProgress = parseFloat(projectData?.total_progress || 0);
    const targetProgress = parseFloat(projectData?.target_progress || 0);
    summary.progress_info = {
      total_progress: totalProgress,
      target_progress: targetProgress,
      progress_pct: targetProgress > 0 ? parseFloat(((totalProgress / targetProgress) * 100).toFixed(1)) : 0
    };

    // % Cost = actual / base × 100 (base = PO grand_total or RAB)
    const costBase = (poInfo && poInfo.grand_total > 0) ? poInfo.grand_total : summary.grand_rab;
    summary.cost_pct = costBase > 0 ? parseFloat(((summary.grand_actual / costBase) * 100).toFixed(1)) : 0;
    summary.cost_base_label = (poInfo && poInfo.grand_total > 0) ? 'Nilai PO' : 'Total RAB';

    return { data: summary, success: true };
  } catch (error) {
    console.error('Error fetching RAB summary:', error);
    return { data: null, success: false, error: error.message };
  }
}

// ==================== BARANG REFERENCE FOR RAB ====================

/**
 * Fetch identitas_barang items for RAB autocomplete reference
 * Returns lightweight list: id, nama_barang_lengkap, satuan, harga
 * @param {string} search - Optional search term
 * @returns {Promise<object>} List of barang items
 */
export async function searchBarangForRAB(search = '') {
  try {
    let url = `${API_URL}/items/identitas_barang?fields=id,nama_barang_lengkap,satuan,harga&sort=nama_barang_lengkap&limit=-1`;
    if (search) {
      url += `&filter[nama_barang_lengkap][_icontains]=${encodeURIComponent(search)}`;
    }
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    if (!res.ok) throw new Error('Gagal mengambil data barang');
    const data = await res.json();
    return { data: data.data || [], success: true };
  } catch (error) {
    console.error('Error fetching barang for RAB:', error);
    return { data: [], success: false, error: error.message };
  }
}

// ==================== RAB PACKING LIST DRAFTS ====================

function getCatLabel(cat) {
  const base = (cat || '').replace('packing_', '');
  const map = {
    supplier: 'Supplier/Material',
    sewa_alat: 'Sewa Alat',
    consumable: 'Consumable',
    operasional: 'Operasional',
    jasa: 'Jasa/Subkon',
    lain_lain: 'Lain-Lain',
  };
  return map[base] || cat;
}

/**
 * Fetch RAB budget items that are packing list drafts
 * (supplier, sewa_alat, consumable with packing_status = 'draft')
 * @returns {Promise<object>} List of packing draft items grouped by project
 */
export async function getRABPackingListDrafts() {
  try {
    // 1. Fetch budgets with packing_status = 'draft' (OR items from packing template that have NO packing_status yet)
    const filter = JSON.stringify({
      _and: [
        {
          _or: [
            { packing_status: { _in: ['draft', 'partial'] } },
            // Packing list items from template may not have packing_status set yet — treat as draft
            {
              _and: [
                { budget_category: { _starts_with: 'packing_' } },
                { _or: [{ packing_status: { _null: true } }, { packing_status: { _eq: 'draft' } }, { packing_status: { _eq: 'partial' } }] }
              ]
            }
          ]
        },
        {
          budget_category: {
            _in: [
              'supplier', 'sewa_alat', 'consumable',
              'operasional', 'jasa', 'lain_lain',
              'packing_supplier', 'packing_sewa_alat', 'packing_consumable',
              'packing_operasional', 'packing_jasa', 'packing_lain_lain'
            ]
          }
        },
        // Exclude template master items
        { _or: [{ is_template: { _eq: false } }, { is_template: { _null: true } }] }
      ]
    });
    const fields = 'id,project_id,budget_category,description,material_name,material_color,qty,unit,unit_price,planned_amount,packing_status,koefisien,date_created,identitas_barang_id,qty_sudah_dikirim';
    const url = `${API_URL}/items/project_budgets?filter=${encodeURIComponent(filter)}&fields=${fields}&sort=-date_created&limit=-1`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    if (!res.ok) throw new Error('Gagal mengambil data packing list');
    const result = await res.json();
    const items = result.data || [];

    if (items.length === 0) {
      return { data: [], projects: [], count: 0, success: true };
    }

    // 2. Fetch project info for each unique project_id (separate fetch per rule)
    const projectIds = [...new Set(items.map(i => i.project_id).filter(Boolean))];
    const projectFields = 'id,name,nomor_po,so_customer_id';
    const projectFilter = JSON.stringify({ id: { _in: projectIds } });
    const projectUrl = `${API_URL}/items/projects?filter=${encodeURIComponent(projectFilter)}&fields=${projectFields}&limit=-1`;

    const projectRes = await fetch(projectUrl, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const projectData = projectRes.ok ? (await projectRes.json()).data || [] : [];
    const projectMap = {};
    projectData.forEach(p => { projectMap[p.id] = p; });

    // 3. Fetch identitas_barang details for items that already have a mapping
    const mappedIds = [...new Set(items.map(i => i.identitas_barang_id).filter(Boolean))];
    let barangMap = {};
    if (mappedIds.length > 0) {
      const barangFilter = JSON.stringify({ id: { _in: mappedIds } });
      const barangUrl = `${API_URL}/items/identitas_barang?filter=${encodeURIComponent(barangFilter)}&fields=id,nama_barang_lengkap,stok_tersedia&limit=-1`;
      const barangRes = await fetch(barangUrl, { headers: { 'Authorization': `Bearer ${TOKEN}` } });
      if (barangRes.ok) {
        const barangData = (await barangRes.json()).data || [];
        barangData.forEach(b => { barangMap[b.id] = b; });
      }
    }

    // 4. Enrich items with project info + saved mapping
    const enrichedItems = items.map(item => ({
      ...item,
      project_name: projectMap[item.project_id]?.name || '-',
      project_nomor_po: projectMap[item.project_id]?.nomor_po || '-',
      project_so_customer_id: projectMap[item.project_id]?.so_customer_id || null,
      display_name: item.material_name || item.description || '-',
      category_label: getCatLabel(item.budget_category),
      // Pre-loaded mapping if identitas_barang_id was previously saved
      saved_item_id: item.identitas_barang_id || null,
      saved_item_name: item.identitas_barang_id ? (barangMap[item.identitas_barang_id]?.nama_barang_lengkap || null) : null,
      saved_item_stok: item.identitas_barang_id ? (barangMap[item.identitas_barang_id]?.stok_tersedia ?? null) : null
    }));

    return {
      data: enrichedItems,
      projects: projectData,
      count: enrichedItems.length,
      success: true
    };
  } catch (error) {
    console.error('Error fetching RAB packing list drafts:', error);
    return { data: [], projects: [], count: 0, success: false, error: error.message };
  }
}

/**
 * Save identitas_barang mapping to a project_budget item.
 * Call this when user selects a barang for an RAB item.
 * @param {number} budgetId - project_budgets.id
 * @param {number|null} identitasBarangId - identitas_barang.id (null to clear)
 */
export async function updateBudgetBarangMapping(budgetId, identitasBarangId) {
  const res = await fetch(`${API_URL}/items/project_budgets/${budgetId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`
    },
    body: JSON.stringify({ identitas_barang_id: identitasBarangId })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.errors?.[0]?.message || 'Gagal menyimpan mapping barang');
  }
  return (await res.json()).data;
}

// ==================== PROJECT PACKING LIST ====================

/**
 * Get packing list items for a project filtered by category
 * Fetches BOTH RAB items (budget_category = category) and packing-only items (budget_category = packing_category)
 * RAB items are tagged with _source='rab', packing-only with _source='packing'
 * @param {number} projectId
 * @param {string} category - e.g. 'supplier', 'consumable'
 * @returns {Promise<object>}
 */
export async function getPackingListItems(projectId, category) {
  try {
    const packingCategory = `packing_${category}`;
    const filter = JSON.stringify({
      _and: [
        { project_id: { _eq: projectId } },
        { budget_category: { _in: [category, packingCategory] } },
        { _or: [{ is_template: { _eq: false } }, { is_template: { _null: true } }] }
      ]
    });
    const url = `${API_URL}/items/project_budgets?filter=${encodeURIComponent(filter)}&sort=date_created&limit=-1`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error('Gagal mengambil data packing list');
    const result = await response.json();
    const items = (result.data || []).map(item => ({
      ...item,
      _source: item.budget_category === packingCategory ? 'packing' : 'rab'
    }));
    return { data: items, success: true };
  } catch (error) {
    console.error('Error fetching packing list items:', error);
    return { data: [], success: false, error: error.message };
  }
}

/**
 * Create a packing list item (no price fields)
 * @param {object} data - { project_id, category, description, material_name, material_color, qty, unit, pic }
 * @returns {Promise<object>}
 */
export async function createPackingListItem(data) {
  try {
    const payload = {
      project_id: data.project_id,
      budget_category: `packing_${data.category}`,
      description: data.description || '',
      material_name: data.material_name || '',
      material_color: data.material_color || '',
      qty: data.qty ? parseFloat(data.qty) : null,
      unit: data.unit || '',
      pic: data.pic || '',
      planned_amount: 0,
      actual_amount: 0,
      variance: 0,
      unit_price: null,
      koefisien: null
    };

    const response = await fetch(`${API_URL}/items/project_budgets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Gagal menyimpan item packing list');
    }

    const result = await response.json();
    return { data: result.data, success: true, message: 'Item packing list berhasil disimpan' };
  } catch (error) {
    console.error('Error creating packing list item:', error);
    return { data: null, success: false, error: error.message };
  }
}

/**
 * Create multiple packing list items in batch
 * Processes rows sequentially and collects results
 * @param {number} projectId - Project ID
 * @param {Array} rows - Array of { category, material_name, description, qty, unit, pic }
 * @param {Function} [onProgress] - Callback(current, total) for progress tracking
 * @returns {Promise<{success:boolean, created:Array, errors:Array, total:number}>}
 */
export async function createPackingListItemsBatch(projectId, rows, onProgress = null) {
  const created = [];
  const errors = [];
  const validRows = rows.filter(r => r.material_name?.trim());

  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i];
    try {
      const res = await createPackingListItem({
        project_id: projectId,
        category: row.category || 'supplier',
        material_name: row.material_name.trim(),
        description: row.description?.trim() || '',
        material_color: '',
        qty: row.qty || null,
        unit: row.unit?.trim() || '',
        pic: row.pic?.trim() || ''
      });
      if (res.success) {
        created.push(res.data);
      } else {
        errors.push({ index: i, row, error: res.error || 'Gagal menyimpan' });
      }
    } catch (e) {
      errors.push({ index: i, row, error: e.message || String(e) });
    }
    if (onProgress) onProgress(i + 1, validRows.length);
  }

  return {
    success: errors.length === 0,
    created,
    errors,
    total: validRows.length
  };
}

/**
 * Update a packing list item
 * @param {number} itemId - project_budgets ID
 * @param {object} data - Fields to update
 * @returns {Promise<object>}
 */
export async function updatePackingListItem(itemId, data) {
  try {
    const response = await fetch(`${API_URL}/items/project_budgets/${itemId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.message || 'Gagal mengupdate item');
    }
    const result = await response.json();
    return { data: result.data, success: true, message: 'Item berhasil diupdate' };
  } catch (error) {
    console.error('Error updating packing list item:', error);
    return { data: null, success: false, error: error.message };
  }
}

/**
 * Delete a packing list item
 * @param {number} itemId - project_budgets ID
 * @returns {Promise<object>}
 */
export async function deletePackingListItem(itemId) {
  try {
    const response = await fetch(`${API_URL}/items/project_budgets/${itemId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    if (!response.ok) throw new Error('Gagal menghapus item');
    return { success: true, message: 'Item berhasil dihapus' };
  } catch (error) {
    console.error('Error deleting packing list item:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get packing list summary (count per category)
 * Counts BOTH RAB items and packing-only items
 * @param {number} projectId
 * @returns {Promise<object>}
 */
export async function getPackingListSummary(projectId) {
  try {
    const categories = ['operasional', 'supplier', 'jasa', 'sewa_alat', 'consumable', 'lain_lain'];
    const allCategories = [
      ...categories,
      ...categories.map(c => `packing_${c}`)
    ];
    const filter = JSON.stringify({
      _and: [
        { project_id: { _eq: projectId } },
        { budget_category: { _in: allCategories } },
        { _or: [{ is_template: { _eq: false } }, { is_template: { _null: true } }] }
      ]
    });
    const url = `${API_URL}/items/project_budgets?filter=${encodeURIComponent(filter)}&fields=id,budget_category,qty&limit=-1`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    if (!res.ok) throw new Error('Gagal mengambil summary packing list');
    const result = await res.json();
    const items = result.data || [];

    const summary = {};
    for (const cat of categories) {
      const catItems = items.filter(i => i.budget_category === cat || i.budget_category === `packing_${cat}`);
      summary[cat] = {
        count: catItems.length,
        total_qty: catItems.reduce((sum, i) => sum + (parseFloat(i.qty) || 0), 0)
      };
    }
    summary.total_items = items.length;
    return { data: summary, success: true };
  } catch (error) {
    console.error('Error fetching packing list summary:', error);
    return { data: null, success: false, error: error.message };
  }
}

// ==================== PACKING LIST TEMPLATES ====================

/**
 * Get all packing list templates (grouped by template_name)
 * @returns {Promise<object>} List of templates with item counts
 */
export async function getPackingListTemplates() {
  try {
    const filter = JSON.stringify({ is_template: { _eq: true } });
    const url = `${API_URL}/items/project_budgets?filter=${encodeURIComponent(filter)}&fields=id,template_name,budget_category,description,material_name,material_color,qty,unit,pic,date_created&sort=template_name,date_created&limit=-1`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    if (!res.ok) throw new Error('Gagal mengambil data template');
    const result = await res.json();
    const items = result.data || [];

    // Group by template_name
    const grouped = {};
    for (const item of items) {
      const name = item.template_name || 'Untitled';
      if (!grouped[name]) {
        grouped[name] = { name, items: [], date_created: item.date_created };
      }
      grouped[name].items.push(item);
    }

    const templates = Object.values(grouped).map(t => ({
      name: t.name,
      item_count: t.items.length,
      total_qty: t.items.reduce((sum, i) => sum + (parseFloat(i.qty) || 0), 0),
      categories: [...new Set(t.items.map(i => i.budget_category))],
      date_created: t.date_created
    }));

    return { data: templates, success: true };
  } catch (error) {
    console.error('Error fetching templates:', error);
    return { data: [], success: false, error: error.message };
  }
}

/**
 * Get items for a specific template
 * @param {string} templateName
 * @returns {Promise<object>}
 */
export async function getTemplateItems(templateName) {
  try {
    const filter = JSON.stringify({
      _and: [
        { is_template: { _eq: true } },
        { template_name: { _eq: templateName } }
      ]
    });
    const url = `${API_URL}/items/project_budgets?filter=${encodeURIComponent(filter)}&sort=budget_category,date_created&limit=-1`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    if (!res.ok) throw new Error('Gagal mengambil item template');
    const result = await res.json();
    return { data: result.data || [], success: true };
  } catch (error) {
    console.error('Error fetching template items:', error);
    return { data: [], success: false, error: error.message };
  }
}

/**
 * Create a template item
 * @param {string} templateName
 * @param {object} data - { budget_category, description, material_name, material_color, qty, unit, pic }
 * @returns {Promise<object>}
 */
export async function createTemplateItem(templateName, data) {
  try {
    const payload = {
      is_template: true,
      template_name: templateName,
      project_id: null,
      budget_category: data.budget_category || 'packing_supplier',
      description: data.description || '',
      material_name: data.material_name || '',
      material_color: data.material_color || '',
      qty: data.qty ? parseFloat(data.qty) : null,
      unit: data.unit || '',
      pic: data.pic || '',
      planned_amount: 0,
      actual_amount: 0,
      variance: 0,
      unit_price: null,
      koefisien: null
    };

    const res = await fetch(`${API_URL}/items/project_budgets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.errors?.[0]?.message || 'Gagal menyimpan item template');
    }

    const result = await res.json();
    return { data: result.data, success: true, message: 'Item template berhasil disimpan' };
  } catch (error) {
    console.error('Error creating template item:', error);
    return { data: null, success: false, error: error.message };
  }
}

/**
 * Update a template item
 * @param {number} itemId
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function updateTemplateItem(itemId, data) {
  try {
    const res = await fetch(`${API_URL}/items/project_budgets/${itemId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.errors?.[0]?.message || 'Gagal update item');
    }
    const result = await res.json();
    return { data: result.data, success: true, message: 'Item berhasil diupdate' };
  } catch (error) {
    console.error('Error updating template item:', error);
    return { data: null, success: false, error: error.message };
  }
}

/**
 * Delete a single template item
 * @param {number} itemId
 * @returns {Promise<object>}
 */
export async function deleteTemplateItem(itemId) {
  try {
    const res = await fetch(`${API_URL}/items/project_budgets/${itemId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    if (!res.ok) throw new Error('Gagal menghapus item');
    return { success: true, message: 'Item berhasil dihapus' };
  } catch (error) {
    console.error('Error deleting template item:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete an entire template (all items with that template_name)
 * @param {string} templateName
 * @returns {Promise<object>}
 */
export async function deleteTemplate(templateName) {
  try {
    // First get all item IDs for this template
    const itemsRes = await getTemplateItems(templateName);
    if (!itemsRes.success || itemsRes.data.length === 0) {
      return { success: true, message: 'Template sudah kosong' };
    }

    const ids = itemsRes.data.map(i => i.id);
    // Batch delete
    const res = await fetch(`${API_URL}/items/project_budgets`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ids)
    });
    if (!res.ok) throw new Error('Gagal menghapus template');
    return { success: true, message: `Template "${templateName}" berhasil dihapus` };
  } catch (error) {
    console.error('Error deleting template:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Load template items into a project's packing list (APPEND mode)
 * Skips items where material_name/description + budget_category already exist
 * @param {string} templateName
 * @param {number} projectId
 * @returns {Promise<object>} { added, skipped, total }
 */
export async function loadTemplateToProject(templateName, projectId) {
  try {
    // 1. Get template items
    const templateRes = await getTemplateItems(templateName);
    if (!templateRes.success) throw new Error('Gagal mengambil template');
    const templateItems = templateRes.data;

    if (templateItems.length === 0) {
      return { success: true, added: 0, skipped: 0, total: 0, message: 'Template kosong' };
    }

    // 2. Get existing packing list items for this project
    const categories = [...new Set(templateItems.map(i => i.budget_category))];
    let existingItems = [];
    for (const cat of categories) {
      // Strip packing_ prefix if present for lookup, add if not
      const lookupCat = cat.startsWith('packing_') ? cat.replace('packing_', '') : cat;
      const existRes = await getPackingListItems(projectId, lookupCat);
      if (existRes.success) {
        existingItems = existingItems.concat(existRes.data);
      }
    }

    // 3. Build a set of existing item keys for duplicate detection
    const existingKeys = new Set(
      existingItems.map(i => {
        const name = (i.material_name || i.description || '').toLowerCase().trim();
        return `${i.budget_category}::${name}`;
      })
    );

    // 4. Create items that don't already exist
    let added = 0;
    let skipped = 0;
    for (const item of templateItems) {
      const budgetCategory = item.budget_category.startsWith('packing_')
        ? item.budget_category
        : `packing_${item.budget_category}`;
      const itemName = (item.material_name || item.description || '').toLowerCase().trim();
      const key = `${budgetCategory}::${itemName}`;

      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }

      const createRes = await createPackingListItem({
        project_id: projectId,
        category: budgetCategory.replace('packing_', ''),
        description: item.description || '',
        material_name: item.material_name || '',
        material_color: item.material_color || '',
        qty: item.qty,
        unit: item.unit || '',
        pic: item.pic || ''
      });

      if (createRes.success) {
        added++;
        existingKeys.add(key); // prevent further duplicates within same load
      }
    }

    return {
      success: true,
      added,
      skipped,
      total: templateItems.length,
      message: `Berhasil menambahkan ${added} item${skipped > 0 ? `, ${skipped} item dilewati (sudah ada)` : ''}`
    };
  } catch (error) {
    console.error('Error loading template to project:', error);
    return { success: false, added: 0, skipped: 0, total: 0, error: error.message };
  }
}

// ==================== PURCHASE ORDER (SO) INFO ====================

/**
 * Fetch SO Customer header info (nomor_so, customer_name, grand_total, etc.)
 * @param {number} soCustomerId - so_customer ID linked to the project
 */
export async function getProjectSOHeader(soCustomerId) {
  try {
    const res = await fetch(
      `${API_URL}/items/so_customer/${soCustomerId}?fields=id,nomor_so,customer_name,kode_customer,nomor_po_customer,tanggal_so,grand_total,subtotal,ppn_yn,ppn_rate,include_ppn,retensi,status,lokasi_pekerjaan`,
      { headers: { 'Authorization': `Bearer ${TOKEN}` } }
    );
    if (!res.ok) throw new Error('Gagal mengambil header SO');
    const data = await res.json();
    return { data: data.data, success: true };
  } catch (error) {
    console.error('Error fetching SO header:', error);
    return { data: null, success: false, error: error.message };
  }
}

/**
 * Fetch SO Customer detail line items (jasa breakdown)
 * @param {number} soCustomerId - so_customer ID linked to the project
 */
export async function getProjectSODetails(soCustomerId) {
  try {
    const res = await fetch(
      `${API_URL}/items/so_customer_details?filter[so_customer_id][_eq]=${soCustomerId}&fields=*&limit=-1&sort=id`,
      { headers: { 'Authorization': `Bearer ${TOKEN}` } }
    );
    if (!res.ok) throw new Error('Gagal mengambil detail SO');
    const data = await res.json();
    return { data: data.data || [], success: true };
  } catch (error) {
    console.error('Error fetching SO details:', error);
    return { data: [], success: false, error: error.message };
  }
}


export default {


  // Projects
  getProjects,
  getProjectDetails,
  createProject,
  updateProject,
  deleteProject,

  // Milestones
  getProjectMilestones,
  createProjectMilestone,
  updateProjectMilestone,

  // Budgets (RAB)
  getProjectBudgets,
  getProjectBudgetsByCategory,
  createProjectBudget,
  updateProjectBudget,
  deleteProjectBudget,

  // Expenses
  getProjectExpenses,
  createProjectExpense,

  // RAB Expenses
  RAB_EXPENSE_TYPES,
  RAB_EXPENSE_TYPE_LABELS,
  getProjectExpensesByType,
  createOperationalExpense,
  createSupplierExpense,
  createJasaExpense,
  createEquipmentRental,
  createConsumableExpense,
  createLainLainExpense,
  updateProjectExpenseEntry,
  deleteProjectExpenseEntry,
  getProjectRABSummary,

  // Revenue Recognition
  getProjectRevenue,
  recognizeProjectRevenue,

  // Reports
  getProjectProfitability,

  // SO Jasa Integration
  getSOJasaPending,
  createProjectFromSO,

  // Link PO to Existing Project
  getAvailableSOsForLinking,
  linkSOToProject,

  // PO (SO Customer) Info
  getProjectSOHeader,
  getProjectSODetails,

  // Barang Reference
  searchBarangForRAB,

  // RAB Packing List
  getRABPackingListDrafts,
  getProjectsForInventorySuratJalan,
  updateBudgetBarangMapping,

  // Project Packing List
  getPackingListItems,
  createPackingListItem,
  createPackingListItemsBatch,
  updatePackingListItem,
  deletePackingListItem,
  getPackingListSummary,

  // Packing List Templates
  getPackingListTemplates,
  getTemplateItems,
  createTemplateItem,
  updateTemplateItem,
  deleteTemplateItem,
  deleteTemplate,
  loadTemplateToProject,

  // Timeline Planning
  getProjectTimeline,
  saveTimelinePlanning,
  getProjectActivities,
};

// ==================== TIMELINE PLANNING ====================

/**
 * Get project timeline planning data with SO activities
 * @param {number} projectId - Project ID
 * @returns {Promise<object>} Timeline data with activities
 */
export async function getProjectTimeline(projectId) {
  try {
    const response = await fetch(
      `${API_URL}/items/projects/${projectId}?fields=id,name,timeline_planning,so_customer_id,start_date,end_date`,
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch project timeline');
    }

    const result = await response.json();
    const project = result.data;

    // Fetch SO activities if so_customer_id exists
    let activities = [];
    if (project.so_customer_id) {
      const activitiesRes = await getProjectActivities(project.so_customer_id);
      if (activitiesRes.success) {
        activities = activitiesRes.data;
      }
    }

    // Parse timeline_planning JSON
    let timelinePlanning = { activities: [], metadata: {} };
    if (project.timeline_planning) {
      try {
        timelinePlanning = typeof project.timeline_planning === 'string'
          ? JSON.parse(project.timeline_planning)
          : project.timeline_planning;
      } catch (e) {
        console.error('Error parsing timeline_planning:', e);
      }
    }

    return {
      success: true,
      data: {
        project: {
          id: project.id,
          name: project.name,
          start_date: project.start_date,
          end_date: project.end_date,
        },
        soActivities: activities,
        timelinePlanning: timelinePlanning,
      }
    };
  } catch (error) {
    console.error('Error fetching project timeline:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Save timeline planning data to project
 * @param {number} projectId - Project ID
 * @param {object} timelineData - Timeline planning data
 * @returns {Promise<object>} Success status
 */
export async function saveTimelinePlanning(projectId, timelineData) {
  try {
    const response = await fetch(
      `${API_URL}/items/projects/${projectId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          timeline_planning: timelineData
        })
      }
    );

    if (!response.ok) {
      throw new Error('Failed to save timeline planning');
    }

    const result = await response.json();
    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    console.error('Error saving timeline planning:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get activities from SO customer details
 * @param {number} soCustomerId - SO Customer ID
 * @returns {Promise<object>} List of activities
 */
export async function getProjectActivities(soCustomerId) {
  try {
    const response = await fetch(
      `${API_URL}/items/so_customer_details?filter[so_customer_id][_eq]=${soCustomerId}&fields=id,jenis_jasa,nama_barang,keterangan,so_type,qty,packing,jumlah_pcs`,
      {
        headers: {
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch SO activities');
    }

    const result = await response.json();
    const details = result.data || [];

    // Transform SO details to activity list
    const activities = details.map((det, index) => ({
      id: `so_activity_${det.id}`,
      so_detail_id: det.id,
      activity_name: det.nama_barang || det.jenis_jasa || `Activity ${index + 1}`,
      activity_type: det.so_type || 'General',
      description: det.keterangan || '',
      quantity: det.qty || 0,
      unit: det.packing || '',
      jumlah_pcs: det.jumlah_pcs || 1,
    }));

    return {
      success: true,
      data: activities
    };
  } catch (error) {
    console.error('Error fetching project activities:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

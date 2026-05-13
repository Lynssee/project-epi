<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		IconArrowLeft, IconPackage, IconClipboardCheck, IconBox,
		IconChevronDown, IconChevronRight, IconLoader2, IconPlus,
		IconTruck, IconFileText, IconEdit, IconCheck
	} from '@tabler/icons-svelte';
	import { onMount } from 'svelte';
	import { authStore, isLeaderRole } from '$lib/stores/auth';
	import { getProjects } from '$lib/services/projects';
	import { getPackingRequests, getAllProjectsInventory, updateMaterialUsage } from '$lib/services/packingList';

	let activeTab = $state<'pengajuan' | 'inventory'>('pengajuan');
	let loading = $state(true);

	// Pengajuan tab
	let packingRequests = $state<any[]>([]);
	let filteredRequests = $state<any[]>([]);
	let activeFilter = $state('semua');

	// Inventory tab
	let projects = $state<any[]>([]);
	let inventoryByProject = $state<Record<number, any[]>>({});
	let expandedProject = $state<number | null>(null);
	let projectNames = $state<Record<number, string>>({});

	// Pengajuan accordion
	let expandedPengajuanProject = $state<number | null>(null);

	// Material usage edit
	let editingItem = $state<number | null>(null);
	let editQtyUsed = $state(0);
	let savingUsage = $state(false);

	let currentRoleId: string | null = null;
	let currentKaryawanName: string | null = null;

	const unsubAuth = authStore.subscribe((s) => {
		currentRoleId = s.roleId;
		currentKaryawanName = s.karyawanName;
	});

	onMount(async () => {
		try {
			// Fetch projects, packing requests, and inventory concurrently
			const [projResult, requests, allInventory] = await Promise.all([
				(isLeaderRole(currentRoleId) && currentKaryawanName) ? getProjects(currentKaryawanName) : getProjects(),
				getPackingRequests(),
				getAllProjectsInventory()
			]);

			projects = projResult || [];
			for (const p of projects) {
				projectNames[p.id] = p.name;
			}

			packingRequests = requests || [];
			applyFilter('semua');
			const grouped: Record<number, any[]> = {};
			for (const item of allInventory) {
				const pid = item.project_id;
				if (!grouped[pid]) grouped[pid] = [];
				grouped[pid].push(item);
			}
			inventoryByProject = grouped;
		} catch (e) {
			console.error('Gagal memuat data:', e);
		} finally {
			loading = false;
		}

		return () => unsubAuth();
	});

	const filters = [
		{ id: 'semua', label: 'Semua' },
		{ id: 'requested', label: 'Diajukan' },
		{ id: 'approved', label: 'Disetujui' },
		{ id: 'shipped', label: 'Dikirim' },
		{ id: 'received', label: 'Diterima' }
	];

	function applyFilter(filter: string) {
		activeFilter = filter;
		if (filter === 'semua') {
			filteredRequests = packingRequests;
		} else {
			filteredRequests = packingRequests.filter(r => r.packing_status === filter);
		}
	}

	function getStatusLabel(status: string) {
		switch (status) {
			case 'requested': return 'Diajukan';
			case 'approved': return 'Disetujui';
			case 'shipped': return 'Dikirim';
			case 'received': return 'Diterima';
			default: return status || '-';
		}
	}

	function getStatusClass(status: string) {
		switch (status) {
			case 'requested': return 'pend';
			case 'approved': return 'ok';
			case 'shipped': return 'warn';
			case 'received': return 'ok';
			default: return 'pend';
		}
	}

	function toggleProject(pid: number) {
		expandedProject = expandedProject === pid ? null : pid;
	}

	function togglePengajuanProject(pid: number) {
		expandedPengajuanProject = expandedPengajuanProject === pid ? null : pid;
	}

	function formatCurrency(val: number) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
	}

	function getUsagePercent(item: any) {
		if (!item.qty || item.qty === 0) return 0;
		return Math.min(100, Math.round(((item.qty_used || 0) / item.qty) * 100));
	}

	function startEditUsage(item: any) {
		editingItem = item.id;
		editQtyUsed = item.qty_used || 0;
	}

	function cancelEditUsage() {
		editingItem = null;
		editQtyUsed = 0;
	}

	async function saveUsage(item: any) {
		savingUsage = true;
		try {
			const success = await updateMaterialUsage(item.id, editQtyUsed, item.qty || 0);
			if (success) {
				// Update local state
				const pid = item.project_id;
				if (inventoryByProject[pid]) {
					inventoryByProject[pid] = inventoryByProject[pid].map(i => {
						if (i.id === item.id) {
							return { ...i, qty_used: editQtyUsed, qty_remaining: (i.qty || 0) - editQtyUsed };
						}
						return i;
					});
				}
				editingItem = null;
			} else {
				alert('Gagal menyimpan pemakaian.');
			}
		} catch {
			alert('Terjadi kesalahan.');
		} finally {
			savingUsage = false;
		}
	}

	// Count inventory projects
	let inventoryProjectIds = $derived(Object.keys(inventoryByProject).map(Number));

	// Group pengajuan requests by project
	let requestsByProject = $derived(() => {
		const grouped: Record<number, any[]> = {};
		for (const item of filteredRequests) {
			const pid = item.project_id;
			if (!grouped[pid]) grouped[pid] = [];
			grouped[pid].push(item);
		}
		return grouped;
	});

	let requestProjectIds = $derived(Object.keys(requestsByProject()).map(Number));
</script>

<div class="flex-1 flex flex-col h-full overflow-hidden">
	<div class="tb green">
		<button class="tbb" onclick={() => goto('/')}><IconArrowLeft size={22} /></button>
		<h1>Packing List</h1>
		<button class="tbb" onclick={() => goto('/packing-list/baru')}><IconPlus size={22} /></button>
	</div>

	{#if loading}
		<div class="flex-1 flex items-center justify-center">
			<IconLoader2 size={32} class="animate-spin text-[var(--g)]" />
		</div>
	{:else}
		<!-- Tabs -->
		<div class="flex border-b border-gray-200 bg-white sticky top-[52px] z-20">
			<button
				class="flex-1 py-2.5 text-[13px] font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer
					{activeTab === 'pengajuan' ? 'border-[var(--g)] text-[var(--g)]' : 'border-transparent text-gray-400 hover:text-gray-600'}"
				onclick={() => { activeTab = 'pengajuan'; }}
			>
				<IconClipboardCheck size={16} /> Pengajuan
			</button>
			<button
				class="flex-1 py-2.5 text-[13px] font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors cursor-pointer
					{activeTab === 'inventory' ? 'border-[var(--g)] text-[var(--g)]' : 'border-transparent text-gray-400 hover:text-gray-600'}"
				onclick={() => { activeTab = 'inventory'; }}
			>
				<IconBox size={16} /> Inventory Proyek
			</button>
		</div>

		<div class="scroll-body px-4 py-3">
			{#if activeTab === 'pengajuan'}
				<!-- Stats -->
				<div class="grid grid-cols-2 gap-2.5 mb-3.5">
					<div class="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3.5 border border-gray-100">
						<p class="text-[10px] text-gray-400 mb-1 font-semibold uppercase tracking-wider">Total diajukan</p>
						<strong class="text-[17px] font-semibold text-gray-800">{packingRequests.length} item</strong>
					</div>
					<div class="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3.5 border border-gray-100">
						<p class="text-[10px] text-gray-400 mb-1 font-semibold uppercase tracking-wider">Menunggu</p>
						<strong class="text-[17px] font-semibold text-[var(--amd)]">{packingRequests.filter(r => r.packing_status === 'requested').length} item</strong>
					</div>
				</div>

				<!-- Filters -->
				<div class="flex gap-1.5 mb-4 overflow-x-auto pb-0.5 shrink-0">
					{#each filters as f}
						<button
							class="px-3.5 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap cursor-pointer transition-all {activeFilter === f.id ? 'border border-[var(--g)] bg-[var(--gl)] text-[var(--gd)]' : 'border border-gray-200 bg-white text-gray-500 hover:border-gray-300'}"
							onclick={() => applyFilter(f.id)}
						>{f.label}</button>
					{/each}
				</div>

				<!-- Request List -->
				{#if filteredRequests.length === 0}
					<div class="text-center py-8 text-gray-400 text-[13px]">Tidak ada data pengajuan packing.</div>
				{:else}
					{#each requestProjectIds as pid}
						{@const items = requestsByProject()[pid] || []}
						{@const totalItems = items.length}
						{@const statusCounts = items.reduce((acc: Record<string, number>, i: any) => {
							acc[i.packing_status] = (acc[i.packing_status] || 0) + 1;
							return acc;
						}, {} as Record<string, number>)}
						{@const isExpanded = expandedPengajuanProject === pid}

						<button
							class="w-full border rounded-xl mb-2 bg-white overflow-hidden transition-all cursor-pointer text-left
								{isExpanded ? 'border-[var(--g)]/30 shadow-sm' : 'border-gray-100 hover:border-gray-200'}"
							onclick={() => togglePengajuanProject(pid)}
						>
							<!-- Accordion Header -->
							<div class="flex items-center gap-3 p-3.5">
								<div class="w-10 h-10 rounded-xl bg-[var(--gl)] flex items-center justify-center shrink-0">
									<IconPackage size={20} class="text-[var(--g)]" />
								</div>
								<div class="flex-1 min-w-0">
									<p class="text-[13px] font-medium text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">
										{projectNames[pid] || `Proyek ID-${pid}`}
									</p>
									<p class="text-[11px] text-gray-400 mt-0.5">
										{totalItems} item
										{#if statusCounts.requested}
											· {statusCounts.requested} diajukan
										{/if}
									</p>
								</div>
								<div class="transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}">
									<IconChevronDown size={18} class="text-gray-400" />
								</div>
							</div>
						</button>

						<!-- Accordion Content -->
						{#if isExpanded}
							<div class="mx-1 mb-3 bg-gray-50/50 rounded-lg border border-gray-100">
								{#each items as item, idx}
									<div class="flex items-center gap-2 px-3 py-2 {idx !== items.length - 1 ? 'border-b border-gray-100' : ''}">
										<div class="flex-1 min-w-0">
											<p class="text-[12px] font-medium text-gray-800">
												{item.material_name || item.description || 'Material'}
											</p>
											<p class="text-[10px] text-gray-400">
												{item.qty || 0} {item.unit || ''}
												{#if item.material_color}
													· {item.material_color}
												{/if}
											</p>
										</div>
										<span class="badge {getStatusClass(item.packing_status)} shrink-0 !text-[10px] !px-2 !py-0.5">
											{getStatusLabel(item.packing_status)}
										</span>
									</div>
								{/each}
							</div>
						{/if}
					{/each}
				{/if}

				<div class="h-3"></div>
				<button class="btn-primary" onclick={() => goto('/packing-list/baru')}>
					<IconPlus size={18} /> Ajukan Packing List Baru
				</button>
				<div class="h-4"></div>

			{:else}
				<!-- Inventory Tab: Accordion per Project -->
				{#if inventoryProjectIds.length === 0}
					<div class="text-center py-8 text-gray-400 text-[13px]">Belum ada inventory material di proyek.</div>
				{:else}
					{#each inventoryProjectIds as pid}
						{@const items = inventoryByProject[pid] || []}
						{@const totalItems = items.length}
						{@const totalUsed = items.reduce((a, i) => a + (i.qty_used || 0), 0)}
						{@const isExpanded = expandedProject === pid}

						<button
							class="w-full border rounded-xl mb-2 bg-white overflow-hidden transition-all cursor-pointer text-left
								{isExpanded ? 'border-[var(--g)]/30 shadow-sm' : 'border-gray-100 hover:border-gray-200'}"
							onclick={() => toggleProject(pid)}
						>
							<!-- Accordion Header -->
							<div class="flex items-center gap-3 p-3.5">
								<div class="w-10 h-10 rounded-xl bg-[var(--gl)] flex items-center justify-center shrink-0">
									<IconBox size={20} class="text-[var(--g)]" />
								</div>
								<div class="flex-1 min-w-0">
									<p class="text-[13px] font-medium text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">
										{projectNames[pid] || `Proyek ID-${pid}`}
									</p>
									<p class="text-[11px] text-gray-400 mt-0.5">{totalItems} material</p>
								</div>
								<div class="transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}">
									<IconChevronDown size={18} class="text-gray-400" />
								</div>
							</div>
						</button>

						<!-- Accordion Content -->
						{#if isExpanded}
							<div class="mx-1 mb-3 space-y-2">
								{#each items as inv}
									{@const usagePct = getUsagePercent(inv)}
									<div class="border border-gray-100 rounded-xl p-3 bg-gray-50/50">
										<div class="flex items-start gap-2.5 mb-2">
											<div class="w-8 h-8 rounded-lg bg-[var(--gl)] flex items-center justify-center shrink-0 mt-0.5">
												<IconPackage size={16} class="text-[var(--g)]" />
											</div>
											<div class="flex-1 min-w-0">
												<p class="text-[13px] font-medium text-gray-800">{inv.material_name || '-'}</p>
												{#if inv.material_color}
													<p class="text-[11px] text-gray-400">{inv.material_color}</p>
												{/if}
											</div>
										</div>

										<!-- Qty Info -->
										<div class="grid grid-cols-3 gap-2 text-center mb-2">
											<div class="bg-white rounded-lg p-2 border border-gray-100">
												<p class="text-[10px] text-gray-400 mb-0.5">Dikirim</p>
												<p class="text-[13px] font-semibold text-gray-800">{inv.qty || 0}</p>
												<p class="text-[10px] text-gray-400">{inv.unit || ''}</p>
											</div>
											<div class="bg-white rounded-lg p-2 border border-gray-100">
												<p class="text-[10px] text-gray-400 mb-0.5">Terpakai</p>
												<p class="text-[13px] font-semibold text-[var(--amd)]">{inv.qty_used || 0}</p>
												<p class="text-[10px] text-gray-400">{inv.unit || ''}</p>
											</div>
											<div class="bg-white rounded-lg p-2 border border-gray-100">
												<p class="text-[10px] text-gray-400 mb-0.5">Sisa</p>
												<p class="text-[13px] font-semibold text-[var(--gd)]">{inv.qty_remaining ?? ((inv.qty || 0) - (inv.qty_used || 0))}</p>
												<p class="text-[10px] text-gray-400">{inv.unit || ''}</p>
											</div>
										</div>

										<!-- Progress Bar -->
										<div class="mb-2">
											<div class="flex justify-between text-[10px] mb-1">
												<span class="text-gray-400">Pemakaian</span>
												<span class="font-medium text-gray-600">{usagePct}%</span>
											</div>
											<div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
												<div
													class="h-full rounded-full transition-all duration-300
														{usagePct >= 90 ? 'bg-[var(--re)]' : usagePct >= 50 ? 'bg-[var(--am)]' : 'bg-[var(--g)]'}"
													style="width: {usagePct}%"
												></div>
											</div>
										</div>

										<!-- Surat Jalan -->
										{#if inv.reference_number}
											<div class="flex items-center gap-1.5 text-[11px] text-gray-400 mb-2">
												<IconFileText size={13} /> SJ: {inv.reference_number}
											</div>
										{/if}

										<!-- Edit Usage -->
										{#if editingItem === inv.id}
											<div class="flex items-center gap-2 mt-2 bg-white rounded-lg p-2 border border-[var(--g)]/20">
												<div class="flex-1">
													<label class="text-[10px] text-gray-400 block mb-0.5">Qty terpakai</label>
													<input
														type="number"
														class="f-input !py-1.5 !text-[13px]"
														bind:value={editQtyUsed}
														min="0"
														max={inv.qty || 999}
													/>
												</div>
												<div class="flex gap-1 pt-3.5">
													<button
														class="w-8 h-8 rounded-lg bg-[var(--g)] text-white flex items-center justify-center cursor-pointer border-none disabled:opacity-50"
														onclick={() => saveUsage(inv)}
														disabled={savingUsage}
													>
														<IconCheck size={16} />
													</button>
													<button
														class="w-8 h-8 rounded-lg bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer border-none"
														onclick={cancelEditUsage}
													>✕</button>
												</div>
											</div>
										{:else}
											<button
												class="w-full mt-1 py-1.5 border border-dashed border-[var(--g)] rounded-lg bg-[var(--gl)] text-[var(--gd)] text-[11px] cursor-pointer flex items-center justify-center gap-1 font-medium transition-all active:scale-[0.98]"
												onclick={() => startEditUsage(inv)}
											>
												<IconEdit size={13} /> Update pemakaian
											</button>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					{/each}
				{/if}

				<div class="h-4"></div>
			{/if}
		</div>
	{/if}
</div>

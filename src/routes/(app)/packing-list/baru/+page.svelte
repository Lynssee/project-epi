<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		IconArrowLeft, IconPackage, IconInfoCircle, IconPlus, IconCheck,
		IconLoader2, IconSend, IconTrash, IconListNumbers, IconSearch, IconNewSection, IconTemplate
	} from '@tabler/icons-svelte';
	import { onMount } from 'svelte';
	import { authStore, isLeaderRole } from '$lib/stores/auth';
	import { getProjects } from '$lib/services/projects';
	import {
		getProjectBudgetItems, submitPackingRequest, createPackingListItems
	} from '$lib/services/packingList';
	import TemplateSelector from '$lib/components/packing-list/TemplateSelector.svelte';

	let projects = $state<any[]>([]);
	let selectedProject = $state('');
	let loading = $state(true);
	let loadingItems = $state(false);
	let submitting = $state(false);

	let currentRoleId: string | null = null;
	let currentKaryawanName: string | null = null;

	const unsubAuth = authStore.subscribe((s) => {
		currentRoleId = s.roleId;
		currentKaryawanName = s.karyawanName;
	});

	// === Barang yang sudah ada di RAB ===
	let existingItems = $state<any[]>([]);
	let selectedExisting = $state<Set<number>>(new Set());
	let searchQuery = $state('');

	let filteredExisting = $derived(
		searchQuery.trim()
			? existingItems.filter(i =>
				(i.material_name || i.description || '').toLowerCase().includes(searchQuery.toLowerCase())
			)
			: existingItems
	);

	// === Barang baru (input manual) ===
	let newItems = $state<Array<{
		material_name: string;
		material_color: string;
		qty: number;
		unit: string;
		unit_price: number;
		description: string;
	}>>([]);

	const unitOptions = ['Kg', 'Liter', 'Pcs', 'Set', 'Batang', 'Lembar', 'Roll', 'Sak', 'Drum', 'Galon', 'Ls', 'M', 'M²', 'M³'];

	// === Computed ===
	let totalExistingSelected = $derived(selectedExisting.size);
	let totalNewItems = $derived(newItems.filter(i => i.material_name.trim()).length);
	let totalItems = $derived(totalExistingSelected + totalNewItems);

	onMount(async () => {
		try {
			let projResult: any[];
			if (isLeaderRole(currentRoleId) && currentKaryawanName) {
				projResult = await getProjects(currentKaryawanName);
			} else {
				projResult = await getProjects();
			}
			projects = projResult || [];
			if (projects.length > 0) {
				selectedProject = String(projects[0].id);
				await loadExistingItems(Number(selectedProject));
			}
		} catch (e) {
			console.error('Gagal memuat proyek:', e);
		} finally {
			loading = false;
		}
		return () => unsubAuth();
	});

	async function loadExistingItems(projectId: number) {
		loadingItems = true;
		selectedExisting = new Set();
		try {
			const result = await getProjectBudgetItems(projectId);
			existingItems = result || [];
		} catch (e) {
			console.error('Gagal memuat item RAB:', e);
			existingItems = [];
		} finally {
			loadingItems = false;
		}
	}

	async function handleProjectChange() {
		if (selectedProject) {
			await loadExistingItems(Number(selectedProject));
		}
	}

	function toggleExisting(id: number) {
		const s = new Set(selectedExisting);
		if (s.has(id)) s.delete(id); else s.add(id);
		selectedExisting = s;
	}

	function toggleAllExisting() {
		if (selectedExisting.size === filteredExisting.length && filteredExisting.length > 0) {
			selectedExisting = new Set();
		} else {
			selectedExisting = new Set(filteredExisting.map(i => i.id));
		}
	}

	function addNewItem() {
		newItems = [...newItems, { material_name: '', material_color: '', qty: 1, unit: 'Kg', unit_price: 0, description: '' }];
	}

	function removeNewItem(index: number) {
		newItems = newItems.filter((_, i) => i !== index);
	}

	function formatCurrency(val: number) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
	}

	async function handleSubmit() {
		if (totalItems === 0) {
			alert('Pilih minimal 1 barang atau tambahkan barang baru.');
			return;
		}

		try {
			submitting = true;
			let success = true;

			// 1. Submit existing items (update packing_status)
			if (selectedExisting.size > 0) {
				const ids = Array.from(selectedExisting);
				const result = await submitPackingRequest(ids);
				if (!result) success = false;
			}

			// 2. Create new items
			const validNewItems = newItems.filter(i => i.material_name.trim());
			if (validNewItems.length > 0) {
				const result = await createPackingListItems(
					Number(selectedProject),
					validNewItems,
					currentKaryawanName || 'Leader'
				);
				if (!result) success = false;
			}

			if (success) {
				alert(`Packing list berhasil dikirim! (${totalItems} item) ✓`);
				goto('/packing-list');
			} else {
				alert('Terjadi kesalahan saat mengirim sebagian data.');
			}
		} catch (e) {
			alert('Gagal mengirim pengajuan packing list.');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="flex-1 flex flex-col h-full overflow-hidden">
	<div class="tb green">
		<button class="tbb" onclick={() => goto('/packing-list')}><IconArrowLeft size={22} /></button>
		<h1>Buat Packing List</h1>
		<div class="w-7"></div>
	</div>

	{#if loading}
		<div class="flex-1 flex items-center justify-center">
			<IconLoader2 size={32} class="animate-spin text-[var(--g)]" />
		</div>
	{:else}
		<div class="scroll-body px-4 py-3">
			<!-- Pilih Project -->
			<div class="card-section">
				<h4><IconInfoCircle size={16} class="text-[var(--g)]" /> Pilih Proyek</h4>
				<div>
					<label class="f-label">Proyek</label>
					<select bind:value={selectedProject} class="f-select" onchange={handleProjectChange}>
						{#each projects as p}
							<option value={String(p.id)}>{p.name} (ID-{p.id})</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- ====== SECTION 0: Load dari Template ====== -->
			<div class="card-section">
				<h4><IconTemplate size={16} class="text-[var(--g)]" /> Load dari Template</h4>
				<p class="text-[11px] text-gray-400 -mt-1 mb-3">Muat item dari template yang sudah ada.</p>

				{#if selectedProject}
					<TemplateSelector
						projectId={Number(selectedProject)}
					/>
				{:else}
					<div class="text-center py-4 text-gray-400 text-[12px] bg-gray-50 rounded-lg">
						Pilih project terlebih dahulu untuk memuat template.
					</div>
				{/if}
			</div>

			<!-- ====== SECTION 1: Barang yang sudah ada di RAB ====== -->
			<div class="card-section">
				<h4><IconPackage size={16} class="text-[var(--g)]" /> Pilih dari RAB yang ada</h4>
				<p class="text-[11px] text-gray-400 -mt-1 mb-3">Pilih material yang sudah ada di RAB proyek ini.</p>

				{#if loadingItems}
					<div class="flex justify-center py-4">
						<IconLoader2 size={24} class="animate-spin text-[var(--g)]" />
					</div>
				{:else if existingItems.length === 0}
					<div class="text-center py-4 text-gray-400 text-[12px] bg-gray-50 rounded-lg">
						Tidak ada item RAB tersedia di proyek ini.
					</div>
				{:else}
					<!-- Search -->
					<div class="relative mb-2.5">
						<IconSearch size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
						<input
							type="text"
							class="f-input !pl-9 !py-2 !text-[13px]"
							placeholder="Cari material..."
							bind:value={searchQuery}
						/>
					</div>

					<!-- Select all -->
					<button
						class="w-full flex items-center gap-2 py-2 px-3 rounded-lg bg-gray-50 border border-gray-100 mb-2 cursor-pointer text-[12px] font-medium text-gray-600 transition-all hover:bg-gray-100"
						onclick={toggleAllExisting}
					>
						<div class="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
							{selectedExisting.size === filteredExisting.length && filteredExisting.length > 0 ? 'bg-[var(--g)] border-[var(--g)]' : 'border-gray-300 bg-white'}">
							{#if selectedExisting.size === filteredExisting.length && filteredExisting.length > 0}
								<IconCheck size={12} class="text-white" />
							{/if}
						</div>
						Pilih semua ({filteredExisting.length})
					</button>

					<!-- Item list -->
					<div class="space-y-1.5 max-h-[250px] overflow-y-auto">
						{#each filteredExisting as item}
							{@const isSelected = selectedExisting.has(item.id)}
							<button
								class="w-full flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer text-left transition-all active:scale-[0.98]
									{isSelected ? 'border-[var(--g)] bg-[var(--gl)]/50' : 'border-gray-100 bg-white hover:border-gray-200'}"
								onclick={() => toggleExisting(item.id)}
							>
								<div class="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
									{isSelected ? 'bg-[var(--g)] border-[var(--g)]' : 'border-gray-300 bg-white'}">
									{#if isSelected}
										<IconCheck size={12} class="text-white" />
									{/if}
								</div>
								<div class="flex-1 min-w-0">
									<p class="text-[13px] font-medium text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">{item.material_name || item.description || 'Item'}</p>
									<p class="text-[11px] text-gray-400">
										{item.qty || 0} {item.unit || ''} · {formatCurrency(item.unit_price || 0)}/sat
										{#if item.material_color} · {item.material_color}{/if}
									</p>
								</div>
								<span class="text-[11px] font-semibold text-[var(--gd)] shrink-0">{formatCurrency((item.qty || 0) * (item.unit_price || 0))}</span>
							</button>
						{/each}
					</div>

					{#if selectedExisting.size > 0}
						<div class="bg-[var(--gl)] rounded-lg p-2.5 mt-2 flex justify-between items-center">
							<span class="text-[11px] text-[var(--gd)] font-medium">Dipilih dari RAB</span>
							<span class="text-[13px] font-semibold text-[var(--gd)]">{selectedExisting.size} item</span>
						</div>
					{/if}
				{/if}
			</div>

			<!-- ====== SECTION 2: Tambah barang baru ====== -->
			<div class="card-section">
				<h4><IconNewSection size={16} class="text-[var(--g)]" /> Tambah barang baru</h4>
				<p class="text-[11px] text-gray-400 -mt-1 mb-3">Input material baru yang belum ada di RAB.</p>

				{#each newItems as item, i}
					<div class="border border-gray-100 rounded-xl p-3 mb-3 bg-gray-50/30 relative">
						<div class="flex items-center justify-between mb-2.5">
							<span class="text-[11px] font-semibold text-gray-400">Barang baru #{i + 1}</span>
							<button
								class="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 cursor-pointer border-none bg-transparent transition-colors"
								onclick={() => removeNewItem(i)}
							>
								<IconTrash size={14} />
							</button>
						</div>

						<div class="mb-2">
							<label class="f-label">Nama Material</label>
							<input type="text" class="f-input" bind:value={item.material_name} placeholder="Contoh: FOXACRYL ENAMEL" />
						</div>

						<div class="mb-2">
							<label class="f-label">Warna / Kode</label>
							<input type="text" class="f-input" bind:value={item.material_color} placeholder="Contoh: OX-101 GREY" />
						</div>

						<div class="grid grid-cols-2 gap-2 mb-2">
							<div>
								<label class="f-label">Qty</label>
								<input type="number" class="f-input" bind:value={item.qty} min="0.1" step="0.1" />
							</div>
							<div>
								<label class="f-label">Satuan</label>
								<select bind:value={item.unit} class="f-select">
									{#each unitOptions as u}
										<option>{u}</option>
									{/each}
								</select>
							</div>
						</div>
					</div>
				{/each}

				<button class="btn-action" onclick={addNewItem}>
					<IconPlus size={14} /> Tambah barang baru
				</button>

				{#if newItems.length > 0 && totalNewItems > 0}
					<div class="bg-[var(--gl)] rounded-lg p-2.5 mt-2 flex justify-between items-center">
						<span class="text-[11px] text-[var(--gd)] font-medium">Total barang baru</span>
						<span class="text-[13px] font-semibold text-[var(--gd)]">{totalNewItems} item</span>
					</div>
				{/if}
			</div>

			<!-- Summary Total -->
			{#if totalItems > 0}
				<div class="bg-gradient-to-br from-[var(--gl)] to-white rounded-xl p-4 border border-[var(--g)]/15 mb-3">
					<div class="flex justify-between items-center">
						<div>
							<p class="text-[13px] font-semibold text-[var(--gd)]">Total pengajuan</p>
							<p class="text-[11px] text-[var(--g)] mt-0.5">
								{totalExistingSelected > 0 ? `${totalExistingSelected} dari RAB` : ''}
								{totalExistingSelected > 0 && totalNewItems > 0 ? ' + ' : ''}
								{totalNewItems > 0 ? `${totalNewItems} barang baru` : ''}
							</p>
						</div>
						<strong class="text-[20px] font-semibold text-[var(--gd)]">{totalItems} item</strong>
					</div>
				</div>
			{/if}
		</div>

		<!-- Bottom Bar -->
		<div class="bottom-bar shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
			<button
				class="btn-primary"
				onclick={handleSubmit}
				disabled={submitting || totalItems === 0}
			>
				{#if submitting}
					<IconLoader2 size={16} class="animate-spin" /> Mengirim...
				{:else}
					<IconSend size={16} /> Kirim packing list ({totalItems} item)
				{/if}
			</button>
		</div>
	{/if}
</div>

<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		IconArrowLeft, IconPackage, IconBox, IconFileText,
		IconEdit, IconCheck, IconLoader2, IconTruck
	} from '@tabler/icons-svelte';
	import { onMount } from 'svelte';
	import { getProjectInventory, updateMaterialUsage } from '$lib/services/packingList';
	import { getProjectById } from '$lib/services/projects';

	let projectId = $derived(Number($page.params.project_id));
	let project = $state<any>(null);
	let inventory = $state<any[]>([]);
	let loading = $state(true);

	// Material usage edit
	let editingItem = $state<number | null>(null);
	let editQtyUsed = $state(0);
	let savingUsage = $state(false);

	onMount(async () => {
		try {
			const [projResult, invResult] = await Promise.all([
				getProjectById(projectId),
				getProjectInventory(projectId)
			]);
			project = projResult;
			inventory = invResult || [];
		} catch (e) {
			console.error('Gagal memuat data:', e);
		} finally {
			loading = false;
		}
	});

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
				inventory = inventory.map(i => {
					if (i.id === item.id) {
						return { ...i, qty_used: editQtyUsed, qty_remaining: (i.qty || 0) - editQtyUsed };
					}
					return i;
				});
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

	// Summary stats
	let totalItems = $derived(inventory.length);
	let totalQty = $derived(inventory.reduce((a, i) => a + (i.qty || 0), 0));
	let totalUsed = $derived(inventory.reduce((a, i) => a + (i.qty_used || 0), 0));
	let totalValue = $derived(inventory.reduce((a, i) => a + (i.expense_amount || 0), 0));
</script>

<div class="flex-1 flex flex-col h-full overflow-hidden">
	<div class="tb green">
		<button class="tbb" onclick={() => goto('/packing-list')}><IconArrowLeft size={22} /></button>
		<h1>Inventory {project?.name || `Proyek ${projectId}`}</h1>
		<div class="w-7"></div>
	</div>

	{#if loading}
		<div class="flex-1 flex items-center justify-center">
			<IconLoader2 size={32} class="animate-spin text-[var(--g)]" />
		</div>
	{:else}
		<div class="scroll-body px-4 py-3">
			<!-- Project info -->
			<div class="bg-gradient-to-br from-[var(--gl)] to-white rounded-xl p-4 mb-3.5 border border-[var(--g)]/10">
				<p class="text-[15px] font-semibold text-[var(--gd)]">{project?.name || 'Proyek'}</p>
				<p class="text-[11px] text-[var(--g)] mt-0.5">{project?.lokasi || '-'} · ID-{projectId}</p>
			</div>

			<!-- Stats -->
			<div class="grid grid-cols-3 gap-2 mb-3.5">
				<div class="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3 border border-gray-100 text-center">
					<p class="text-[10px] text-gray-400 mb-0.5 font-semibold uppercase tracking-wider">Material</p>
					<strong class="text-[16px] font-semibold text-gray-800">{totalItems}</strong>
				</div>
				<div class="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3 border border-gray-100 text-center">
					<p class="text-[10px] text-gray-400 mb-0.5 font-semibold uppercase tracking-wider">Total Qty</p>
					<strong class="text-[16px] font-semibold text-gray-800">{totalQty}</strong>
				</div>
				<div class="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3 border border-gray-100 text-center">
					<p class="text-[10px] text-gray-400 mb-0.5 font-semibold uppercase tracking-wider">Nilai</p>
					<strong class="text-[13px] font-semibold text-gray-800">{formatCurrency(totalValue)}</strong>
				</div>
			</div>

			<!-- Material List -->
			{#if inventory.length === 0}
				<div class="text-center py-8 text-gray-400 text-[13px]">Belum ada material di proyek ini.</div>
			{:else}
				<div class="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-2 flex items-center gap-1.5">
					<IconBox size={14} /> Daftar material ({inventory.length})
				</div>

				{#each inventory as inv}
					{@const usagePct = getUsagePercent(inv)}
					<div class="border border-gray-100 rounded-xl p-3.5 mb-2.5 bg-white">
						<!-- Material header -->
						<div class="flex items-start gap-2.5 mb-3">
							<div class="w-10 h-10 rounded-xl bg-[var(--gl)] flex items-center justify-center shrink-0">
								<IconPackage size={20} class="text-[var(--g)]" />
							</div>
							<div class="flex-1 min-w-0">
								<p class="text-[14px] font-medium text-gray-800">{inv.material_name || '-'}</p>
								{#if inv.material_color}
									<p class="text-[11px] text-gray-400 mt-0.5">{inv.material_color}</p>
								{/if}
								{#if inv.reference_number}
									<div class="flex items-center gap-1 mt-1">
										<IconFileText size={12} class="text-gray-300" />
										<span class="text-[11px] text-gray-400">SJ: {inv.reference_number}</span>
									</div>
								{/if}
							</div>
							<div class="text-right shrink-0">
								<p class="text-[12px] font-semibold text-[var(--gd)]">{formatCurrency(inv.expense_amount || 0)}</p>
								<p class="text-[10px] text-gray-400 mt-0.5">{formatCurrency(inv.unit_price || 0)}/{inv.unit || 'sat'}</p>
							</div>
						</div>

						<!-- Qty Grid -->
						<div class="grid grid-cols-3 gap-2 text-center mb-3">
							<div class="bg-blue-50 rounded-lg p-2.5 border border-blue-100">
								<div class="flex items-center justify-center gap-1 mb-0.5">
									<IconTruck size={12} class="text-blue-500" />
									<p class="text-[10px] text-blue-500 font-medium">Dikirim</p>
								</div>
								<p class="text-[15px] font-semibold text-blue-700">{inv.qty || 0}</p>
								<p class="text-[10px] text-blue-400">{inv.unit || ''}</p>
							</div>
							<div class="bg-amber-50 rounded-lg p-2.5 border border-amber-100">
								<div class="flex items-center justify-center gap-1 mb-0.5">
									<IconEdit size={12} class="text-amber-500" />
									<p class="text-[10px] text-amber-500 font-medium">Terpakai</p>
								</div>
								<p class="text-[15px] font-semibold text-amber-700">{inv.qty_used || 0}</p>
								<p class="text-[10px] text-amber-400">{inv.unit || ''}</p>
							</div>
							<div class="bg-emerald-50 rounded-lg p-2.5 border border-emerald-100">
								<div class="flex items-center justify-center gap-1 mb-0.5">
									<IconBox size={12} class="text-emerald-500" />
									<p class="text-[10px] text-emerald-500 font-medium">Sisa</p>
								</div>
								<p class="text-[15px] font-semibold text-emerald-700">{inv.qty_remaining ?? ((inv.qty || 0) - (inv.qty_used || 0))}</p>
								<p class="text-[10px] text-emerald-400">{inv.unit || ''}</p>
							</div>
						</div>

						<!-- Progress Bar -->
						<div class="mb-3">
							<div class="flex justify-between text-[10px] mb-1">
								<span class="text-gray-400">Pemakaian material</span>
								<span class="font-semibold {usagePct >= 90 ? 'text-[var(--re)]' : usagePct >= 50 ? 'text-[var(--am)]' : 'text-[var(--g)]'}">{usagePct}%</span>
							</div>
							<div class="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
								<div
									class="h-full rounded-full transition-all duration-500
										{usagePct >= 90 ? 'bg-gradient-to-r from-[var(--re)] to-red-400' : usagePct >= 50 ? 'bg-gradient-to-r from-[var(--am)] to-amber-400' : 'bg-gradient-to-r from-[var(--g)] to-emerald-400'}"
									style="width: {usagePct}%"
								></div>
							</div>
						</div>

						<!-- Edit Usage -->
						{#if editingItem === inv.id}
							<div class="flex items-center gap-2 bg-[var(--gl)] rounded-xl p-3 border border-[var(--g)]/20">
								<div class="flex-1">
									<label class="text-[10px] text-[var(--gd)] block mb-1 font-medium">Qty terpakai ({inv.unit || 'sat'})</label>
									<input
										type="number"
										class="f-input !py-2 !text-[14px]"
										bind:value={editQtyUsed}
										min="0"
										max={inv.qty || 999}
									/>
								</div>
								<div class="flex gap-1.5 pt-4">
									<button
										class="w-9 h-9 rounded-lg bg-[var(--g)] text-white flex items-center justify-center cursor-pointer border-none disabled:opacity-50 transition-all active:scale-95"
										onclick={() => saveUsage(inv)}
										disabled={savingUsage}
									>
										{#if savingUsage}
											<IconLoader2 size={16} class="animate-spin" />
										{:else}
											<IconCheck size={16} />
										{/if}
									</button>
									<button
										class="w-9 h-9 rounded-lg bg-white text-gray-500 flex items-center justify-center cursor-pointer border border-gray-200 transition-all active:scale-95"
										onclick={cancelEditUsage}
									>✕</button>
								</div>
							</div>
						{:else}
							<button
								class="w-full py-2 border border-dashed border-[var(--g)] rounded-xl bg-[var(--gl)] text-[var(--gd)] text-[12px] cursor-pointer flex items-center justify-center gap-1.5 font-medium transition-all active:scale-[0.98] hover:shadow-sm"
								onclick={() => startEditUsage(inv)}
							>
								<IconEdit size={14} /> Update pemakaian
							</button>
						{/if}
					</div>
				{/each}
			{/if}

			<div class="h-4"></div>
		</div>
	{/if}
</div>

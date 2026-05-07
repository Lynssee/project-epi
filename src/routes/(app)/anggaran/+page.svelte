<script lang="ts">
	import { goto } from '$app/navigation';
	import { IconArrowLeft, IconPlus, IconList, IconReceipt2, IconChevronRight, IconPackage, IconTools, IconLoader2 } from '@tabler/icons-svelte';
	import { onMount } from 'svelte';
	import { getPengajuanAnggaran } from '$lib/services/finance';

	let allBudgets = $state<any[]>([]);
	let filteredBudgets = $state<any[]>([]);
	let totalDiajukan = $state(0);
	let menungguAcc = $state(0);
	let loading = $state(true);
	let activeFilter = $state('semua');

	onMount(async () => {
		try {
			const result = await getPengajuanAnggaran(50);
			allBudgets = result || [];
			totalDiajukan = allBudgets.reduce((acc: number, curr: any) => acc + (curr.total_amount || 0), 0);
			menungguAcc = allBudgets.filter((b: any) => !isApproved(b.status)).reduce((acc: number, curr: any) => acc + (curr.total_amount || 0), 0);
			applyFilter('semua');
		} catch (e) {
			console.error('Gagal memuat pengajuan:', e);
		} finally {
			loading = false;
		}
	});

	function isApproved(status: string) {
		return status?.includes('Verified') || status?.includes('Selesai');
	}
	function isRejected(status: string) {
		return status?.includes('Ditolak') || status?.includes('Rejected');
	}

	function getStatusLabel(status: string) {
		if (!status) return 'Menunggu';
		if (isApproved(status)) return 'Disetujui';
		if (isRejected(status)) return 'Ditolak';
		return 'Menunggu';
	}

	function getStatusClass(status: string) {
		const label = getStatusLabel(status);
		if (label === 'Disetujui') return 'ok';
		if (label === 'Ditolak') return 'rej';
		return 'pend';
	}

	function applyFilter(filter: string) {
		activeFilter = filter;
		if (filter === 'semua') {
			filteredBudgets = allBudgets;
		} else if (filter === 'menunggu') {
			filteredBudgets = allBudgets.filter(b => !isApproved(b.status) && !isRejected(b.status));
		} else if (filter === 'disetujui') {
			filteredBudgets = allBudgets.filter(b => isApproved(b.status));
		} else if (filter === 'ditolak') {
			filteredBudgets = allBudgets.filter(b => isRejected(b.status));
		}
	}

	function formatCurrency(val: number) {
		if (val >= 1000000) return 'Rp ' + (val / 1000000).toFixed(1).replace('.0', '') + ' jt';
		if (val >= 1000) return 'Rp ' + (val / 1000).toFixed(0) + ' rb';
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
	}

	function formatCurrencyFull(val: number) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
	}

	const filters = [
		{ id: 'semua', label: 'Semua' },
		{ id: 'menunggu', label: 'Menunggu' },
		{ id: 'disetujui', label: 'Disetujui' },
		{ id: 'ditolak', label: 'Ditolak' }
	];
</script>

<div class="flex-1 flex flex-col h-full overflow-hidden">
	<div class="tb purple">
		<button class="tbb" onclick={() => goto('/')}><IconArrowLeft size={22} /></button>
		<h1>Pengajuan Anggaran</h1>
		<button class="tbb" onclick={() => goto('/anggaran/baru')}><IconPlus size={22} /></button>
	</div>

	{#if loading}
		<div class="flex-1 flex items-center justify-center">
			<IconLoader2 size={32} class="animate-spin text-[var(--p)]" />
		</div>
	{:else}
		<div class="scroll-body px-4 py-3">
			<!-- Stats -->
			<div class="grid grid-cols-2 gap-2.5 mb-3.5">
				<div class="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3.5 border border-gray-100">
					<p class="text-[10px] text-gray-400 mb-1 font-semibold uppercase tracking-wider">Total diajukan</p>
					<strong class="text-[17px] font-semibold text-gray-800">{formatCurrency(totalDiajukan)}</strong>
				</div>
				<div class="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3.5 border border-gray-100">
					<p class="text-[10px] text-gray-400 mb-1 font-semibold uppercase tracking-wider">Menunggu ACC</p>
					<strong class="text-[17px] font-semibold text-[var(--amd)]">{formatCurrency(menungguAcc)}</strong>
				</div>
			</div>

			<!-- Filters -->
			<div class="flex gap-1.5 mb-4 overflow-x-auto pb-0.5 shrink-0">
				{#each filters as f}
					<button
						class="px-3.5 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap cursor-pointer transition-all {activeFilter === f.id ? 'border border-[var(--p)] bg-[var(--pl)] text-[var(--pd)]' : 'border border-gray-200 bg-white text-gray-500 hover:border-gray-300'}"
						onclick={() => applyFilter(f.id)}
					>{f.label}</button>
				{/each}
			</div>

			<!-- List -->
			<div class="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-2 flex items-center gap-1.5">
				<IconList size={14} /> Riwayat pengajuan ({filteredBudgets.length})
			</div>

			{#if filteredBudgets.length === 0}
				<div class="text-center py-8 text-gray-400 text-[13px]">Tidak ada data pengajuan.</div>
			{:else}
				{#each filteredBudgets as budget}
					<button
						class="w-full border border-gray-100 rounded-xl p-3 mb-2 cursor-pointer flex items-center gap-3 bg-white hover:shadow-sm text-left transition-all active:scale-[0.98]"
						onclick={() => goto(`/anggaran/${budget.id}`)}
					>
						<div class="w-10 h-10 rounded-xl bg-[var(--pl)] flex items-center justify-center shrink-0">
							{#if budget.kategori === 'material'}
								<IconPackage size={20} class="text-[var(--p)]" />
							{:else if budget.kategori === 'alat'}
								<IconTools size={20} class="text-[var(--p)]" />
							{:else}
								<IconReceipt2 size={20} class="text-[var(--p)]" />
							{/if}
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-[13px] font-medium text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">{budget.tujuan_pengajuan || 'Pengajuan Anggaran'}</p>
							<p class="text-[11px] text-gray-400 mt-0.5">{new Intl.DateTimeFormat('id-ID', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(budget.date_created))}</p>
							<p class="text-[12px] font-semibold text-[var(--pd)] mt-1">{formatCurrencyFull(budget.total_amount || 0)}</p>
						</div>
						<div class="flex flex-col items-end gap-1.5">
							<span class="badge {getStatusClass(budget.status)}">{getStatusLabel(budget.status)}</span>
							<IconChevronRight size={14} class="text-gray-300" />
						</div>
					</button>
				{/each}
			{/if}

			<div class="h-3"></div>
			<button class="btn-primary purple" onclick={() => goto('/anggaran/baru')}>
				<IconPlus size={18} /> Buat pengajuan baru
			</button>
			<div class="h-4"></div>
		</div>
	{/if}
</div>

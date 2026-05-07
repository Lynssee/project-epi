<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		IconArrowLeft, IconListNumbers, IconTimeline,
		IconCheck, IconClock, IconX, IconEdit, IconLoader2
	} from '@tabler/icons-svelte';
	import { onMount } from 'svelte';
	import { getPengajuanById } from '$lib/services/finance';

	let id = $derived($page.params.id);
	let budget = $state<any>(null);
	let loading = $state(true);

	onMount(async () => {
		try {
			const result = await getPengajuanById(id);
			budget = result;
		} catch (e) {
			console.error('Gagal memuat detail:', e);
		} finally {
			loading = false;
		}
	});

	function formatCurrency(val: number) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
	}

	function formatDate(dateStr: string) {
		if (!dateStr) return '-';
		return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr));
	}

	function getStatusLabel(status: string) {
		if (!status) return 'Menunggu';
		if (status.includes('Verified') || status.includes('Selesai')) return 'Disetujui';
		if (status.includes('Ditolak') || status.includes('Rejected')) return 'Ditolak';
		return 'Menunggu';
	}

	function getStatusClass(status: string) {
		const label = getStatusLabel(status);
		if (label === 'Disetujui') return 'ok';
		if (label === 'Ditolak') return 'rej';
		return 'pend';
	}
</script>

<div class="flex-1 flex flex-col h-full overflow-hidden">
	<div class="tb purple">
		<button class="tbb" onclick={() => goto('/anggaran')}><IconArrowLeft size={22} /></button>
		<h1>Detail pengajuan</h1>
		<div class="w-7"></div>
	</div>

	{#if loading}
		<div class="flex-1 flex items-center justify-center">
			<IconLoader2 size={32} class="animate-spin text-[var(--p)]" />
		</div>
	{:else if !budget}
		<div class="flex-1 flex items-center justify-center">
			<p class="text-gray-400 text-sm">Data tidak ditemukan.</p>
		</div>
	{:else}
		<div class="scroll-body px-4 py-3">
			<!-- Header card -->
			<div class="bg-gradient-to-br from-[var(--pl)] to-white rounded-xl p-4 mb-3.5 border border-[var(--p)]/10">
				<div class="flex justify-between items-start mb-3">
					<div class="flex-1 min-w-0 pr-2">
						<p class="text-[15px] font-semibold text-[var(--pd)]">{budget.tujuan_pengajuan || 'Pengajuan Anggaran'}</p>
						<p class="text-[11px] text-[var(--p)] mt-0.5">Proyek ID: {budget.project_id} · {budget.nomor_pengajuan || ''}</p>
					</div>
					<span class="badge {getStatusClass(budget.status)}">{getStatusLabel(budget.status)}</span>
				</div>
				<div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
					<div><span class="text-[var(--p)]/70">Kategori:</span> <span class="text-[var(--pd)] font-medium capitalize">{budget.kategori || '-'}</span></div>
					<div><span class="text-[var(--p)]/70">Urgensi:</span> <span class="text-[var(--amd)] font-medium">{budget.urgency || '-'}</span></div>
					<div><span class="text-[var(--p)]/70">Diajukan:</span> <span class="text-[var(--pd)] font-medium">{formatDate(budget.date_created)}</span></div>
					<div><span class="text-[var(--p)]/70">Butuh:</span> <span class="text-[var(--pd)] font-medium">{formatDate(budget.tanggal_dibutuhkan)}</span></div>
				</div>
			</div>

			<!-- Rincian -->
			<div class="card-section">
				<h4><IconListNumbers size={16} class="text-[var(--p)]" /> Rincian pengajuan</h4>

				{#if budget.nama_pengaju}
					<div class="flex justify-between py-2 border-b border-gray-100 text-[12px]">
						<span class="text-gray-400">Pengaju</span>
						<span class="font-medium text-gray-700">{budget.nama_pengaju}</span>
					</div>
				{/if}
				{#if budget.payment_method}
					<div class="flex justify-between py-2 border-b border-gray-100 text-[12px]">
						<span class="text-gray-400">Metode Bayar</span>
						<span class="font-medium text-gray-700">{budget.payment_method}</span>
					</div>
				{/if}
				{#if budget.penerima_dana_nama}
					<div class="flex justify-between py-2 border-b border-gray-100 text-[12px]">
						<span class="text-gray-400">Penerima</span>
						<span class="font-medium text-gray-700">{budget.penerima_dana_nama}</span>
					</div>
				{/if}
				{#if budget.bank_name}
					<div class="flex justify-between py-2 border-b border-gray-100 text-[12px]">
						<span class="text-gray-400">Bank</span>
						<span class="font-medium text-gray-700">{budget.bank_name} - {budget.bank_account_number}</span>
					</div>
				{/if}

				<div class="bg-[var(--pl)] rounded-xl p-3 flex justify-between items-center mt-2.5">
					<span class="text-[12px] font-semibold text-[var(--pd)]">Total</span>
					<strong class="text-[17px] font-semibold text-[var(--pd)]">{formatCurrency(budget.total_amount || 0)}</strong>
				</div>
			</div>

			<!-- Timeline -->
			<div class="card-section">
				<h4><IconTimeline size={16} class="text-[var(--p)]" /> Status persetujuan</h4>

				<!-- Step 1: Submitted -->
				<div class="flex gap-3 items-start py-2.5 border-b border-gray-100">
					<div class="w-7 h-7 rounded-full bg-[var(--gg)] flex items-center justify-center shrink-0">
						<IconCheck size={14} class="text-[var(--ggd)]" />
					</div>
					<div>
						<p class="text-[13px] font-medium text-gray-800">Diajukan oleh {budget.nama_pengaju || 'Leader'}</p>
						<p class="text-[11px] text-gray-400">{formatDate(budget.date_created)}</p>
					</div>
				</div>

				<!-- Step 2: Project Finance -->
				<div class="flex gap-3 items-start py-2.5 border-b border-gray-100">
					{#if budget.project_finance_approved}
						<div class="w-7 h-7 rounded-full bg-[var(--gg)] flex items-center justify-center shrink-0">
							<IconCheck size={14} class="text-[var(--ggd)]" />
						</div>
						<div>
							<p class="text-[13px] font-medium text-gray-800">Disetujui Project Finance</p>
							<p class="text-[11px] text-gray-400">{budget.project_finance_approved_by || ''} · {formatDate(budget.project_finance_approved_date)}</p>
						</div>
					{:else}
						<div class="w-7 h-7 rounded-full bg-[var(--aml)] flex items-center justify-center shrink-0">
							<IconClock size={14} class="text-[var(--amd)]" />
						</div>
						<div>
							<p class="text-[13px] font-medium text-gray-500">Menunggu Project Finance</p>
							<p class="text-[11px] text-gray-400">Belum diproses</p>
						</div>
					{/if}
				</div>

				<!-- Step 3: Manager -->
				<div class="flex gap-3 items-start py-2.5 border-b border-gray-100 {budget.project_finance_approved ? '' : 'opacity-30'}">
					{#if budget.manager_project_approved}
						<div class="w-7 h-7 rounded-full bg-[var(--gg)] flex items-center justify-center shrink-0">
							<IconCheck size={14} class="text-[var(--ggd)]" />
						</div>
						<div>
							<p class="text-[13px] font-medium text-gray-800">Disetujui Manajer Proyek</p>
							<p class="text-[11px] text-gray-400">{formatDate(budget.manager_project_approved_date)}</p>
						</div>
					{:else}
						<div class="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
							<IconClock size={14} class="text-gray-400" />
						</div>
						<div>
							<p class="text-[13px] text-gray-500">Menunggu Manajer Proyek</p>
							<p class="text-[11px] text-gray-400">Menunggu persetujuan sebelumnya</p>
						</div>
					{/if}
				</div>

				<!-- Step 4: Finance -->
				<div class="flex gap-3 items-start py-2.5 {budget.manager_project_approved ? '' : 'opacity-30'}">
					{#if budget.finance_approved}
						<div class="w-7 h-7 rounded-full bg-[var(--gg)] flex items-center justify-center shrink-0">
							<IconCheck size={14} class="text-[var(--ggd)]" />
						</div>
						<div>
							<p class="text-[13px] font-medium text-gray-800">Pencairan dana</p>
							<p class="text-[11px] text-gray-400">{formatDate(budget.finance_approved_date)}</p>
						</div>
					{:else}
						<div class="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
							<IconClock size={14} class="text-gray-400" />
						</div>
						<div>
							<p class="text-[13px] text-gray-500">Pencairan dana</p>
							<p class="text-[11px] text-gray-400">Menunggu persetujuan</p>
						</div>
					{/if}
				</div>
			</div>

			{#if budget.comments}
				<div class="card-section">
					<h4>Keterangan</h4>
					<p class="text-[13px] text-gray-600">{budget.comments}</p>
				</div>
			{/if}
		</div>

		<div class="bottom-bar shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
			<div class="flex gap-2">
				<button
					class="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-500 text-[13px] font-medium flex items-center justify-center gap-1.5 cursor-pointer active:bg-gray-50 transition-all"
					onclick={() => { if(confirm('Batalkan pengajuan ini?')) alert('Pengajuan dibatalkan'); }}
				>
					<IconX size={16} /> Batalkan
				</button>
				<button
					class="flex-1 py-2.5 bg-[var(--p)] text-white border-none rounded-xl text-[13px] font-medium flex items-center justify-center gap-1.5 cursor-pointer active:bg-[var(--pd)] transition-all"
					onclick={() => alert('Fitur edit akan segera tersedia')}
				>
					<IconEdit size={16} /> Edit
				</button>
			</div>
		</div>
	{/if}
</div>

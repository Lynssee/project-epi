<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		IconArrowLeft, IconInfoCircle, IconListNumbers, IconPlus,
		IconNote, IconPaperclip, IconDeviceFloppy, IconSend, IconLoader2
	} from '@tabler/icons-svelte';
	import { onMount } from 'svelte';
	import { getProjects } from '$lib/services/projects';
	import { createPengajuanAnggaran } from '$lib/services/finance';

	let projects = $state<any[]>([]);
	let selectedProject = $state('');
	let tujuanPengajuan = $state('');
	let kategori = $state('material');
	let urgency = $state('Normal');
	let tanggalDibutuhkan = $state(new Date().toISOString().split('T')[0]);
	let notes = $state('');
	let submitting = $state(false);
	let loading = $state(true);

	let items = $state([{ name: '', qty: 1, unit: 'kg', price: 0 }]);
	let totalAmount = $derived(items.reduce((acc, curr) => acc + (curr.qty * curr.price), 0));

	onMount(async () => {
		try {
			const projResult = await getProjects();
			projects = projResult || [];
			if (projects.length > 0) selectedProject = String(projects[0].id);
		} catch (e) {
			console.error('Gagal memuat proyek:', e);
		} finally {
			loading = false;
		}
	});

	function formatCurrency(val: number) {
		return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
	}

	function addItem() {
		items = [...items, { name: '', qty: 1, unit: 'pcs', price: 0 }];
	}

	function removeItem(i: number) {
		if (items.length > 1) {
			items = items.filter((_, idx) => idx !== i);
		}
	}

	async function handleSubmit() {
		if (!tujuanPengajuan.trim()) {
			alert('Judul pengajuan harus diisi.');
			return;
		}
		try {
			submitting = true;
			await createPengajuanAnggaran({
				project_id: Number(selectedProject),
				tujuan_pengajuan: tujuanPengajuan,
				kategori,
				urgency,
				tanggal_dibutuhkan: tanggalDibutuhkan,
				total_amount: totalAmount,
				comments: notes
			});
			alert('Pengajuan berhasil dikirim! ✓');
			goto('/anggaran');
		} catch (e) {
			alert('Gagal mengirim pengajuan.');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="flex-1 flex flex-col h-full overflow-hidden">
	<div class="tb purple">
		<button class="tbb" onclick={() => goto('/anggaran')}><IconArrowLeft size={22} /></button>
		<h1>Pengajuan baru</h1>
		<div class="w-7"></div>
	</div>

	{#if loading}
		<div class="flex-1 flex items-center justify-center">
			<IconLoader2 size={32} class="animate-spin text-[var(--p)]" />
		</div>
	{:else}
		<div class="scroll-body px-4 py-3">
			<!-- Informasi -->
			<div class="card-section">
				<h4><IconInfoCircle size={16} class="text-[var(--p)]" /> Informasi pengajuan</h4>
				<div class="mb-2.5"><label class="f-label">Proyek</label>
					<select bind:value={selectedProject} class="f-select">
						{#each projects as p}
							<option value={String(p.id)}>{p.name} (ID-{p.id})</option>
						{/each}
					</select>
				</div>
				<div class="mb-2.5"><label class="f-label">Judul pengajuan</label><input type="text" bind:value={tujuanPengajuan} placeholder="Contoh: Pembelian cat epoxy..." class="f-input"></div>
				<div class="grid grid-cols-2 gap-2 mb-2.5">
					<div><label class="f-label">Kategori</label><select bind:value={kategori} class="f-select"><option value="material">Material</option><option value="alat">Alat</option><option value="jasa">Jasa</option><option value="operasional">Operasional</option></select></div>
					<div><label class="f-label">Urgensi</label><select bind:value={urgency} class="f-select"><option value="Normal">Normal</option><option value="Urgent">Urgent</option><option value="Sangat Urgent">Sangat Urgent</option></select></div>
				</div>
				<div><label class="f-label">Tanggal dibutuhkan</label><input type="date" bind:value={tanggalDibutuhkan} class="f-input"></div>
			</div>

			<!-- Rincian item -->
			<div class="card-section">
				<h4><IconListNumbers size={16} class="text-[var(--p)]" /> Rincian item</h4>
				{#each items as item, i}
					<div class="border-b border-gray-100 pb-3 mb-3 last:border-none last:pb-0 last:mb-0 relative">
						{#if items.length > 1}
							<button class="absolute top-0 right-0 text-gray-300 hover:text-red-400 text-[11px]" onclick={() => removeItem(i)}>✕</button>
						{/if}
						<div class="mb-2"><label class="f-label">Nama item</label><input type="text" bind:value={item.name} class="f-input" placeholder="Cat Epoxy..."></div>
						<div class="grid grid-cols-3 gap-2 mb-2">
							<div><label class="f-label">Jumlah</label><input type="number" bind:value={item.qty} class="f-input" min="1"></div>
							<div><label class="f-label">Satuan</label><select bind:value={item.unit} class="f-select"><option>kg</option><option>liter</option><option>sak</option><option>pcs</option></select></div>
							<div><label class="f-label">Harga/sat</label><input type="number" bind:value={item.price} class="f-input"></div>
						</div>
						<div class="bg-gray-50 rounded-lg p-2.5 flex justify-between items-center border border-gray-100">
							<span class="text-[12px] text-gray-400">Subtotal</span>
							<span class="text-[13px] font-semibold text-[var(--pd)]">{formatCurrency(item.qty * item.price)}</span>
						</div>
					</div>
				{/each}

				<button class="btn-action purple" onclick={addItem}>
					<IconPlus size={14} /> Tambah item
				</button>

				<div class="bg-[var(--pl)] rounded-xl p-3.5 flex justify-between items-center mt-3">
					<span class="text-[12px] font-semibold text-[var(--pd)]">Total pengajuan</span>
					<strong class="text-[18px] font-semibold text-[var(--pd)]">{formatCurrency(totalAmount)}</strong>
				</div>
			</div>

			<!-- Keterangan -->
			<div class="card-section">
				<h4><IconNote size={16} class="text-[var(--p)]" /> Keterangan & lampiran</h4>
				<div class="mb-2.5"><label class="f-label">Keterangan / alasan</label><textarea bind:value={notes} rows="3" placeholder="Jelaskan keperluan pengajuan..." class="f-textarea"></textarea></div>
				<div class="border border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors">
					<IconPaperclip size={22} class="text-gray-300 mx-auto" />
					<p class="text-[12px] text-gray-400 mt-1.5">Upload penawaran / foto referensi</p>
					<p class="text-[11px] text-gray-300 mt-0.5">JPG, PNG, PDF — maks 5MB</p>
				</div>
			</div>
		</div>

		<div class="bottom-bar shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
			<div class="flex gap-2">
				<button class="py-2.5 px-4 border border-gray-200 rounded-xl text-gray-500 text-[13px] font-medium flex items-center gap-1.5 cursor-pointer active:bg-gray-50 transition-all" onclick={() => alert('Disimpan sebagai draft')}>
					<IconDeviceFloppy size={16} /> Draft
				</button>
				<button
					class="flex-1 py-2.5 bg-[var(--p)] text-white border-none rounded-xl text-[13px] font-medium flex items-center justify-center gap-1.5 cursor-pointer active:bg-[var(--pd)] transition-all disabled:opacity-60"
					onclick={handleSubmit}
					disabled={submitting}
				>
					{#if submitting}
						<IconLoader2 size={16} class="animate-spin" /> Mengirim...
					{:else}
						<IconSend size={16} /> Kirim pengajuan
					{/if}
				</button>
			</div>
		</div>
	{/if}
</div>

<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import {
		IconArrowLeft, IconHistory, IconCalendarTime, IconChartLine,
		IconPackage, IconUsers, IconAlertCircle, IconDeviceFloppy,
		IconSend, IconPlus, IconTrash, IconLoader2, IconListCheck,
		IconStack2, IconAlertTriangle, IconTool, IconReceipt, IconCamera
	} from '@tabler/icons-svelte';
	import { onMount } from 'svelte';
	import { getProjectById } from '$lib/services/projects';
	import { submitReport, uploadFile } from '$lib/services/reports';
	import { authStore, getUserDisplay } from '$lib/stores/auth';

	let projectId = $derived($page.params.project_id);
	let project = $state<any>(null);
	let loading = $state(true);
	let submitting = $state(false);
	let activeTab = $state('jadwal');
	let userName = $state('LEADER');

	const unsubAuth = authStore.subscribe((s) => {
		if (s.user) userName = getUserDisplay(s.user);
	});

	const tabs = [
		{ id: 'jadwal', label: 'Jadwal' },
		{ id: 'progress', label: 'Progress' },
		{ id: 'material', label: 'Material' },
		{ id: 'tenaga', label: 'Tenaga' },
		{ id: 'lainnya', label: 'Lainnya' }
	];

	let reportData = $state({
		schedule: [{ activity: '', start_time: '', end_time: '', status: 'pending' }],
		progress: [{ activity: '', progress_value: 0, unit: 'm²', notes: '', category: '' }],
		material_used: [{ type: '', amount: 0, unit: 'kg', notes: '' }],
		material_stock: [{ type: '', amount: 0, unit: 'kg' }],
		material_needs: [{ type: '', amount: 0, unit: 'kg', notes: '', urgency: 'normal', description: '', date_needed: '' }],
		tomorrow_plan: [{ activity: '', notes: '', description: '' }],
		issues: [{ description: '' }],
		manpower: [{ role: 'BORONGAN', count: 0, notes: '' }],
		attendance_photos: [] as { file: File; name: string; url: string }[],
		progress_photos: [] as { file: File; name: string; url: string }[],
		issue_photos: [] as { file: File; name: string; url: string }[],
		tools: [{ name: '', amount: 0 }],
		budget_notes: ''
	});

	onMount(async () => {
		try {
			const result = await getProjectById(projectId);
			project = result;
		} catch (e) {
			console.error('Gagal memuat proyek:', e);
		} finally {
			loading = false;
		}

		return () => unsubAuth();
	});

	async function saveDraft() {
		alert('Tersimpan sebagai draft ✓');
	}

	async function sendReport() {
		try {
			submitting = true;

			const attendance_photos = [];
			for (const photo of reportData.attendance_photos) {
				const uploaded = await uploadFile(photo.file);
				if (uploaded && uploaded.id) attendance_photos.push(uploaded.id);
			}

			const progress_photos = [];
			for (const photo of reportData.progress_photos) {
				const uploaded = await uploadFile(photo.file);
				if (uploaded && uploaded.id) progress_photos.push(uploaded.id);
			}

			const issue_photos = [];
			for (const photo of reportData.issue_photos) {
				const uploaded = await uploadFile(photo.file);
				if (uploaded && uploaded.id) issue_photos.push(uploaded.id);
			}

			await submitReport({
				project_id: Number(projectId),
				date: new Date().toISOString(),
				prepared_by: userName,
				...reportData,
				attendance_photos,
				progress_photos,
				issue_photos
			});
			alert('Laporan berhasil dikirim! ✓');
			goto('/');
		} catch (e) {
			alert('Gagal mengirim laporan');
		} finally {
			submitting = false;
		}
	}

	function addSchedule() {
		reportData.schedule = [...reportData.schedule, { activity: '', start_time: '', end_time: '', status: 'pending' }];
	}
	function removeSchedule(i: number) {
		reportData.schedule = reportData.schedule.filter((_, idx) => idx !== i);
	}
	function addProgress() {
		reportData.progress = [...reportData.progress, { activity: '', progress_value: 0, unit: 'm²', notes: '', category: '' }];
	}
	function removeProgress(i: number) {
		reportData.progress = reportData.progress.filter((_, idx) => idx !== i);
	}
	function addMaterialUsed() {
		reportData.material_used = [...reportData.material_used, { type: '', amount: 0, unit: 'kg', notes: '' }];
	}
	function removeMaterialUsed(i: number) {
		reportData.material_used = reportData.material_used.filter((_, idx) => idx !== i);
	}
	function addMaterialStock() {
		reportData.material_stock = [...reportData.material_stock, { type: '', amount: 0, unit: 'kg' }];
	}
	function addMaterialNeeds() {
		reportData.material_needs = [...reportData.material_needs, { type: '', amount: 0, unit: 'kg', notes: '', urgency: 'normal', description: '', date_needed: '' }];
	}
	function addManpower() {
		reportData.manpower = [...reportData.manpower, { role: 'BORONGAN', count: 0, notes: '' }];
	}
	function addTomorrowPlan() {
		reportData.tomorrow_plan = [...reportData.tomorrow_plan, { activity: '', notes: '', description: '' }];
	}
	function addIssue() {
		reportData.issues = [...reportData.issues, { description: '' }];
	}
	function addTool() {
		reportData.tools = [...reportData.tools, { name: '', amount: 0 }];
	}
	function handleAttendancePhoto(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			const file = target.files[0];
			const url = URL.createObjectURL(file);
			reportData.attendance_photos = [...reportData.attendance_photos, { file, name: file.name, url }];
		}
	}
	function removeAttendancePhoto(index: number) {
		reportData.attendance_photos = reportData.attendance_photos.filter((_, i) => i !== index);
	}
	function handleProgressPhoto(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			const file = target.files[0];
			const url = URL.createObjectURL(file);
			reportData.progress_photos = [...reportData.progress_photos, { file, name: file.name, url }];
		}
	}
	function removeProgressPhoto(index: number) {
		reportData.progress_photos = reportData.progress_photos.filter((_, i) => i !== index);
	}
	function handleIssuePhoto(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			const file = target.files[0];
			const url = URL.createObjectURL(file);
			reportData.issue_photos = [...reportData.issue_photos, { file, name: file.name, url }];
		}
	}
	function removeIssuePhoto(index: number) {
		reportData.issue_photos = reportData.issue_photos.filter((_, i) => i !== index);
	}
</script>

<div class="flex-1 flex flex-col h-full overflow-hidden">
	<!-- Topbar -->
	<div class="tb green">
		<button class="tbb" onclick={() => goto('/')}><IconArrowLeft size={22} /></button>
		<h1>{project?.name ? (project.name.length > 24 ? project.name.substring(0, 22) + '…' : project.name) : 'Laporan Harian'}</h1>
		<button class="tbb"><IconHistory size={20} /></button>
	</div>

	{#if loading}
		<div class="flex-1 flex items-center justify-center">
			<IconLoader2 size={32} class="animate-spin text-[var(--g)]" />
		</div>
	{:else}
		<!-- Report meta -->
		<div class="bg-gray-50 border-b border-gray-100 p-3 px-4">
			<div class="grid grid-cols-2 gap-x-4 gap-y-1.5">
				<div><span class="text-[10px] text-gray-400 uppercase font-semibold">Tanggal</span><p class="text-[12px] font-medium text-gray-700">{new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())}</p></div>
				<div><span class="text-[10px] text-gray-400 uppercase font-semibold">Prepared by</span><p class="text-[12px] font-medium text-gray-700">{userName}</p></div>
				<div><span class="text-[10px] text-gray-400 uppercase font-semibold">Proyek ID</span><p class="text-[12px] font-medium text-gray-700">#{projectId}</p></div>
				<div><span class="text-[10px] text-gray-400 uppercase font-semibold">Status</span><p class="text-[12px] font-medium text-[var(--am)]">● Draft</p></div>
			</div>
		</div>

		<!-- Tab Navigation -->
		<div class="flex gap-0.5 bg-gray-100 p-1 mx-4 mt-3 mb-3 rounded-xl overflow-x-auto shrink-0">
			{#each tabs as tab}
				<button
					class="flex-1 py-2 rounded-lg text-[11px] font-semibold whitespace-nowrap min-w-[56px] transition-all {activeTab === tab.id ? 'bg-white text-[var(--g)] shadow-sm' : 'text-gray-400 hover:text-gray-600'}"
					onclick={() => activeTab = tab.id}
				>{tab.label}</button>
			{/each}
		</div>

		<!-- Tab Content -->
		<div class="scroll-body px-4 pb-4">
			{#if activeTab === 'jadwal'}
				<!-- Jadwal kegiatan -->
				<div class="card-section">
					<h4><IconCalendarTime size={16} class="text-[var(--g)]" /> Jadwal kegiatan</h4>
					{#each reportData.schedule as item, i}
						<div class="border-b border-gray-100 pb-3 mb-3 last:border-none last:pb-0 last:mb-0 relative">
							{#if reportData.schedule.length > 1}
								<button class="absolute top-0 right-0 text-gray-300 hover:text-red-400 transition-colors" onclick={() => removeSchedule(i)}><IconTrash size={14} /></button>
							{/if}
							<div class="mb-2"><label class="f-label">Aktivitas</label><input type="text" bind:value={item.activity} class="f-input" placeholder="Pengecatan lantai..."></div>
							<div class="grid grid-cols-2 gap-2 mb-2">
								<div><label class="f-label">Mulai</label><input type="time" bind:value={item.start_time} class="f-input"></div>
								<div><label class="f-label">Selesai</label><input type="time" bind:value={item.end_time} class="f-input"></div>
							</div>
							<div><label class="f-label">Status</label><select bind:value={item.status} class="f-select"><option value="complete">Complete</option><option value="on-progress">On-progress</option><option value="pending">Pending</option></select></div>
						</div>
					{/each}
					<button class="btn-action" onclick={addSchedule}><IconPlus size={14} /> Tambah jadwal</button>
				</div>

				<!-- Rencana besok -->
				<div class="card-section">
					<h4><IconListCheck size={16} class="text-[var(--g)]" /> Rencana besok</h4>
					{#each reportData.tomorrow_plan as item, i}
						<div class="border-b border-gray-100 pb-3 mb-3 last:border-none last:pb-0 last:mb-0">
							<div class="mb-2"><label class="f-label">Deskripsi</label><input type="text" bind:value={item.description} class="f-input" placeholder="Finishing..."></div>
							<div class="mb-2"><label class="f-label">Aktivitas</label><input type="text" bind:value={item.activity} class="f-input" placeholder="Detail kegiatan..."></div>
							<div><label class="f-label">Catatan</label><textarea bind:value={item.notes} rows="2" class="f-textarea" placeholder="..."></textarea></div>
						</div>
					{/each}
					<button class="btn-action" onclick={addTomorrowPlan}><IconPlus size={14} /> Tambah rencana</button>
				</div>
			{/if}

			{#if activeTab === 'progress'}
				<div class="card-section">
					<h4><IconChartLine size={16} class="text-[var(--g)]" /> Progress pekerjaan</h4>
					{#each reportData.progress as item, i}
						<div class="border-b border-gray-100 pb-3 mb-3 last:border-none last:pb-0 last:mb-0 relative">
							{#if reportData.progress.length > 1}
								<button class="absolute top-0 right-0 text-gray-300 hover:text-red-400 transition-colors" onclick={() => removeProgress(i)}><IconTrash size={14} /></button>
							{/if}
							<div class="mb-2"><label class="f-label">Kategori</label><input type="text" bind:value={item.category} class="f-input" placeholder="Jasa pengecatan..."></div>
							<div class="mb-2"><label class="f-label">Aktivitas</label><input type="text" bind:value={item.activity} class="f-input" placeholder="Detail aktivitas..."></div>
							<div class="grid grid-cols-2 gap-2 mb-2">
								<div><label class="f-label">Nilai</label><input type="number" bind:value={item.progress_value} class="f-input"></div>
								<div><label class="f-label">Satuan</label><select bind:value={item.unit} class="f-select"><option>m²</option><option>m³</option><option>unit</option><option>kg</option><option>ls</option></select></div>
							</div>
							<div><label class="f-label">Catatan</label><textarea bind:value={item.notes} rows="2" class="f-textarea" placeholder="Catatan..."></textarea></div>
						</div>
					{/each}
					<button class="btn-action" onclick={addProgress}><IconPlus size={14} /> Tambah progress</button>
				</div>

				<!-- Dokumentasi Progress -->
				<div class="card-section mt-4">
					<h4><IconCamera size={16} class="text-[var(--g)]" /> Foto Bukti Progress</h4>
					
					{#if reportData.progress_photos.length > 0}
						<div class="grid grid-cols-2 gap-2 mb-3">
							{#each reportData.progress_photos as photo, idx}
								<div class="relative aspect-square border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
									<img src={photo.url} alt="Progress" class="w-full h-full object-cover" />
									<button class="absolute top-1.5 right-1.5 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors" onclick={() => removeProgressPhoto(idx)}>
										<IconTrash size={14} />
									</button>
								</div>
							{/each}
						</div>
					{/if}

					<div class="mt-2 border border-dashed border-[var(--g)] bg-[var(--gl)]/30 rounded-xl p-4 text-center cursor-pointer hover:bg-[var(--gl)] transition-colors relative">
						<input type="file" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onchange={handleProgressPhoto} />
						<IconCamera size={24} class="text-[var(--g)] mx-auto" />
						<p class="text-[12px] text-[var(--gd)] mt-1.5 font-medium">Tap untuk memotret progress pekerjaan</p>
					</div>
				</div>
			{/if}

			{#if activeTab === 'material'}
				<!-- Material terpakai -->
				<div class="card-section">
					<h4><IconPackage size={16} class="text-[var(--g)]" /> Material terpakai</h4>
					{#each reportData.material_used as item, i}
						<div class="border-b border-gray-100 pb-3 mb-3 last:border-none last:pb-0 last:mb-0 relative">
							{#if reportData.material_used.length > 1}
								<button class="absolute top-0 right-0 text-gray-300 hover:text-red-400 transition-colors" onclick={() => removeMaterialUsed(i)}><IconTrash size={14} /></button>
							{/if}
							<div class="mb-2"><label class="f-label">Jenis</label><input type="text" bind:value={item.type} class="f-input" placeholder="Nama material..."></div>
							<div class="grid grid-cols-3 gap-2">
								<div><label class="f-label">Jumlah</label><input type="number" bind:value={item.amount} class="f-input"></div>
								<div><label class="f-label">Satuan</label><select bind:value={item.unit} class="f-select"><option>kg</option><option>liter</option><option>sak</option><option>m²</option></select></div>
								<div><label class="f-label">Catatan</label><input type="text" bind:value={item.notes} class="f-input" placeholder="..."></div>
							</div>
						</div>
					{/each}
					<button class="btn-action" onclick={addMaterialUsed}><IconPlus size={14} /> Tambah material</button>
				</div>

				<!-- Stok tersisa -->
				<div class="card-section">
					<h4><IconStack2 size={16} class="text-[var(--g)]" /> Stok tersisa</h4>
					{#each reportData.material_stock as item, i}
						<div class="border-b border-gray-100 pb-3 mb-3 last:border-none last:pb-0 last:mb-0">
							<div class="mb-2"><label class="f-label">Jenis</label><input type="text" bind:value={item.type} class="f-input" placeholder="Nama material..."></div>
							<div class="grid grid-cols-2 gap-2">
								<div><label class="f-label">Jumlah</label><input type="number" bind:value={item.amount} class="f-input"></div>
								<div><label class="f-label">Satuan</label><select bind:value={item.unit} class="f-select"><option>kg</option><option>liter</option><option>sak</option></select></div>
							</div>
						</div>
					{/each}
					<button class="btn-action" onclick={addMaterialStock}><IconPlus size={14} /> Tambah stok</button>
				</div>

				<!-- Kebutuhan material -->
				<div class="card-section">
					<h4><IconAlertTriangle size={16} class="text-[var(--am)]" /> Kebutuhan material</h4>
					{#each reportData.material_needs as item, i}
						<div class="border-b border-gray-100 pb-3 mb-3 last:border-none last:pb-0 last:mb-0">
							<div class="mb-2"><label class="f-label">Nama material</label><input type="text" bind:value={item.description} class="f-input" placeholder="Nama barang..."></div>
							<div class="grid grid-cols-3 gap-2 mb-2">
								<div><label class="f-label">Jumlah</label><input type="number" bind:value={item.amount} class="f-input"></div>
								<div><label class="f-label">Satuan</label><select bind:value={item.unit} class="f-select"><option>kg</option><option>liter</option><option>sak</option><option>pcs</option><option>m²</option><option>m³</option></select></div>
								<div><label class="f-label">Urgensi</label><select bind:value={item.urgency} class="f-select"><option value="normal">Normal</option><option value="urgent">Urgent</option></select></div>
							</div>
							<div><label class="f-label">Tanggal dibutuhkan</label><input type="date" bind:value={item.date_needed} class="f-input"></div>
						</div>
					{/each}
					<button class="btn-action" onclick={addMaterialNeeds}><IconPlus size={14} /> Tambah kebutuhan</button>
				</div>
			{/if}

			{#if activeTab === 'tenaga'}
				<!-- Manpower -->
				<div class="card-section">
					<h4><IconUsers size={16} class="text-[var(--g)]" /> Manpower</h4>
					{#each reportData.manpower as item, i}
						<div class="border-b border-gray-100 pb-3 mb-3 last:border-none last:pb-0 last:mb-0">
							<div class="grid grid-cols-2 gap-2 mb-2">
								<div><label class="f-label">Role</label><select bind:value={item.role} class="f-select"><option>BORONGAN</option><option>HARIAN</option><option>MANDOR</option><option>SUPERVISOR</option></select></div>
								<div><label class="f-label">Jumlah orang</label><input type="number" bind:value={item.count} class="f-input"></div>
							</div>
							<div><label class="f-label">Catatan</label><input type="text" bind:value={item.notes} class="f-input" placeholder="..."></div>
						</div>
					{/each}
					<button class="btn-action" onclick={addManpower}><IconPlus size={14} /> Tambah role</button>
				</div>

				<!-- Dokumentasi Absensi -->
				<div class="card-section mt-4">
					<h4><IconCamera size={16} class="text-[var(--g)]" /> Foto Bukti Absensi</h4>
					
					{#if reportData.attendance_photos.length > 0}
						<div class="grid grid-cols-2 gap-2 mb-3">
							{#each reportData.attendance_photos as photo, idx}
								<div class="relative aspect-square border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
									<img src={photo.url} alt="Absensi" class="w-full h-full object-cover" />
									<button class="absolute top-1.5 right-1.5 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors" onclick={() => removeAttendancePhoto(idx)}>
										<IconTrash size={14} />
									</button>
								</div>
							{/each}
						</div>
					{/if}

					<div class="mt-2 border border-dashed border-[var(--g)] bg-[var(--gl)]/30 rounded-xl p-4 text-center cursor-pointer hover:bg-[var(--gl)] transition-colors relative">
						<input type="file" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onchange={handleAttendancePhoto} />
						<IconCamera size={24} class="text-[var(--g)] mx-auto" />
						<p class="text-[12px] text-[var(--gd)] mt-1.5 font-medium">Tap untuk memotret atau pilih foto</p>
					</div>
				</div>
			{/if}

			{#if activeTab === 'lainnya'}
				<!-- Kendala -->
				<div class="card-section">
					<h4><IconAlertCircle size={16} class="text-[var(--re)]" /> Kendala / isu</h4>
					{#each reportData.issues as item, i}
						<div class="mb-3"><label class="f-label">Deskripsi</label><textarea bind:value={item.description} rows="3" class="f-textarea" placeholder="Tulis kendala..."></textarea></div>
					{/each}
					<button class="btn-action mb-4" onclick={addIssue}><IconPlus size={14} /> Tambah kendala</button>

					<div class="mt-2 border-t border-gray-100 pt-4">
						<h5 class="text-[12px] font-semibold text-gray-700 flex items-center gap-1.5 mb-2"><IconCamera size={14} class="text-gray-400" /> Foto Bukti Kendala</h5>
						
						{#if reportData.issue_photos.length > 0}
							<div class="grid grid-cols-2 gap-2 mb-3">
								{#each reportData.issue_photos as photo, idx}
									<div class="relative aspect-square border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
										<img src={photo.url} alt="Kendala" class="w-full h-full object-cover" />
										<button class="absolute top-1.5 right-1.5 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors" onclick={() => removeIssuePhoto(idx)}>
											<IconTrash size={14} />
										</button>
									</div>
								{/each}
							</div>
						{/if}

						<div class="border border-dashed border-[var(--re)] bg-[var(--rel)]/30 rounded-xl p-4 text-center cursor-pointer hover:bg-[var(--rel)] transition-colors relative">
							<input type="file" accept="image/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onchange={handleIssuePhoto} />
							<IconCamera size={24} class="text-[var(--re)] mx-auto" />
							<p class="text-[12px] text-[var(--red)] mt-1.5 font-medium">Tap untuk memotret bukti kendala</p>
						</div>
					</div>
				</div>

				<!-- Peralatan -->
				<div class="card-section">
					<h4><IconTool size={16} class="text-[var(--g)]" /> Peralatan</h4>
					{#each reportData.tools as item, i}
						<div class="border-b border-gray-100 pb-3 mb-3 last:border-none last:pb-0 last:mb-0">
							<div class="grid grid-cols-2 gap-2">
								<div><label class="f-label">Nama alat</label><input type="text" bind:value={item.name} class="f-input" placeholder="Nama alat..."></div>
								<div><label class="f-label">Jumlah</label><input type="number" bind:value={item.amount} class="f-input"></div>
							</div>
						</div>
					{/each}
					<button class="btn-action" onclick={addTool}><IconPlus size={14} /> Tambah alat</button>
				</div>

				<!-- Catatan Budget -->
				<div class="card-section">
					<h4><IconReceipt size={16} class="text-[var(--g)]" /> Catatan budget</h4>
					<div><label class="f-label">Catatan</label><textarea bind:value={reportData.budget_notes} rows="2" class="f-textarea" placeholder="Catatan pengeluaran..."></textarea></div>
					<div class="mt-2 border border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors">
						<IconCamera size={24} class="text-gray-300 mx-auto" />
						<p class="text-[12px] text-gray-400 mt-1.5">Upload foto nota / kwitansi</p>
					</div>
				</div>

				<!-- Dokumentasi -->
				<div class="card-section">
					<h4><IconCamera size={16} class="text-[var(--g)]" /> Dokumentasi lapangan</h4>
					<div class="grid grid-cols-2 gap-2">
						<div class="aspect-square border border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
							<IconPlus size={20} class="text-gray-300" />
							<span class="text-[11px] text-gray-400 mt-1">Tambah foto</span>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Bottom Bar -->
		<div class="bottom-bar shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
			<div class="flex items-center mb-2.5 gap-1.5">
				<span class="text-[12px] text-gray-400 flex-1">Laporan belum dikirim</span>
				<span class="badge warn">Draft</span>
			</div>
			<div class="flex gap-2">
				<button
					class="py-2.5 px-4 border border-gray-200 rounded-xl text-gray-500 text-[13px] font-medium flex items-center gap-1.5 cursor-pointer active:bg-gray-50 transition-all"
					onclick={saveDraft}
				>
					<IconDeviceFloppy size={16} /> Draft
				</button>
				<button
					class="flex-1 py-2.5 bg-[var(--g)] text-white border-none rounded-xl text-[13px] font-medium flex items-center justify-center gap-1.5 cursor-pointer active:bg-[var(--gd)] transition-all disabled:opacity-60"
					onclick={sendReport}
					disabled={submitting}
				>
					{#if submitting}
						<IconLoader2 size={16} class="animate-spin" /> Mengirim...
					{:else}
						<IconSend size={16} /> Kirim laporan
					{/if}
				</button>
			</div>
		</div>
	{/if}
</div>

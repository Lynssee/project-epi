<script lang="ts">
	import { onMount } from 'svelte';
	import { authStore, getUserDisplay, getUserInitials, isLeaderRole, isSuperAdminRole } from '$lib/stores/auth';
	import { getProjects } from '$lib/services/projects';
	import { getPengajuanAnggaran } from '$lib/services/finance';
import { getReports, getBatchedReports } from '$lib/services/reports';
	import {
		IconBuildingFactory2, IconLogout, IconBell, IconApps,
		IconClipboardList, IconReceipt2, IconStack, IconBuilding,
		IconChevronRight, IconClock, IconLoader2, IconShieldLock, IconPackage
	} from '@tabler/icons-svelte';
	import { goto } from '$app/navigation';
	import { signOut } from 'firebase/auth';
	import { auth } from '$lib/firebase';

	let projects = $state<any[]>([]);
	let budgets = $state<any[]>([]);
	let todayReports = $state<Record<number, boolean>>({});
	let loading = $state(true);
	let currentDate = '';
	let isSuperAdmin = $state(false);
	let userRoleLabel = $state('');

	let currentUser: any = null;
	let currentRoleId: string | null = null;
	let currentKaryawanName: string | null = null;

	const unsubAuth = authStore.subscribe((s) => {
		currentUser = s.user;
		currentRoleId = s.roleId;
		currentKaryawanName = s.karyawanName;
	});

	onMount(async () => {
		currentDate = new Intl.DateTimeFormat('id-ID', {
			weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
		}).format(new Date());

		await loadData();
		loading = false;

		return () => unsubAuth();
	});

	async function loadData() {
		// Determine role from authStore (already fetched in root layout)
		isSuperAdmin = isSuperAdminRole(currentRoleId);
		userRoleLabel = currentRoleId ? (currentRoleId === 'super_admin' ? 'Super Admin' : currentRoleId === 'leader' ? 'Leader' : currentRoleId) : '';

		try {
			// Fetch projects and budgets concurrently
			const [projResult, budgResult] = await Promise.all([
				(isLeaderRole(currentRoleId) && currentKaryawanName) ? getProjects(currentKaryawanName) : getProjects(),
				getPengajuanAnggaran(3)
			]);

			projects = projResult || [];
			budgets = budgResult || [];

			// Fetch all recent reports for all projects in a single batched API call
			const today = new Date().toISOString().split('T')[0];
			if (projects.length > 0) {
				const projectIds = projects.map(p => p.id);
				const batchedReports = await getBatchedReports(projectIds);
				
				// Map locally to avoid N+1 requests
				projects.forEach(p => {
					const projectReports = batchedReports.filter((r: any) => r.project_id === p.id);
					const hasToday = projectReports.some((r: any) => {
						const rDate = r.date ? r.date.split('T')[0] : '';
						return rDate === today;
					});
					todayReports[p.id] = hasToday;
				});
			}
		} catch (error) {
			console.error('Gagal memuat data:', error);
		}
	}

	async function handleLogout() {
		await signOut(auth);
		goto('/login');
	}

	function getStatusLabel(projectId: number) {
		return todayReports[projectId] ? 'Sudah lapor' : 'Belum lapor';
	}

	function getStatusClass(projectId: number) {
		return todayReports[projectId] ? 'ok' : 'warn';
	}

	function getBudgetStatusLabel(status: string) {
		if (!status) return 'Menunggu';
		if (status.includes('Verified') || status.includes('Selesai')) return 'Disetujui';
		if (status.includes('Ditolak') || status.includes('Rejected')) return 'Ditolak';
		return 'Menunggu';
	}

	function getBudgetStatusClass(status: string) {
		const label = getBudgetStatusLabel(status);
		if (label === 'Disetujui') return 'ok';
		if (label === 'Ditolak') return 'rej';
		return 'pend';
	}
</script>

<div class="flex-1 flex flex-col h-full overflow-hidden">
	<div class="tb green">
		<IconBuildingFactory2 size={22} />
		<h1>Beranda</h1>
		<button class="tbb" onclick={handleLogout} title="Keluar"><IconLogout size={20} /></button>
	</div>

	{#if loading}
		<div class="flex-1 flex items-center justify-center">
			<div class="flex flex-col items-center gap-3">
				<IconLoader2 size={32} class="animate-spin text-[var(--g)]" />
				<p class="text-sm text-gray-400">Memuat data...</p>
			</div>
		</div>
	{:else}
		<div class="scroll-body px-4 py-3">
			<!-- User greeting -->
			<div class="flex items-center gap-3 py-2">
				<div class="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--g)] to-[var(--gd)] flex items-center justify-center text-[12px] font-semibold text-white shadow-sm">
					{getUserInitials(currentUser)}
				</div>
				<div class="flex-1">
					<p class="text-[14px] font-semibold text-gray-800">Halo, {getUserDisplay(currentUser)}</p>
					<p class="text-[11px] text-gray-400 mt-0.5">{currentDate}</p>
				</div>
				<button class="relative p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
					<IconBell size={20} class="text-gray-400" />
					<div class="absolute top-1 right-1 w-2 h-2 bg-[var(--re)] rounded-full border-[1.5px] border-white"></div>
				</button>
			</div>

			<!-- Menu Utama -->
			<div class="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mt-5 mb-2 flex items-center gap-1.5">
				<IconApps size={14} /> Menu Utama
			</div>
			<div class="grid grid-cols-2 gap-2.5 mb-2">
				<button
					class="border border-gray-100 rounded-xl p-4 cursor-pointer flex flex-col gap-2.5 text-left bg-white hover:border-[var(--g)]/30 hover:shadow-sm transition-all active:scale-[0.97]"
					onclick={() => goto('/laporan')}
				>
					<div class="w-11 h-11 rounded-xl flex items-center justify-center bg-[var(--gl)]">
						<IconClipboardList size={22} class="text-[var(--g)]" />
					</div>
					<div>
						<h3 class="text-[13px] font-semibold text-gray-800">Laporan Harian</h3>
						<p class="text-[11px] text-gray-400 mt-0.5">Input progres & kehadiran</p>
					</div>
				</button>
				<button
					class="border border-gray-100 rounded-xl p-4 cursor-pointer flex flex-col gap-2.5 text-left bg-white hover:border-[var(--p)]/30 hover:shadow-sm transition-all active:scale-[0.97]"
					onclick={() => goto('/anggaran')}
				>
					<div class="w-11 h-11 rounded-xl flex items-center justify-center bg-[var(--pl)]">
						<IconReceipt2 size={22} class="text-[var(--p)]" />
					</div>
					<div>
						<h3 class="text-[13px] font-semibold text-gray-800">Pengajuan Anggaran</h3>
						<p class="text-[11px] text-gray-400 mt-0.5">Ajukan kebutuhan dana</p>
					</div>
				</button>
				<button
					class="border border-gray-100 rounded-xl p-4 cursor-pointer flex flex-col gap-2.5 text-left bg-white hover:border-[var(--g)]/30 hover:shadow-sm transition-all active:scale-[0.97] col-span-2"
					onclick={() => goto('/packing-list')}
				>
					<div class="flex items-center gap-3">
						<div class="w-11 h-11 rounded-xl flex items-center justify-center bg-[var(--gl)]">
							<IconPackage size={22} class="text-[var(--g)]" />
						</div>
						<div>
							<h3 class="text-[13px] font-semibold text-gray-800">Packing List</h3>
							<p class="text-[11px] text-gray-400 mt-0.5">Pengajuan & inventory proyek</p>
						</div>
						<IconChevronRight size={16} class="text-gray-300 ml-auto" />
					</div>
				</button>
				{#if isSuperAdmin}
					<button
						class="border border-gray-100 rounded-xl p-4 cursor-pointer flex flex-col gap-2.5 text-left bg-white hover:border-[var(--re)]/30 hover:shadow-sm transition-all active:scale-[0.97] col-span-2"
						onclick={() => goto('/admin')}
					>
						<div class="flex items-center gap-3">
							<div class="w-11 h-11 rounded-xl flex items-center justify-center bg-[var(--rel)]">
								<IconShieldLock size={22} class="text-[var(--re)]" />
							</div>
							<div>
								<h3 class="text-[13px] font-semibold text-gray-800">Admin Panel</h3>
								<p class="text-[11px] text-gray-400 mt-0.5">Kelola user & role</p>
							</div>
							<IconChevronRight size={16} class="text-gray-300 ml-auto" />
						</div>
					</button>
				{/if}
			</div>

			<!-- Proyek Saya -->
			<div class="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mt-5 mb-2 flex items-center gap-1.5">
				<IconStack size={14} /> Proyek Saya
			</div>
			{#if projects.length === 0}
				<div class="text-center py-6 text-gray-400 text-[13px]">Belum ada proyek.</div>
			{:else}
				{#each projects as project}
					<button
						class="w-full border border-gray-100 rounded-xl p-3 mb-2 cursor-pointer flex items-center gap-3 bg-white hover:border-[var(--g)]/30 hover:shadow-sm text-left transition-all active:scale-[0.98]"
						onclick={() => goto(`/laporan/${project.id}`)}
					>
						<div class="w-10 h-10 rounded-xl bg-[var(--gl)] flex items-center justify-center shrink-0">
							<IconBuilding size={20} class="text-[var(--g)]" />
						</div>
						<div class="flex-1 min-w-0">
							<h3 class="text-[13px] font-medium text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">{project.name}</h3>
							<p class="text-[11px] text-gray-400 mt-0.5">{project.lokasi || '-'} · ID-{project.id}</p>
						</div>
						<span class="badge {getStatusClass(project.id)}">{getStatusLabel(project.id)}</span>
						<IconChevronRight size={16} class="text-gray-300 shrink-0" />
					</button>
				{/each}
			{/if}

			<!-- Pengajuan Terakhir -->
			{#if budgets.length > 0}
				<div class="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mt-5 mb-2 flex items-center gap-1.5">
					<IconClock size={14} /> Pengajuan Terakhir
				</div>
				<div class="border border-gray-100 rounded-xl overflow-hidden mb-4">
					{#each budgets as budget}
						<button
							class="w-full flex items-center gap-3 p-3 px-3.5 border-b border-gray-100 last:border-none cursor-pointer bg-white hover:bg-gray-50 text-left transition-colors"
							onclick={() => goto(`/anggaran/${budget.id}`)}
						>
							<IconReceipt2 size={18} class={getBudgetStatusClass(budget.status) === 'ok' ? 'text-[var(--g)]' : 'text-[var(--p)]'} />
							<div class="flex-1 min-w-0">
								<p class="text-[13px] font-medium text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">{budget.tujuan_pengajuan || 'Pengajuan Anggaran'}</p>
								<p class="text-[11px] text-gray-400 mt-0.5">{new Intl.DateTimeFormat('id-ID', { month: 'short', day: 'numeric' }).format(new Date(budget.date_created))}</p>
							</div>
							<span class="badge {getBudgetStatusClass(budget.status)}">{getBudgetStatusLabel(budget.status)}</span>
						</button>
					{/each}
				</div>
			{/if}

			<div class="h-4"></div>
		</div>
	{/if}
</div>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getProjects } from '$lib/services/projects';
	import { getReports } from '$lib/services/reports';
	import { authStore, isLeaderRole } from '$lib/stores/auth';
	import {
		IconArrowLeft, IconBuilding, IconChevronRight,
		IconLoader2, IconClipboardList
	} from '@tabler/icons-svelte';

	let projects = $state<any[]>([]);
	let todayReports = $state<Record<number, boolean>>({});
	let loading = $state(true);

	let currentRoleId: string | null = null;
	let currentKaryawanName: string | null = null;

	const unsubAuth = authStore.subscribe((s) => {
		currentRoleId = s.roleId;
		currentKaryawanName = s.karyawanName;
	});

	onMount(async () => {
		try {
			// Filter projects for leader role
			let result: any[];
			if (isLeaderRole(currentRoleId) && currentKaryawanName) {
				result = await getProjects(currentKaryawanName);
			} else {
				result = await getProjects();
			}
			projects = result || [];

			// Check today's reports per project (fetch terpisah)
			const today = new Date().toISOString().split('T')[0];
			for (const p of projects) {
				try {
					const reports = await getReports(p.id);
					const hasToday = (reports || []).some((r: any) => {
						const rDate = r.date ? r.date.split('T')[0] : '';
						return rDate === today;
					});
					todayReports[p.id] = hasToday;
				} catch {
					todayReports[p.id] = false;
				}
			}
		} catch (e) {
			console.error('Gagal memuat proyek:', e);
		} finally {
			loading = false;
		}

		return () => unsubAuth();
	});
</script>

<div class="flex-1 flex flex-col h-full overflow-hidden">
	<div class="tb green">
		<button class="tbb" onclick={() => goto('/')}><IconArrowLeft size={22} /></button>
		<h1>Pilih Proyek</h1>
		<div class="w-7"></div>
	</div>

	{#if loading}
		<div class="flex-1 flex items-center justify-center">
			<IconLoader2 size={32} class="animate-spin text-[var(--g)]" />
		</div>
	{:else}
		<div class="scroll-body px-4 py-3">
			<div class="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-3 flex items-center gap-1.5">
				<IconClipboardList size={14} /> Pilih proyek untuk membuat laporan harian
			</div>

			{#if projects.length === 0}
				<div class="text-center py-8 text-gray-400 text-[13px]">Belum ada proyek yang tersedia.</div>
			{:else}
				{#each projects as project}
					<button
						class="w-full border border-gray-100 rounded-xl p-3.5 mb-2.5 cursor-pointer flex items-center gap-3 bg-white hover:border-[var(--g)]/30 hover:shadow-sm text-left transition-all active:scale-[0.98]"
						onclick={() => goto(`/laporan/${project.id}`)}
					>
						<div class="w-11 h-11 rounded-xl bg-[var(--gl)] flex items-center justify-center shrink-0">
							<IconBuilding size={22} class="text-[var(--g)]" />
						</div>
						<div class="flex-1 min-w-0">
							<h3 class="text-[13px] font-medium text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">{project.name}</h3>
							<p class="text-[11px] text-gray-400 mt-0.5">{project.lokasi || '-'} · ID-{project.id}</p>
							{#if project.jenis_project}
								<p class="text-[10px] text-gray-400 mt-0.5">{project.jenis_project}</p>
							{/if}
						</div>
						<div class="flex flex-col items-end gap-1.5">
							<span class="badge {todayReports[project.id] ? 'ok' : 'warn'}">{todayReports[project.id] ? 'Sudah lapor' : 'Belum lapor'}</span>
							<IconChevronRight size={14} class="text-gray-300" />
						</div>
					</button>
				{/each}
			{/if}
		</div>
	{/if}
</div>

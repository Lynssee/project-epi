<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import {
		IconArrowLeft, IconUserPlus, IconLoader2, IconUsers,
		IconSearch, IconEdit, IconTrash, IconShieldCheck,
		IconUser, IconBriefcase, IconCoin, IconChevronRight
	} from '@tabler/icons-svelte';
	import { getAppUsers, updateAppUser, deleteAppUser, getDisplayName, ROLE_LABELS, ROLE_OPTIONS, type AppUser } from '$lib/services/users';

	let users = $state<AppUser[]>([]);
	let filtered = $state<AppUser[]>([]);
	let loading = $state(true);
	let searchQuery = $state('');
	let activeFilter = $state('semua');
	let editingUser = $state<AppUser | null>(null);
	let showDeleteConfirm = $state<string | null>(null);

	const filters = [
		{ id: 'semua', label: 'Semua' },
		{ id: 'super_admin', label: 'Super Admin' },
		{ id: 'leader', label: 'Leader' },
		{ id: 'admin_project', label: 'Admin' },
		{ id: 'finance', label: 'Finance' },
		{ id: 'hrd', label: 'HRD' }
	];

	onMount(async () => {
		try {
			users = await getAppUsers();
			applyFilters();
		} catch (e) {
			console.error('Gagal memuat users:', e);
		} finally {
			loading = false;
		}
	});

	function applyFilters() {
		let result = users;
		if (activeFilter !== 'semua') {
			result = result.filter(u => u.role === activeFilter || u.roleId === activeFilter);
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			result = result.filter(u =>
				getDisplayName(u).toLowerCase().includes(q) ||
				u.email?.toLowerCase().includes(q) ||
				u.department?.toLowerCase().includes(q)
			);
		}
		filtered = result;
	}

	function setFilter(f: string) {
		activeFilter = f;
		applyFilters();
	}

	function onSearch() {
		applyFilters();
	}

	function getRoleBg(role: string) {
		switch (role) {
			case 'super_admin': return 'bg-[var(--rel)]';
			case 'leader': return 'bg-[var(--gl)]';
			case 'admin_project': return 'bg-[var(--aml)]';
			case 'finance': case 'hrd': return 'bg-[var(--pl)]';
			default: return 'bg-gray-100';
		}
	}

	function getRoleTextColor(role: string) {
		switch (role) {
			case 'super_admin': return 'text-[var(--re)]';
			case 'leader': return 'text-[var(--g)]';
			case 'admin_project': return 'text-[var(--am)]';
			case 'finance': case 'hrd': return 'text-[var(--p)]';
			default: return 'text-gray-500';
		}
	}

	function getRoleBadgeClass(role: string) {
		switch (role) {
			case 'super_admin': return 'rej';
			case 'leader': return 'ok';
			case 'admin_project': return 'warn';
			case 'finance': case 'hrd': return 'pend';
			default: return '';
		}
	}

	function getRoleIcon(role: string) {
		switch (role) {
			case 'super_admin': return IconShieldCheck;
			case 'leader': return IconUser;
			case 'admin_project': return IconBriefcase;
			case 'finance': case 'hrd': return IconCoin;
			default: return IconUser;
		}
	}

	// Edit role inline
	let editRoleValue = $state('');

	function startEditRole(user: AppUser) {
		editingUser = user;
		editRoleValue = user.roleId || user.role;
	}

	async function saveRole() {
		if (!editingUser?.id) return;
		try {
			const success = await updateAppUser(editingUser.id, {
				role: ROLE_LABELS[editRoleValue] || editRoleValue,
				roleId: editRoleValue
			});
			if (success) {
				const idx = users.findIndex(u => u.id === editingUser!.id);
				if (idx >= 0) {
					users[idx].role = ROLE_LABELS[editRoleValue] || editRoleValue;
					users[idx].roleId = editRoleValue;
				}
				applyFilters();
			}
			editingUser = null;
		} catch (e) {
			alert('Gagal mengubah role.');
		}
	}

	function cancelEdit() {
		editingUser = null;
	}

	async function confirmDelete(id: string) {
		try {
			const success = await deleteAppUser(id);
			if (success) {
				users = users.filter(u => u.id !== id);
				applyFilters();
			}
		} catch (e) {
			alert('Gagal menghapus user.');
		}
		showDeleteConfirm = null;
	}
</script>

<div class="flex-1 flex flex-col h-full overflow-hidden">
	<div class="tb" style="background: var(--re);">
		<button class="tbb" onclick={() => goto('/admin')}><IconArrowLeft size={22} /></button>
		<h1>Kelola Pengguna</h1>
		<button class="tbb" onclick={() => goto('/admin/users/baru')}><IconUserPlus size={22} /></button>
	</div>

	{#if loading}
		<div class="flex-1 flex items-center justify-center">
			<IconLoader2 size={32} class="animate-spin text-[var(--re)]" />
		</div>
	{:else}
		<div class="scroll-body px-4 py-3">
			<!-- Search -->
			<div class="relative mb-3">
				<IconSearch size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
				<input
					type="text"
					bind:value={searchQuery}
					oninput={onSearch}
					placeholder="Cari nama, email, department..."
					class="f-input !pl-9 !py-2 !text-[13px] !bg-gray-50"
				>
			</div>

			<!-- Filters -->
			<div class="flex gap-1.5 mb-4 overflow-x-auto pb-0.5">
				{#each filters as f}
					<button
						class="px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap cursor-pointer transition-all {activeFilter === f.id ? 'border border-[var(--re)] bg-[var(--rel)] text-[var(--red)]' : 'border border-gray-200 bg-white text-gray-500'}"
						onclick={() => setFilter(f.id)}
					>{f.label}</button>
				{/each}
			</div>

			<!-- Count -->
			<div class="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-2 flex items-center gap-1.5">
				<IconUsers size={14} /> {filtered.length} pengguna
			</div>

			<!-- User List -->
			{#if filtered.length === 0}
				<div class="text-center py-8 text-gray-400 text-[13px]">Tidak ada pengguna ditemukan.</div>
			{:else}
				{#each filtered as user}
					<div class="border border-gray-100 rounded-xl p-3 mb-2 bg-white">
						<div class="flex items-center gap-3">
							<div class="w-10 h-10 rounded-full {getRoleBg(user.roleId || user.role)} flex items-center justify-center shrink-0">
								<svelte:component this={getRoleIcon(user.roleId || user.role)} size={18} class={getRoleTextColor(user.roleId || user.role)} />
							</div>
							<div class="flex-1 min-w-0">
								<p class="text-[13px] font-medium text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">{getDisplayName(user)}</p>
								<p class="text-[11px] text-gray-400 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{user.email}</p>
								{#if user.department}
									<p class="text-[10px] text-gray-300 mt-0.5">{user.department}</p>
								{/if}
							</div>
							<span class="badge {getRoleBadgeClass(user.roleId || user.role)}">{ROLE_LABELS[user.roleId || user.role] || user.role}</span>
						</div>

						<!-- Action buttons -->
						<div class="flex gap-2 mt-2.5 pt-2.5 border-t border-gray-100">
							<button
								class="flex-1 py-1.5 text-[11px] font-medium text-gray-500 border border-gray-200 rounded-lg flex items-center justify-center gap-1 hover:bg-gray-50 transition-colors"
								onclick={() => startEditRole(user)}
							>
								<IconEdit size={12} /> Ubah role
							</button>
							{#if (user.roleId || user.role) !== 'super_admin'}
								<button
									class="py-1.5 px-3 text-[11px] font-medium text-red-400 border border-red-200 rounded-lg flex items-center justify-center gap-1 hover:bg-red-50 transition-colors"
									onclick={() => showDeleteConfirm = user.id || null}
								>
									<IconTrash size={12} />
								</button>
							{/if}
						</div>
					</div>
				{/each}
			{/if}

			<div class="h-4"></div>
			<button class="btn-primary" style="background: var(--re);" onclick={() => goto('/admin/users/baru')}>
				<IconUserPlus size={18} /> Tambah pengguna baru
			</button>
			<div class="h-4"></div>
		</div>
	{/if}
</div>

<!-- Edit Role Modal -->
{#if editingUser}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="fixed inset-0 bg-black/40 z-50 flex items-end justify-center" role="presentation" onclick={cancelEdit}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="bg-white rounded-t-2xl w-full max-w-[420px] p-5 pb-6"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
		>
			<div class="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4"></div>
			<h3 class="text-[15px] font-semibold text-gray-800 mb-1">Ubah Role</h3>
			<p class="text-[12px] text-gray-400 mb-4">{getDisplayName(editingUser)} ({editingUser.email})</p>

			<div class="flex flex-col gap-2 mb-5 max-h-[300px] overflow-y-auto">
				{#each ROLE_OPTIONS as opt}
					<button
						class="p-3 rounded-xl border text-left flex items-center gap-3 transition-all {editRoleValue === opt.id ? 'border-[var(--re)] bg-[var(--rel)]' : 'border-gray-200 hover:border-gray-300'}"
						onclick={() => editRoleValue = opt.id}
					>
						<div class="w-8 h-8 rounded-lg {getRoleBg(opt.id)} flex items-center justify-center shrink-0">
							<svelte:component this={getRoleIcon(opt.id)} size={16} class={getRoleTextColor(opt.id)} />
						</div>
						<div class="flex-1">
							<p class="text-[13px] font-medium text-gray-800">{opt.label}</p>
							<p class="text-[10px] text-gray-400">{opt.desc}</p>
						</div>
						{#if editRoleValue === opt.id}
							<div class="w-5 h-5 rounded-full bg-[var(--re)] flex items-center justify-center shrink-0">
								<span class="text-white text-[11px]">✓</span>
							</div>
						{:else}
							<div class="w-5 h-5 rounded-full border-2 border-gray-200 shrink-0"></div>
						{/if}
					</button>
				{/each}
			</div>

			<div class="flex gap-2">
				<button class="flex-1 py-2.5 border border-gray-200 rounded-xl text-[13px] font-medium text-gray-500" onclick={cancelEdit}>Batal</button>
				<button class="flex-1 py-2.5 rounded-xl text-[13px] font-medium text-white" style="background: var(--re);" onclick={saveRole}>Simpan</button>
			</div>
		</div>
	</div>
{/if}

<!-- Delete Confirm Modal -->
{#if showDeleteConfirm !== null}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-8" role="presentation" onclick={() => showDeleteConfirm = null}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div
			class="bg-white rounded-2xl p-5 w-full max-w-[320px]"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
		>
			<div class="w-12 h-12 rounded-full bg-[var(--rel)] flex items-center justify-center mx-auto mb-3">
				<IconTrash size={22} class="text-[var(--re)]" />
			</div>
			<h3 class="text-[15px] font-semibold text-gray-800 text-center mb-1">Hapus Pengguna?</h3>
			<p class="text-[12px] text-gray-400 text-center mb-5">Data user akan dihapus dari Firestore. Akun Firebase Auth tetap ada.</p>
			<div class="flex gap-2">
				<button class="flex-1 py-2.5 border border-gray-200 rounded-xl text-[13px] font-medium text-gray-500" onclick={() => showDeleteConfirm = null}>Batal</button>
				<button class="flex-1 py-2.5 bg-[var(--re)] rounded-xl text-[13px] font-medium text-white" onclick={() => confirmDelete(showDeleteConfirm!)}>Hapus</button>
			</div>
		</div>
	</div>
{/if}

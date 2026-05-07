<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		IconArrowLeft, IconShieldLock, IconUsers, IconUserPlus,
		IconSettings, IconChevronRight
	} from '@tabler/icons-svelte';
</script>

<div class="flex-1 flex flex-col h-full overflow-hidden">
	<div class="tb" style="background: var(--re);">
		<button class="tbb" onclick={() => goto('/')}><IconArrowLeft size={22} /></button>
		<h1>Admin Panel</h1>
		<div class="w-7"></div>
	</div>

	<div class="scroll-body px-4 py-4">
		<div class="flex items-center gap-2.5 mb-5">
			<div class="w-10 h-10 rounded-xl bg-[var(--rel)] flex items-center justify-center">
				<IconShieldLock size={22} class="text-[var(--re)]" />
			</div>
			<div>
				<p class="text-[14px] font-semibold text-gray-800">Panel Administrasi</p>
				<p class="text-[11px] text-gray-400">Kelola pengguna dan pengaturan sistem</p>
			</div>
		</div>

		<!-- Menu Cards -->
		<div class="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-2.5 flex items-center gap-1.5">
			<IconSettings size={14} /> Kelola Sistem
		</div>

		<button
			class="w-full border border-gray-100 rounded-xl p-4 mb-2.5 cursor-pointer flex items-center gap-3 bg-white hover:shadow-sm text-left transition-all active:scale-[0.98]"
			onclick={() => goto('/admin/users')}
		>
			<div class="w-12 h-12 rounded-xl bg-[var(--rel)] flex items-center justify-center shrink-0">
				<IconUsers size={24} class="text-[var(--re)]" />
			</div>
			<div class="flex-1">
				<h3 class="text-[14px] font-semibold text-gray-800">Kelola Pengguna</h3>
				<p class="text-[12px] text-gray-400 mt-0.5">Tambah, edit, dan atur role user</p>
			</div>
			<IconChevronRight size={18} class="text-gray-300" />
		</button>

		<button
			class="w-full border border-gray-100 rounded-xl p-4 mb-2.5 cursor-pointer flex items-center gap-3 bg-white hover:shadow-sm text-left transition-all active:scale-[0.98]"
			onclick={() => goto('/admin/users/baru')}
		>
			<div class="w-12 h-12 rounded-xl bg-[var(--gl)] flex items-center justify-center shrink-0">
				<IconUserPlus size={24} class="text-[var(--g)]" />
			</div>
			<div class="flex-1">
				<h3 class="text-[14px] font-semibold text-gray-800">Tambah User Baru</h3>
				<p class="text-[12px] text-gray-400 mt-0.5">Buat akun dan atur hak akses</p>
			</div>
			<IconChevronRight size={18} class="text-gray-300" />
		</button>
	</div>
</div>

<script lang="ts">
	import { signInWithEmailAndPassword } from 'firebase/auth';
	import { auth } from '$lib/firebase';
	import { goto } from '$app/navigation';
	import { IconBuildingFactory2, IconLogin, IconLoader2 } from '@tabler/icons-svelte';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let errorMsg = $state('');

	async function handleLogin() {
		if (!email || !password) {
			errorMsg = 'Email dan password harus diisi.';
			return;
		}
		try {
			loading = true;
			errorMsg = '';
			await signInWithEmailAndPassword(auth, email, password);
			goto('/');
		} catch (e: any) {
			if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
				errorMsg = 'Email atau password salah.';
			} else if (e.code === 'auth/too-many-requests') {
				errorMsg = 'Terlalu banyak percobaan. Coba lagi nanti.';
			} else {
				errorMsg = 'Gagal masuk. Periksa koneksi internet Anda.';
			}
		} finally {
			loading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') handleLogin();
	}
</script>

<div class="flex-1 flex flex-col">
	<!-- Hero -->
	<div class="bg-gradient-to-br from-[var(--g)] to-[var(--g2)] pt-12 pb-10 px-6 flex flex-col items-center gap-2 text-white">
		<div class="w-16 h-16 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-2 shadow-lg">
			<IconBuildingFactory2 size={36} />
		</div>
		<h2 class="text-xl font-semibold tracking-tight">Daily Report</h2>
		<p class="text-[13px] text-white/70">Sistem Laporan Harian Proyek</p>
	</div>
	
	<!-- Form -->
	<div class="px-5 pt-6 pb-8 flex-1">
		{#if errorMsg}
			<div class="mb-4 text-[12px] bg-[var(--rel)] text-[var(--red)] p-3 rounded-xl border border-red-200 flex items-center gap-2">
				<span class="text-base">⚠</span>
				{errorMsg}
			</div>
		{/if}

		<div class="mb-4">
			<label class="f-label">Email</label>
			<input
				type="email"
				bind:value={email}
				class="f-input"
				placeholder="leader@eltamaprimaindo.com"
				onkeydown={handleKeydown}
			>
		</div>
		<div class="mb-5">
			<label class="f-label">Password</label>
			<input
				type="password"
				bind:value={password}
				class="f-input"
				placeholder="••••••••"
				onkeydown={handleKeydown}
			>
		</div>

		<button class="btn-primary" onclick={handleLogin} disabled={loading}>
			{#if loading}
				<IconLoader2 size={20} class="animate-spin" />
				Memproses...
			{:else}
				<IconLogin size={20} />
				Masuk
			{/if}
		</button>
		<p class="text-[12px] text-gray-400 text-center mt-4">Akses hanya untuk leader proyek</p>
	</div>
</div>

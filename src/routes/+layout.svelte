<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { auth } from '$lib/firebase';
	import { onAuthStateChanged } from 'firebase/auth';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth';
	import { getAppUserById } from '$lib/services/users';
	import { getKaryawanByEmail } from '$lib/services/karyawan';
	import Toast from '$lib/components/Toast.svelte';

	let { children } = $props();
	let authChecked = $state(false);

	onMount(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			let role: string | null = null;
			let roleId: string | null = null;
			let karyawanName: string | null = null;

			if (user) {
				// Fetch role from Firestore and karyawan name from Directus concurrently
				const [firestoreUserResult, karyawanResult] = await Promise.allSettled([
					getAppUserById(user.uid),
					user.email ? getKaryawanByEmail(user.email) : Promise.resolve(null)
				]);

				if (firestoreUserResult.status === 'fulfilled' && firestoreUserResult.value) {
					role = firestoreUserResult.value.role;
					roleId = firestoreUserResult.value.roleId || firestoreUserResult.value.role;
				}

				if (karyawanResult.status === 'fulfilled' && karyawanResult.value) {
					karyawanName = karyawanResult.value.nama_karyawan;
				}
			}

			authStore.set({
				user,
				loading: false,
				checked: true,
				role,
				roleId,
				karyawanName
			});
			authChecked = true;

			const path = window.location.pathname;
			if (!user && path !== '/login') {
				goto('/login');
			} else if (user && path === '/login') {
				goto('/');
			}
		});

		return () => unsubscribe();
	});
</script>

<svelte:head>
	<title>Daily Report - Proyek</title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>

<Toast />

<div class="app-container">
	{#if !authChecked}
		<div class="flex-1 flex items-center justify-center min-h-screen">
			<div class="flex flex-col items-center gap-3">
				<div class="w-10 h-10 border-3 border-[var(--g)] border-t-transparent rounded-full animate-spin"></div>
				<p class="text-sm text-gray-400">Memuat...</p>
			</div>
		</div>
	{:else}
		{@render children()}
	{/if}
</div>
